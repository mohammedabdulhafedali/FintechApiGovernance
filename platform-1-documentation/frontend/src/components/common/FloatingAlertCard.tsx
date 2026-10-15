import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useLanguage } from '../../i18n';

export interface FloatingAlertState {
  isOpen: boolean;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  codeSnippet?: string;
  confirmText?: string;
  onConfirm?: () => void;
}

interface FloatingAlertCardProps {
  alert: FloatingAlertState | null;
  onClose: () => void;
}

export const FloatingAlertCard: React.FC<FloatingAlertCardProps> = ({
  alert,
  onClose
}) => {
  const { t, isRtl } = useLanguage();
  if (!alert || !alert.isOpen) return null;

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm();
    }
    onClose();
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'success':
        return <CheckCircle2 size={32} color="var(--emerald)" />;
      case 'warning':
        return <AlertTriangle size={32} color="var(--amber)" />;
      case 'error':
        return <AlertCircle size={32} color="var(--rose)" />;
      case 'info':
        return <Info size={32} color="var(--blue)" />;
    }
  };

  const getIconBg = () => {
    switch (alert.type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.15)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.15)';
      case 'error':
        return 'rgba(244, 63, 94, 0.15)';
      case 'info':
        return 'rgba(56, 189, 248, 0.15)';
    }
  };

  const getBorderColor = () => {
    switch (alert.type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.5)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.5)';
      case 'error':
        return 'rgba(244, 63, 94, 0.5)';
      case 'info':
        return 'rgba(56, 189, 248, 0.5)';
    }
  };

  const isMultiLineSnippet = alert.codeSnippet ? alert.codeSnippet.includes('\n') : false;

  return (
    <div className="floating-alert-overlay" onClick={onClose}>
      <div 
        className="floating-alert-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          borderTop: `4px solid ${getBorderColor()}`,
          textAlign: isRtl ? 'right' : 'left',
          maxWidth: isMultiLineSnippet ? '560px' : '480px'
        }}
      >
        {/* Close Icon */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            [isRtl ? 'left' : 'right']: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-xs)'
          }}
          title={t('common.close')}
        >
          <X size={18} />
        </button>

        {/* Central Emphatic Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: getIconBg(),
            border: `1px solid ${getBorderColor()}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.25rem',
            alignSelf: 'center'
          }}
        >
          {getIcon()}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
          {alert.title}
        </h3>

        {/* Message */}
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, textAlign: 'center' }}>
          {alert.message}
        </p>

        {/* Code Snippet Box (If available) */}
        {alert.codeSnippet && (
          <div
            style={{
              background: '#070a12',
              border: '1px solid #1e293b',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.95rem',
              width: '100%',
              direction: 'ltr',
              textAlign: isMultiLineSnippet ? 'left' : 'center',
              fontFamily: 'var(--font-mono, monospace)',
              color: alert.type === 'error' ? '#fca5a5' : '#38bdf8',
              fontSize: '0.80rem',
              lineHeight: 1.5,
              whiteSpace: isMultiLineSnippet ? 'pre-wrap' : 'normal',
              maxHeight: '180px',
              overflowY: 'auto',
              wordBreak: 'break-all',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)'
            }}
          >
            {alert.codeSnippet}
          </div>
        )}

        {/* Confirmation Button */}
        <button
          className={alert.type === 'error' ? 'btn btn-primary' : 'btn btn-emerald'}
          style={{ width: '100%', padding: '0.65rem 1.25rem', fontSize: '0.92rem', marginTop: '0.5rem' }}
          onClick={handleConfirm}
        >
          {alert.confirmText || t('common.ok')}
        </button>
      </div>
    </div>
  );
};
