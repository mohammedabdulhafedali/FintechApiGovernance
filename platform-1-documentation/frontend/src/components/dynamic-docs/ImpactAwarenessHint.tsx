import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ChangeImpactAnalysis } from '../../types/dynamicDocs';

interface ImpactAwarenessHintProps {
  impact: ChangeImpactAnalysis | null;
  onDismiss?: () => void;
}

export const ImpactAwarenessHint: React.FC<ImpactAwarenessHintProps> = ({ impact, onDismiss }) => {
  if (!impact) return null;

  const isShared = impact.scope === 'SHARED_CONTENT' || impact.scope === 'SHARED_TOKEN';

  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        border: `1px solid ${isShared ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
        background: isShared
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.03))'
          : 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(2, 132, 199, 0.03))',
        color: '#f8fafc',
        fontSize: '0.82rem',
        marginBottom: '1rem',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        <div style={{ marginTop: '0.1rem', flexShrink: 0 }}>
          {impact.severity === 'high' ? (
            <ShieldAlert size={17} style={{ color: '#f43f5e' }} />
          ) : isShared ? (
            <AlertTriangle size={17} style={{ color: '#f59e0b' }} />
          ) : (
            <Info size={17} style={{ color: '#38bdf8' }} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.2rem', color: isShared ? '#fbbf24' : '#7dd3fc' }}>
            {impact.title}
          </div>
          <div style={{ color: '#cbd5e1', lineHeight: 1.5, fontSize: '0.8rem' }}>
            {impact.description}
          </div>
          {impact.affectedModes.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>الأوضاع المتأثرة:</span>
              {impact.affectedModes.map(m => (
                <span
                  key={m}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}
                >
                  {m === 'web' ? '🌐 عرض الويب' : m === 'print_a4' ? '📄 طباعة A4' : m}
                </span>
              ))}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.2rem'
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
