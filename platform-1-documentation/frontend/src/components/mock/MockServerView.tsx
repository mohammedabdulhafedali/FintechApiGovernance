import React, { useState } from 'react';
import { Endpoint } from '../../types/schema';
import { Server, Play, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface MockServerViewProps {
  activeEndpoint: Endpoint;
  onNotify: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const MockServerView: React.FC<MockServerViewProps> = ({
  activeEndpoint,
  onNotify
}) => {
  const { t } = useLanguage();

  const [requestBody, setRequestBody] = useState(activeEndpoint?.payload || '{\n  "accountNumber": "SA440000001234567890"\n}');
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
        setResponseOutput(activeEndpoint?.res200 || '{\n  "status": "SUCCESS",\n  "reference": "TXN_99812"\n}');
        onNotify(
          t('mock.mockSuccessTitle'),
          `${t('mock.mockSuccessMsg')} (${activeEndpoint?.path || '/v1/accounts'})`,
          'success'
        );
      } else {
        setResponseStatus(422);
        setResponseOutput(activeEndpoint?.res422 || '{\n  "error": "RULE_VIOLATION",\n  "code": "LIMIT_EXCEEDED_422"\n}');
        onNotify(
          t('mock.mockWarningTitle'),
          t('mock.mockWarningMsg'),
          'warning'
        );
      }
    }, 450);
  };

  return (
    <div className="dedicated-view-layout">
      {/* Header */}
      <div className="dedicated-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--cyan)',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Server size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {t('mock.pageTitle')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {t('mock.pageSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Mock Controls & Request */}
        <div className="dedicated-view-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              {t('mock.endpointLabel')}
            </span>
            <span className={`method-badge method-${(activeEndpoint?.method || 'POST').toLowerCase()}`}>
              {activeEndpoint?.method || 'POST'}
            </span>
            <code className="mono" style={{ color: 'var(--blue)', fontSize: '0.85rem' }}>
              {activeEndpoint?.path || '/v1/transfers'}
            </code>
          </div>

          <div className="form-group">
            <label className="form-label">{t('mock.scenarioLabel')}</label>
            <select
              value={testScenario}
              onChange={(e) => setTestScenario(e.target.value as any)}
              className="form-control"
            >
              <option value="success">{t('mock.scenarioSuccess')}</option>
              <option value="limit_exceeded">{t('mock.scenarioLimit')}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('mock.requestBodyLabel')}</label>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="add-api-code-editor"
              style={{ height: '140px' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecuteMock}
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }}
          >
            {isLoading ? (
              <span>{t('mock.executing')}</span>
            ) : (
              <>
                <Send size={15} />
                <span>{t('mock.executeButton')}</span>
              </>
            )}
          </button>
        </div>

        {/* Mock Response Inspection */}
        <div className="dedicated-view-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              {t('mock.responseOutputLabel')}
            </span>
            {responseStatus && (
              <span className={`badge-pill ${responseStatus === 200 ? 'badge-emerald' : 'badge-rose'}`}>
                {responseStatus === 200 ? '200 OK' : '422 Unprocessable'}
              </span>
            )}
          </div>

          <div
            className="example-code-pane"
            style={{
              minHeight: '220px',
              color: responseStatus === 200 ? '#a7f3d0' : responseStatus === 422 ? '#fecdd3' : 'var(--text-dim)'
            }}
          >
            {responseOutput ? responseOutput : '// اضغط زر تشغيل المحاكاة لمعاينة الاستجابة اللحظية\n// Click Execute to simulate real-time response'}
          </div>
        </div>
      </div>
    </div>
  );
};
