import React, { useState, useMemo } from 'react';
import { Endpoint } from '../../types/schema';
import { useLanguage } from '../../i18n';
import { IntroductionTab } from './doc-tabs/IntroductionTab';
import { HeadersTab } from './doc-tabs/HeadersTab';
import { EndpointsTab } from './doc-tabs/EndpointsTab';
import { ErrorsTab } from './doc-tabs/ErrorsTab';
import { NotesTab } from './doc-tabs/NotesTab';
import { extractDocMetadataFromMarkdown } from '../../utils/docMarkdownExtractor';

export type DocTabType = 'intro' | 'headers' | 'endpoints' | 'errors' | 'notes';

export interface ApiDocumentationViewProps {
  endpoints?: Endpoint[];
  activeEndpointIndex?: number;
  onSelectEndpoint?: (index: number) => void;
  systemName?: string;
  integrationName?: string;
  onAddNewEndpoint?: () => void;
  highlightedField?: string | null;
  rawSource?: string;
  initialTab?: DocTabType;
  extraControls?: React.ReactNode;
}

export const ApiDocumentationView: React.FC<ApiDocumentationViewProps> = ({
  endpoints = [],
  activeEndpointIndex = 0,
  onSelectEndpoint = () => {},
  systemName = 'Ultimate Pay Platform',
  integrationName,
  onAddNewEndpoint,
  highlightedField,
  rawSource,
  initialTab = 'intro',
  extraControls
}) => {
  const { isRtl, language } = useLanguage();
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<DocTabType>(initialTab);

  // Dynamically extract metadata from live raw Markdown (reactive to user typing)
  const extracted = useMemo(() => {
    return rawSource ? extractDocMetadataFromMarkdown(rawSource) : {};
  }, [rawSource]);

  // Tab configurations adhering strictly to the user's plan:
  // Clean, official, zero silly icons, strictly "ملاحظات" for tab 5.
  const tabs = [
    {
      id: 'intro' as DocTabType,
      labelAr: 'المقدمة',
      labelEn: 'Introduction'
    },
    {
      id: 'headers' as DocTabType,
      labelAr: 'الترويسة',
      labelEn: 'Headers'
    },
    {
      id: 'endpoints' as DocTabType,
      labelAr: 'الطلب والاستجابة',
      labelEn: 'Request & Response',
      badge: endpoints.length > 0 ? endpoints.length : undefined
    },
    {
      id: 'errors' as DocTabType,
      labelAr: 'الأخطاء',
      labelEn: 'Errors'
    },
    {
      id: 'notes' as DocTabType,
      labelAr: 'ملاحظات',
      labelEn: 'Notes'
    }
  ];

  return (
    <div className="api-documentation-master-view" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--bg-main, #1a2d45)',
      color: 'var(--text, #ffffff)'
    }}>
      {/* ── Official Enterprise Header & Tab Navigation Bar ── */}
      <div style={{
        background: 'var(--bg-card, #2b4870)',
        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        userSelect: 'none',
        minHeight: '44px'
      }}>
        {/* Navigation Tabs (Style matching IAM Management Views) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.15rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: isActive ? '2px solid var(--primary, #6366f1)' : '2px solid transparent',
                  color: isActive ? 'var(--primary, #818cf8)' : 'var(--text-dim, #94a3b8)',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text, #ffffff)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                }}
              >
                <span>{isEn ? tab.labelEn : tab.labelAr}</span>
                {tab.badge !== undefined && (
                  <span style={{
                    fontSize: '0.74rem',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    background: isActive ? 'rgba(99, 102, 241, 0.20)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#c7d2fe' : 'var(--text-muted, #cbd5e1)'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side: Extra controls or active integration tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {extraControls}

          {integrationName && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--text-dim, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0'
            }}>
              <span>{isRtl ? 'التكامل الحالي:' : 'Active Integration:'}</span>
              <span style={{
                fontWeight: 700,
                color: 'var(--text, #ffffff)',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                {integrationName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Content Viewport ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {activeTab === 'intro' && (
          <IntroductionTab
            title={extracted.title || 'Financial Institutions (FI) API Documentation'}
            systemName={extracted.platform || systemName || 'Ultimate Pay Platform'}
            baseUrl={extracted.baseUrl || 'https://tahseeltest.ultimate-pay.net/webserve'}
            lastUpdated={extracted.lastUpdated || '30-9-2026'}
            version={extracted.version || 'v2026.2'}
            overview={extracted.overview}
          />
        )}

        {activeTab === 'headers' && (
          <HeadersTab />
        )}

        {activeTab === 'endpoints' && (
          <EndpointsTab
            endpoints={endpoints}
            activeEndpointIndex={activeEndpointIndex}
            onSelectEndpoint={onSelectEndpoint}
            systemName={systemName}
            integrationName={integrationName}
            onAddNewEndpoint={onAddNewEndpoint}
            highlightedField={highlightedField}
          />
        )}

        {activeTab === 'errors' && (
          <ErrorsTab endpoints={endpoints} />
        )}

        {activeTab === 'notes' && (
          <NotesTab />
        )}
      </div>
    </div>
  );
};

export default ApiDocumentationView;
