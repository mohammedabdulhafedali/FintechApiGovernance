import React from 'react';
import { Endpoint } from '../../types/schema';
import { PlusCircle, FolderPlus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface EndpointsRibbonProps {
  endpoints: Endpoint[];
  activeEndpointIndex: number;
  onSelectEndpoint: (index: number) => void;
  onOpenDiffModal?: () => void;
  onAddNewEndpoint: () => void;
  onAddApiForSector?: () => void;
  onDeleteSector?: () => void;
}

export const EndpointsRibbon: React.FC<EndpointsRibbonProps> = ({
  endpoints,
  activeEndpointIndex,
  onSelectEndpoint,
  onAddNewEndpoint,
  onAddApiForSector,
  onDeleteSector
}) => {
  const { t } = useLanguage();

  return (
    <div className="endpoints-ribbon">
      {endpoints.map((ep, idx) => {
        const isActive = idx === activeEndpointIndex;
        return (
          <div
            key={ep.id || idx}
            className={`ep-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectEndpoint(idx)}
          >
            <span className="ep-pill-path">
              {ep.shortName || ep.path.split('/').filter(Boolean).pop()}
            </span>
            {ep.isDraft && (
              <span
                style={{
                  fontSize: '0.65rem',
                  background: 'rgba(245,158,11,0.2)',
                  color: 'var(--amber)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  marginInlineStart: '0.35rem',
                  fontWeight: 700
                }}
              >
                {t('ribbon.draftBadge')}
              </span>
            )}
          </div>
        );
      })}

      <button className="btn-ribbon-add" onClick={onAddNewEndpoint}>
        <PlusCircle size={13} />
        <span>{t('ribbon.addFromScreen')}</span>
      </button>

      <button
        className="btn-ribbon-add"
        style={{
          background: 'rgba(16, 185, 129, 0.12)',
          color: 'var(--emerald)',
          borderColor: 'var(--emerald)',
          fontWeight: 700
        }}
        onClick={onAddApiForSector || onAddNewEndpoint}
      >
        <FolderPlus size={13} />
        <span>{t('ribbon.addNewApiToSector')}</span>
      </button>

      {onDeleteSector && (
        <button
          className="btn-ribbon-add"
          style={{
            background: 'rgba(244, 63, 94, 0.10)',
            color: 'var(--rose)',
            borderColor: 'rgba(244, 63, 94, 0.35)',
            fontWeight: 700,
            marginInlineStart: 'auto'
          }}
          onClick={onDeleteSector}
          title={t('ribbon.deleteSectorTitle')}
        >
          <Trash2 size={13} />
          <span>{t('ribbon.deleteSector')}</span>
        </button>
      )}
    </div>
  );
};
