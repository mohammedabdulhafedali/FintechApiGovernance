/**
 * Universal Syntax & Specification Error Formatter
 * Provides deep, expressive, enterprise-grade diagnostics for developer errors.
 * Never outputs generic slogans or synthetic mocks.
 */

export interface FormattedErrorDetail {
  title: string;
  message: string;
  snippet: string;
  line?: number;
  column?: number;
}

export function formatSyntaxError(
  rawContent: string,
  rawFormat: string,
  err: any,
  fileName?: string
): FormattedErrorDetail {
  const errMsg = err?.message || (typeof err === 'string' ? err : 'خطأ غير معروف في معالجة المدخل');
  const fmt = (rawFormat || '').toLowerCase();
  const filePrefix = fileName ? `[${fileName}] ` : '';

  // 1. Try to extract line and column from the error message
  let line = -1;
  let column = -1;

  // Check for "line X column Y" or "line X, column Y"
  const lineColMatch = errMsg.match(/line\s+(\d+)[\s,]+column\s+(\d+)/i) ||
                       errMsg.match(/at line\s+(\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    if (lineColMatch[2]) {
      column = parseInt(lineColMatch[2], 10);
    }
  }

  // Check for V8 / SpiderMonkey "position X"
  if (line === -1) {
    const posMatch = errMsg.match(/position\s+(\d+)/i);
    if (posMatch && rawContent) {
      const pos = parseInt(posMatch[1], 10);
      if (!isNaN(pos) && pos >= 0 && pos <= rawContent.length) {
        const upToPos = rawContent.slice(0, pos);
        const lines = upToPos.split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
    }
  }

  // Check for modern V8 ..."snippet"... is not valid JSON
  if (line === -1 && rawContent) {
    const v8SnippetMatch = errMsg.match(/\.\.\."(.*?)"\s*is not valid JSON/s) || errMsg.match(/"(.*?)"\s*is not valid JSON/s);
    if (v8SnippetMatch) {
      const targetSnippet = v8SnippetMatch[1];
      const foundIdx = rawContent.indexOf(targetSnippet);
      if (foundIdx !== -1) {
        const upToPos = rawContent.slice(0, foundIdx + targetSnippet.length);
        const lines = upToPos.split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
    }
  }

  // 2. Extract code snippet context around the error line
  let codeSnippet = '';
  if (rawContent && line > 0) {
    const allLines = rawContent.split('\n');
    const start = Math.max(0, line - 2);
    const end = Math.min(allLines.length, line + 1);

    codeSnippet = allLines.slice(start, end).map((l, idx) => {
      const currentLineNum = start + idx + 1;
      const isTarget = currentLineNum === line;
      const prefix = isTarget ? `> ${currentLineNum.toString().padStart(3, ' ')} | ` : `  ${currentLineNum.toString().padStart(3, ' ')} | `;
      let lineText = prefix + l;
      if (isTarget && column > 0) {
        const pointerPadding = ' '.repeat(prefix.length + Math.max(0, column - 1));
        lineText += `\n${pointerPadding}^-- ${cleanV8ErrorMessage(errMsg)}`;
      }
      return lineText;
    }).join('\n');
  }

  // 3. Format format-specific expressive Arabic diagnostics
  let title = 'خطأ في صياغة الكود البرمجي';
  let message = `تعذر معالجة المحتوى البرمجي لـ ${filePrefix}بسبب خطأ تركيبي: ${errMsg}`;

  if (fmt.includes('json')) {
    if (line > 0) {
      title = `خطأ نحوي في كود JSON (السطر ${line}${column > 0 ? `، العمود ${column}` : ''})`;
      message = `تم رفض المحتوى في ${filePrefix}لوجود خلل نحوي في صياغة JSON عند السطر ${line}. يرجى التحقق من صحة الفواصل أو إغلاق الأقواس { } [ ].`;
    } else {
      title = 'خطأ في بنية كود JSON';
      message = `تم رفض محتوى ${filePrefix}لعدم مطابقته لمواصفة JSON القياسية (RFC 8259): ${errMsg}.`;
    }
  } else if (fmt.includes('yaml') || fmt.includes('openapi') || fmt.includes('swagger')) {
    if (line > 0) {
      title = `خطأ في محاذاة / صياغة YAML (السطر ${line})`;
      message = `تم رفض مواصفة OpenAPI في ${filePrefix}لوجود خطأ في المحاذاة أو المسافات البادئة (Indentation) عند السطر ${line}.`;
    } else {
      title = 'خطأ في مواصفة OpenAPI / YAML';
      message = `فحص مواصفة OpenAPI في ${filePrefix}أظهر عدم صلاحيتها: ${errMsg}.`;
    }
  } else if (fmt.includes('soap') || fmt.includes('xml') || fmt.includes('wsdl')) {
    title = 'خطأ في هيكلية XML / SOAP Envelope';
    message = `تعذر فك ترميز شجرة XML في ${filePrefix}لوجود وسم غير مغلق أو خلل في بادئات النطاق (Namespaces): ${errMsg}.`;
  } else if (fmt.includes('markdown') || fmt.includes('md')) {
    title = 'خطأ في هيكلية وثيقة Markdown';
    message = `تعذر استخراج المسارات أو الجداول الرقابية من وثيقة Markdown في ${filePrefix}: ${errMsg}.`;
  }

  return {
    title,
    message,
    snippet: codeSnippet || errMsg,
    line: line > 0 ? line : undefined,
    column: column > 0 ? column : undefined
  };
}

function cleanV8ErrorMessage(msg: string): string {
  // Strip "SyntaxError: " or trailing position tags
  return msg
    .replace(/^SyntaxError:\s*/i, '')
    .replace(/\s*in JSON at position \d+/i, '')
    .trim();
}
