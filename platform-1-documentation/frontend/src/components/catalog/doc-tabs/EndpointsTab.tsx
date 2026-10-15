import React from 'react';
import { Endpoint } from '../../../types/schema';
import { EndpointsRibbon } from '../EndpointsRibbon';
import { SpecViewer } from '../SpecViewer';
import { useLanguage } from '../../../i18n';

interface EndpointsTabProps {
  endpoints: Endpoint[];
  activeEndpointIndex: number;
  onSelectEndpoint: (index: number) => void;
  systemName?: string;
  integrationName?: string;
  onAddNewEndpoint?: () => void;
  highlightedField?: string | null;
}

export const EndpointsTab: React.FC<EndpointsTabProps> = ({
  endpoints,
  activeEndpointIndex,
  onSelectEndpoint,
  systemName,
  integrationName,
  onAddNewEndpoint,
  highlightedField
}) => {
  const { isRtl } = useLanguage();
  const activeEndpoint = endpoints[activeEndpointIndex] || endpoints[0];

  if (!endpoints || endpoints.length === 0) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-dim, #94a3b8)',
        background: 'var(--bg-card, #2b4870)',
        borderRadius: '10px',
        margin: '1.75rem auto',
        maxWidth: '1080px',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text, #ffffff)', marginBottom: '0.5rem' }}>
          {isRtl ? 'لا توجد مسارات معرفة في هذه الوثيقة' : 'No endpoints defined in this document'}
        </div>
      </div>
    );
  }

  return (
    <div className="doc-tab-pane endpoints-tab-container" style={{ padding: '0 0 1.5rem 0' }}>
      {/* ── Interactive Endpoints Ribbon ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--bg-card, #2b4870)',
        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
      }}>
        <EndpointsRibbon
          endpoints={endpoints}
          activeEndpointIndex={activeEndpointIndex}
          onSelectEndpoint={onSelectEndpoint}
          systemName={systemName}
          integrationName={integrationName}
          onAddNewEndpoint={onAddNewEndpoint}
          style={{ padding: '0.45rem 1rem', minHeight: '46px' }}
        />
      </div>

      {/* ── Active Endpoint Specification & Wire Viewer (Without Duplicated Headers) ── */}
      <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1180px', margin: '0 auto' }}>
        {activeEndpoint && (
          <SpecViewer
            key={activeEndpoint.id || `${activeEndpoint.method}_${activeEndpoint.path}_${activeEndpointIndex}`}
            endpoint={activeEndpoint}
            highlightedField={highlightedField}
            hideGlobalHeaders={true}
          />
        )}
      </div>
    </div>
  );
};
