import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../i18n';

interface NotesTabProps {
  customNotes?: string;
}

export const NotesTab: React.FC<NotesTabProps> = ({ customNotes }) => {
  const { isRtl } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPip, setCopiedPip] = useState(false);

  const pythonSdkCode = `import hashlib
import json
import time
import uuid
from base64 import b64encode
from typing import Optional
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

class RS256ApiClient:
    def __init__(self, base_url: str, client_id: str, private_key_pem: str):
        self.base_url = base_url.rstrip("/")
        self.client_id = client_id
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode("utf-8"), password=None
        )

    def _sha256(self, data: str) -> str:
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    def _sign(self, canonical: str) -> str:
        sig = self.private_key.sign(
            canonical.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return b64encode(sig).decode("utf-8")

    def _headers(self, method: str, path: str, body: str,
                 timestamp: Optional[str] = None, nonce: Optional[str] = None) -> dict:
        ts = timestamp or str(int(time.time()))
        n = nonce or str(uuid.uuid4())
        canonical = f"{method}\\n{path}\\n{ts}\\n{n}\\n{self._sha256(body)}"

        return {
            "X-Client-ID": self.client_id,
            "X-Timestamp": ts,
            "X-Nonce": n,
            "X-Signature": self._sign(canonical),
            "Content-Type": "application/json",
        }

    def request(self, method: str, path: str, body: str = "",
                timestamp: Optional[str] = None, nonce: Optional[str] = None) -> requests.Response:
        headers = self._headers(method, path, body, timestamp, nonce)
        url = f"{self.base_url}{path}"
        return requests.request(method, url, data=body, headers=headers)

    def post(self, path: str, body: str = "{}", **kw) -> requests.Response:
        return self.request("POST", path, body, **kw)

    def get(self, path: str, **kw) -> requests.Response:
        return self.request("GET", path, "", **kw)

    def put(self, path: str, body: str = "{}", **kw) -> requests.Response:
        return self.request("PUT", path, body, **kw)

    def delete(self, path: str, **kw) -> requests.Response:
        return self.request("DELETE", path, "", **kw)

if __name__ == "__main__":
    with open("private_key.pem", "r") as f:
        pem_key = f.read()

    client = RS256ApiClient(
        base_url="https://tahseeltest.ultimate-pay.net/webserve",
        client_id="client_corp_17",
        private_key_pem=pem_key
    )

    response = client.get("/api/v1/financial_corp/get_parent_sectors")
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
`;

  const pipCommand = `pip install requests cryptography`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonSdkCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyPip = () => {
    navigator.clipboard.writeText(pipCommand);
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  return (
    <div className="doc-tab-pane notes-tab-container" style={{ padding: '1.75rem', maxWidth: '1080px', margin: '0 auto' }}>
      {/* ── Section Title ── */}
      <div style={{
        padding: '1.4rem',
        borderRadius: '10px',
        background: 'var(--bg-card, #2b4870)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text, #ffffff)',
            margin: '0 0 0.35rem 0'
          }}>
            1.5 Python Client SDK Implementation
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted, #cbd5e1)',
            margin: 0
          }}>
            Below is a complete, production-ready Python client class implementing RSA-256 request signing and request execution:
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleCopyPip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
              background: 'rgba(255, 255, 255, 0.05)',
              color: copiedPip ? 'var(--emerald, #10b981)' : 'var(--text-muted, #cbd5e1)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Copy pip install command"
          >
            {copiedPip ? <Check size={13} /> : <Terminal size={13} />}
            <span>{copiedPip ? (isRtl ? 'تم نسخ الأمر' : 'Copied pip') : 'pip install'}</span>
          </button>

          <button
            onClick={handleCopyCode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.18))',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--emerald, #10b981)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Copy Full Python SDK"
          >
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCode ? (isRtl ? 'تم نسخ الكود بالكامل' : 'Copied Code') : (isRtl ? 'نسخ الكود بالكامل' : 'Copy Python SDK')}</span>
          </button>
        </div>
      </div>

      {/* ── Requirements & Prerequisites ── */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        background: 'var(--bg-main, #1a2d45)',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim, #94a3b8)' }}>
            {isRtl ? 'حزم بايثون المطلوبة:' : 'Prerequisites:'}
          </span>
          <code style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.82rem',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.08)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px'
          }}>
            {pipCommand}
          </code>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)' }}>
          Python 3.8+ | OpenSSL 1.1.1+
        </div>
      </div>

      {/* ── Code Display Container ── */}
      <div style={{
        borderRadius: '10px',
        background: '#0d1829',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{
          padding: '0.65rem 1rem',
          background: 'rgba(0, 0, 0, 0.35)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'inline-block'
            }} />
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              display: 'inline-block'
            }} />
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block'
            }} />
            <span style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.78rem',
              color: 'var(--text-dim, #94a3b8)',
              marginLeft: '0.5rem'
            }}>
              rs256_client.py
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            style={{
              background: 'none',
              border: 'none',
              color: copiedCode ? '#10b981' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.76rem',
              fontWeight: 600
            }}
          >
            {copiedCode ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <pre style={{
          margin: 0,
          padding: '1.25rem 1.4rem',
          fontSize: '0.84rem',
          lineHeight: '1.65',
          fontFamily: 'var(--font-mono, monospace)',
          color: '#e2e8f0',
          overflowX: 'auto',
          direction: 'ltr',
          textAlign: 'left'
        }}>
          <code>{pythonSdkCode}</code>
        </pre>
      </div>

      {/* ── Custom/Future Extensible Notes ── */}
      {customNotes && (
        <div style={{
          marginTop: '1.75rem',
          padding: '1.4rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text, #ffffff)', margin: '0 0 0.5rem 0' }}>
            {isRtl ? 'ملاحظات وتوجيهات إضافية' : 'Additional Integration Notes'}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #cbd5e1)', margin: 0, lineHeight: '1.6' }}>
            {customNotes}
          </p>
        </div>
      )}
    </div>
  );
};
