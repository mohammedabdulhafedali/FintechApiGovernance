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
  const { t, isRtl } = useLanguage();

  return (
    <div className="endpoints-ribbon">
      {/* 1. Action Buttons in front (Matching Image 3) */}
      <button
        className="btn-ribbon-action-emerald"
        onClick={onAddApiForSector || onAddNewEndpoint}
        title={t('ribbon.addNewApiToSector')}
      >
        <span>+ {isRtl ? 'إضافة API جديدة لهذه الجهة' : 'Add New API for Sector'}</span>
      </button>

      <button
        className="btn-ribbon-action-indigo"
        onClick={onAddNewEndpoint}
        title={isRtl ? 'إضافة مسار من الشاشة' : 'Add Endpoint from Screen'}
      >
        <span>+ {isRtl ? 'إضافة مسار من الشاشة' : 'Add Endpoint from Screen'}</span>
      </button>

      {/* 2. Endpoint Pills */}
      {endpoints.map((ep, idx) => {
        const isActive = idx === activeEndpointIndex;
        const nameToShow = ep.shortName || ep.path.split('/').filter(Boolean).pop() || ep.path;
        return (
          <div
            key={ep.id || idx}
            className={`ep-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectEndpoint(idx)}
          >
            <span>{nameToShow}</span>
          </div>
        );
      })}

      {onDeleteSector && (
        <button
          className="btn-ribbon-add"
          style={{
            background: 'rgba(244, 63, 94, 0.10)',
            color: 'var(--rose)',
            borderColor: 'rgba(244, 63, 94, 0.35)',
            fontWeight: 700,
            marginInlineStart: 'auto',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
          onClick={onDeleteSector}
          title={t('ribbon.deleteSectorTitle')}
        >
          <Trash2 size={12} />
          <span>{t('ribbon.deleteSector')}</span>
        </button>
      )}
    </div>
  );
};
