import React, { useState } from 'react';
import { Endpoint } from '../../types/schema';
import { X, Server, Play, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

interface MockServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEndpoint: Endpoint;
}

export const MockServerModal: React.FC<MockServerModalProps> = ({
  isOpen,
  onClose,
  activeEndpoint
}) => {
  if (!isOpen) return null;

  const [requestBody, setRequestBody] = useState(activeEndpoint.payload || '{}');
  const [testScenario, setTestScenario] = useState<'success' | 'limit_exceeded'>('success');
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleExecuteMock = () => {
    setIsLoading(true);
    setResponseOutput(null);

    setTimeout(() => {
      setIsLoading(false);
      if (testScenario === 'success') {
        setResponseStatus(200);
        setResponseOutput(activeEndpoint.res200 || '{\n  "status": "SUCCESS"\n}');
      } else {
        setResponseStatus(422);
        setResponseOutput(activeEndpoint.res422 || '{\n  "error": "RULE_VIOLATION"\n}');
      }
    }, 450);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13, 25, 48, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Server size={20} color="var(--cyan)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                خادم المحاكاة الفوري (Instant Mock Sandbox Engine)
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                محاكاة حية لاستجابات الـ API للتحقق من شروط الـ Schema وقواعد الأعمال المصرفية
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Target Endpoint & Scenario Selector */}
          <div style={{
            background: 'var(--bg-input)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className={`method-badge method-${activeEndpoint.method.toLowerCase()}`}>
                {activeEndpoint.method}
              </span>
              <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                {activeEndpoint.path}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>سيناريو المحاكاة:</span>
              <select
                value={testScenario}
                onChange={e => setTestScenario(e.target.value as any)}
                style={{
                  background: '#040812',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.78rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="success">200 OK (طلب مطابق وقبول العملية)</option>
                <option value="limit_exceeded">422 Unprocessable (مخالفة الحد المصرفي)</option>
              </select>
            </div>
          </div>

          {/* Request Payload Editor */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)' }}>محتوى الطلب (Request Payload):</span>
              <button
                className="btn btn-emerald"
                onClick={handleExecuteMock}
                disabled={isLoading}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.85rem' }}
              >
                <Send size={13} />
                <span>{isLoading ? 'جاري الإرسال...' : 'إرسال واستدعاء المحاكي'}</span>
              </button>
            </div>
            <textarea
              value={requestBody}
              onChange={e => setRequestBody(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                background: '#040812',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: '#38bdf8',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                padding: '0.75rem',
                outline: 'none',
                direction: 'ltr',
                textAlign: 'left'
              }}
            />
          </div>

          {/* Response Output Console */}
          {responseOutput && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                  استجابة خادم المحاكاة (Mock Response):
                </span>
                <span className={`badge-pill ${responseStatus === 200 ? 'badge-emerald' : 'badge-rose'}`}>
                  HTTP {responseStatus} {responseStatus === 200 ? 'OK' : 'Unprocessable Entity'}
                </span>
              </div>
              <pre style={{
                background: '#040812',
                border: `1px solid ${responseStatus === 200 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                borderRadius: 'var(--radius-md)',
                color: responseStatus === 200 ? '#86efac' : '#fca5a5',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                padding: '0.85rem',
                direction: 'ltr',
                textAlign: 'left'
              }}>
                {responseOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(11, 20, 38, 0.7)'
        }}>
          <button className="btn btn-glass" onClick={onClose} style={{ fontSize: '0.82rem' }}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
