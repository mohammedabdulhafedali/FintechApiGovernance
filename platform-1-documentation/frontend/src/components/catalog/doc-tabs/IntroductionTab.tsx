import React, { useState } from 'react';
import { Copy, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../i18n';

interface IntroductionTabProps {
  title?: string;
  systemName?: string;
  baseUrl?: string;
  lastUpdated?: string;
  version?: string;
  overview?: string;
}

export const IntroductionTab: React.FC<IntroductionTabProps> = ({
  title = 'Financial Institutions (FI) API Documentation',
  systemName = 'Ultimate Pay Platform',
  baseUrl = 'https://tahseeltest.ultimate-pay.net/webserve',
  lastUpdated = '30-9-2026',
  version = 'v2026.2',
  overview = 'The Ultimate Pay Financial Institutions (FI) API enables financial institutions to seamlessly integrate payment, inquiry, biller discovery, and transaction management services. All API requests are authenticated using RSA-SHA256 digital signatures to ensure end-to-end message integrity and non-repudiation.'
}) => {
  const { isRtl } = useLanguage();
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [copiedCanonical, setCopiedCanonical] = useState(false);

  const canonicalFormat = `<HTTP_METHOD>\\n<PATH>\\n<TIMESTAMP>\\n<NONCE>\\n<SHA256_HASH_OF_BODY>`;

  const handleCopy = (text: string, type: 'url' | 'canonical') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedBaseUrl(true);
      setTimeout(() => setCopiedBaseUrl(false), 2000);
    } else {
      setCopiedCanonical(true);
      setTimeout(() => setCopiedCanonical(false), 2000);
    }
  };

  return (
    <div 
      className="doc-tab-pane intro-tab-container" 
      style={{ 
        padding: '1.5rem', 
        maxWidth: '1080px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      {/* ── Document Official Header Card (Strictly LTR for English API Title) ── */}
      <div 
        dir="ltr"
        style={{
          padding: '1.5rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text, #ffffff)',
              margin: '0 0 0.4rem 0',
              fontFamily: 'var(--font-title, sans-serif)',
              letterSpacing: '-0.01em'
            }}>
              {title}
            </h1>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
              {systemName}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--emerald, #10b981)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontFamily: 'var(--font-mono, monospace)'
            }}>
              Version {version}
            </span>
            <span style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-muted, #cbd5e1)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              fontFamily: 'var(--font-mono, monospace)'
            }}>
              latest update {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section: Overview ── */}
      <div 
        dir="ltr"
        style={{
          padding: '1.4rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          textAlign: 'left'
        }}
      >
        <h2 style={{
          fontSize: '1.08rem',
          fontWeight: 700,
          color: 'var(--text, #ffffff)',
          margin: '0 0 0.75rem 0'
        }}>
          Overview
        </h2>
        <p style={{
          fontSize: '0.92rem',
          lineHeight: '1.65',
          color: 'var(--text-muted, #cbd5e1)',
          margin: 0
        }}>
          {overview}
        </p>
      </div>

      {/* ── Section: Base URL ── */}
      <div 
        dir="ltr"
        style={{
          padding: '1.25rem 1.4rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          textAlign: 'left'
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', marginBottom: '0.65rem' }}>
          Base URL
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-main, #1a2d45)',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          gap: '1rem'
        }}>
          <code style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.9rem',
            color: '#38bdf8',
            direction: 'ltr',
            wordBreak: 'break-all'
          }}>
            {baseUrl}
          </code>
          <button
            onClick={() => handleCopy(baseUrl, 'url')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
              background: 'rgba(255, 255, 255, 0.05)',
              color: copiedBaseUrl ? 'var(--emerald, #10b981)' : 'var(--text, #ffffff)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="Copy Base URL"
          >
            {copiedBaseUrl ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedBaseUrl ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: Authentication & Security (Pure LTR BiDi Isolation) ── */}
      <div 
        dir="ltr"
        style={{
          padding: '1.5rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem',
          textAlign: 'left'
        }}
      >
        <h2 style={{
          fontSize: '1.18rem',
          fontWeight: 800,
          color: 'var(--text, #ffffff)',
          margin: 0
        }}>
          1. Authentication &amp; Security
        </h2>

        {/* 1.1 Digital Signature Overview */}
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.5rem 0' }}>
            1.1 Digital Signature Overview
          </h3>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-muted, #cbd5e1)', margin: 0 }}>
            The digital signature serves as a secure, stateless alternative to traditional username/password authentication. Every HTTP request sent to the platform must include custom security headers generated using an RSA-256 private key.
          </p>
        </div>

        {/* 1.2 FI Onboarding Steps */}
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.65rem 0' }}>
            1.2 FI Onboarding Steps
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted, #cbd5e1)' }}>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--emerald, #10b981)', minWidth: '1.25rem' }}>1.</span>
              <div>
                <strong style={{ color: 'var(--text, #ffffff)' }}>Navigate to Platform Settings:</strong> Log into the Ultimate Pay Platform and go to the Users screen.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--emerald, #10b981)', minWidth: '1.25rem' }}>2.</span>
              <div>
                <strong style={{ color: 'var(--text, #ffffff)' }}>Create FI User:</strong>
                <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                  <li style={{ marginBottom: '0.25rem' }}>Create a new user with type <code style={{ color: '#38bdf8' }}>Financial Institution</code>.</li>
                  <li style={{ marginBottom: '0.25rem' }}>Assign appropriate permissions.</li>
                  <li>Set the user role/type as <code style={{ color: '#38bdf8' }}>Terminal User</code>.</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--emerald, #10b981)', minWidth: '1.25rem' }}>3.</span>
              <div>
                <strong style={{ color: 'var(--text, #ffffff)' }}>Key Exchange:</strong>
                <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                  <li style={{ marginBottom: '0.25rem' }}>Generate an RSA key pair locally (minimum 2048-bit recommended).</li>
                  <li>Upload the <code style={{ color: '#38bdf8' }}>public_key.pem</code> file or paste its content into the designated text box in the admin portal.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Notice Callout */}
          <div style={{
            marginTop: '0.9rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.84rem', color: '#fca5a5', lineHeight: '1.5' }}>
              <strong style={{ color: '#ef4444' }}>Important Security Notice:</strong> Store <code style={{ color: '#ffffff' }}>private_key.pem</code> in a secure location (e.g., HSM, AWS Secrets Manager, Key Vault). Never share or expose the private key.
            </div>
          </div>
        </div>

        {/* 1.3 Signature Generation Specification */}
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.65rem 0' }}>
            1.3 Signature Generation Specification
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #cbd5e1)', margin: '0 0 0.65rem 0' }}>
            To sign a request, construct a canonical string formatted as follows:
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-main, #1a2d45)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            marginBottom: '1rem',
            gap: '1rem'
          }}>
            <code style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.86rem',
              color: '#34d399',
              direction: 'ltr',
              wordBreak: 'break-all'
            }}>
              {canonicalFormat}
            </code>
            <button
              onClick={() => handleCopy(canonicalFormat, 'canonical')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
                background: 'rgba(255, 255, 255, 0.05)',
                color: copiedCanonical ? 'var(--emerald, #10b981)' : 'var(--text, #ffffff)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Copy Canonical Formula"
            >
              {copiedCanonical ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedCanonical ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted, #cbd5e1)', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 0.4rem 0', fontWeight: 600, color: 'var(--text, #ffffff)' }}>Where:</p>
            <ul style={{ margin: 0, padding: '0 0 0 1.25rem' }}>
              <li style={{ marginBottom: '0.25rem' }}><code style={{ color: '#38bdf8' }}>&lt;HTTP_METHOD&gt;</code>: Uppercase HTTP method (GET, POST, PUT, DELETE).</li>
              <li style={{ marginBottom: '0.25rem' }}><code style={{ color: '#38bdf8' }}>&lt;PATH&gt;</code>: Request endpoint path starting with <code style={{ color: '#38bdf8' }}>/</code> (e.g., <code style={{ color: '#38bdf8' }}>/api/v1/financial_corp/sub_sector</code>).</li>
              <li style={{ marginBottom: '0.25rem' }}><code style={{ color: '#38bdf8' }}>&lt;TIMESTAMP&gt;</code>: Current Unix timestamp in seconds (string).</li>
              <li style={{ marginBottom: '0.25rem' }}><code style={{ color: '#38bdf8' }}>&lt;NONCE&gt;</code>: Unique UUID v4 string for replay protection.</li>
              <li><code style={{ color: '#38bdf8' }}>&lt;SHA256_HASH_OF_BODY&gt;</code>: Lowercase hex digest of the SHA-256 hash of the raw JSON request body (for empty body, use <code style={{ color: '#38bdf8' }}>""</code>).</li>
            </ul>
            <p style={{ margin: '0.75rem 0 0 0', fontStyle: 'italic', color: 'var(--text-dim, #94a3b8)' }}>
              Sign the UTF-8 encoded canonical string using RSA PKCS#1 v1.5 with SHA-256, then Base64 encode the resulting signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
