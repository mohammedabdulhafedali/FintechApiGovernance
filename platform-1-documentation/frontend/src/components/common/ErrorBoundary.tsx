import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="floating-alert-overlay" style={{ position: 'relative', minHeight: '300px', background: 'transparent' }}>
          <div 
            className="floating-alert-card"
            style={{
              borderTop: '4px solid rgba(244, 63, 94, 0.7)',
              margin: '2rem auto',
              maxWidth: '560px'
            }}
            dir="rtl"
          >
            {/* Error Icon */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: '0.25rem'
              }}
            >
              <AlertTriangle size={30} color="#f43f5e" />
            </div>

            {/* Expressive Title */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, textAlign: 'center' }}>
              {this.props.fallbackTitle || 'تعذر استكمال العرض: خطأ في معالجة البيانات'}
            </h3>

            {/* Explanatory Message */}
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #94a3b8)', margin: 0, lineHeight: 1.6, textAlign: 'center' }}>
              {this.props.fallbackMessage || 'واجه محرك العرض تعارضاً أثناء تحليل بنية البيانات المدخلة. يرجى مراجعة تفاصيل الخطأ البرمجي أدناه لتصحيحه:'}
            </p>

            {/* Code / Error Snippet Box */}
            {this.state.error && (
              <div 
                style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#f87171',
                  fontFamily: 'monospace',
                  direction: 'ltr',
                  textAlign: 'left',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  wordBreak: 'break-all'
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={this.handleRetry}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              <span>إعادة المحاولة وتحديث العرض</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
