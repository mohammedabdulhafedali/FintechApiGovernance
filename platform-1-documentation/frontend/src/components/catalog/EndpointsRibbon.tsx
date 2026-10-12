import React from 'react';
import { Endpoint } from '../../types/schema';
import { GitCompare, PlusCircle, CheckCircle2, Clock } from 'lucide-react';

interface EndpointsRibbonProps {
  endpoints: Endpoint[];
  activeEndpointIndex: number;
  onSelectEndpoint: (index: number) => void;
  onOpenDiffModal: () => void;
  onAddNewEndpoint: () => void;
}

export const EndpointsRibbon: React.FC<EndpointsRibbonProps> = ({
  endpoints,
  activeEndpointIndex,
  onSelectEndpoint,
  onOpenDiffModal,
  onAddNewEndpoint
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1.25rem',
      background: 'rgba(11, 20, 38, 0.85)',
      borderBottom: '1px solid var(--border)',
      gap: '1rem',
      overflowX: 'auto'
    }}>
      {/* Endpoints Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflowX: 'auto' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          المسارات:
        </span>
        {endpoints.map((ep, idx) => {
          const isActive = idx === activeEndpointIndex;
          const methodClass = `method-${ep.method.toLowerCase()}`;

          return (
            <button
              key={ep.id || idx}
              onClick={() => onSelectEndpoint(idx)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: isActive ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                border: isActive ? '1px solid var(--blue)' : '1px solid var(--border)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                outline: 'none'
              }}
            >
              <span className={`method-badge ${methodClass}`} style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}>
                {ep.method}
              </span>
              <span className="mono" style={{ fontSize: '0.82rem', fontWeight: isActive ? 700 : 500 }}>
                {ep.shortName}
              </span>
              {ep.isDraft ? (
                <span className="badge-pill badge-amber" style={{ padding: '0.05rem 0.35rem', fontSize: '0.62rem' }}>
                  <Clock size={10} /> مسودة
                </span>
              ) : (
                <CheckCircle2 size={12} color="var(--emerald)" />
              )}
            </button>
          );
        })}

        <button
          onClick={onAddNewEndpoint}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'transparent',
            border: '1px dashed var(--border-strong)',
            color: 'var(--emerald)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          <PlusCircle size={14} />
          <span>إضافة مسار</span>
        </button>
      </div>

      {/* Semantic Diff Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
        <button
          className="btn btn-glass"
          onClick={onOpenDiffModal}
          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
        >
          <GitCompare size={14} color="var(--blue)" />
          <span>مقارنة الفروقات الدلالية (Semantic Diff)</span>
        </button>
      </div>
    </div>
  );
};
