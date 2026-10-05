"""
=============================================================================
WORD AUTOMATED ENGINE SERVER (خادم الأتمتة المكتبي للتحويل الصامت عبر Word)
=============================================================================
ملاحظة معمارية للمطورين والمهندسين:
تم اعتماد هذه الطريقة هندسياً لحل مشكلة تشوه الحروف العربية وتداخل الكلمات 
الإنجليزية (BiDi Overlapping) الناتجة عن محركات تصوير الشاشة (html2canvas).

آلية العمل:
1. يستقبل الخادم ملف Word (.docx) تم بناؤه هيكلياً وفق مواصفات OpenXML من الواجهة.
2. يتم تشغيل Microsoft Word (WINWORD.EXE) بصمت في الخلفية عبر واجهة COM (Word.Application).
3. يقوم Word بتصدير المستند فوراً إلى ملف PDF نقي 100% (Vector PDF).
4. يُعاد ملف الـ PDF الناتج إلى المتصفح للتحميل الفوري بدون أي أخطاء في الحروف أو الاتجاه.
=============================================================================
"""

import os
import sys
import tempfile
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8088
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'devAi', 'platform-1-documentation', 'frontend'))
CONVERT_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), 'convert-docx-to-pdf.ps1'))

class WordAutomatedEngineHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_POST(self):
        # Route for Word-to-PDF automated conversion
        if self.path == '/api/convert-docx-to-pdf':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    self.send_error(400, "Empty payload")
                    return

                docx_bytes = self.rfile.read(content_length)

                # Save temporary .docx
                with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_docx:
                    tmp_docx.write(docx_bytes)
                    tmp_docx_path = tmp_docx.name

                tmp_pdf_path = os.path.splitext(tmp_docx_path)[0] + '.pdf'

                # Execute silent Word conversion via PowerShell COM Automation
                cmd = [
                    'powershell',
                    '-ExecutionPolicy', 'Bypass',
                    '-File', CONVERT_SCRIPT,
                    '-DocxPath', tmp_docx_path,
                    '-PdfPath', tmp_pdf_path
                ]

                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode != 0 or not os.path.exists(tmp_pdf_path):
                    print("Conversion error:", result.stderr, flush=True)
                    self.send_error(500, f"Word conversion failed: {result.stderr}")
                    return

                # Read converted PDF
                with open(tmp_pdf_path, 'rb') as f:
                    pdf_bytes = f.read()

                # Cleanup temp files
                try:
                    os.remove(tmp_docx_path)
                    os.remove(tmp_pdf_path)
                except Exception:
                    pass

                # Return PDF to client
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.send_header('Content-Disposition', 'attachment; filename="fintech-specification.pdf"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(pdf_bytes)

            except Exception as e:
                print("Exception during conversion:", str(e), flush=True)
                self.send_error(500, str(e))
        else:
            self.send_error(404, "Endpoint not found")

    def end_headers(self):
        # Enable CORS for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def run_server():
    print(f"================================================================")
    print(f"  WORD AUTOMATED ENGINE SERVER")
    print(f"  Serving: {FRONTEND_DIR}")
    print(f"  Port: {PORT}")
    print(f"  API: POST http://localhost:{PORT}/api/convert-docx-to-pdf")
    print(f"================================================================")
    httpd = HTTPServer(('0.0.0.0', PORT), WordAutomatedEngineHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
