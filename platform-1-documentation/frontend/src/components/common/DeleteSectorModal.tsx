import React from 'react';
import { AlertTriangle, Trash2, X, Building2, AlertCircle } from 'lucide-react';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface DeleteSectorModalProps {
  isOpen: boolean;
  sectorKey: string | null;
  sector: Sector | null;
  onClose: () => void;
  onConfirmDelete: (sectorKey: string) => void;
}

export const DeleteSectorModal: React.FC<DeleteSectorModalProps> = ({
  isOpen,
  sectorKey,
  sector,
  onClose,
  onConfirmDelete
}) => {
  const { t, getLocalized, isRtl, language } = useLanguage();
  const isEn = language === 'en';

  if (!isOpen || !sectorKey || !sector) return null;

  const endpointCount = sector.services
    ? Object.values(sector.services).reduce(
        (acc, srv) => acc + (srv.endpoints ? srv.endpoints.length : 0),
        0
      )
    : 0;

  const servicesCount = sector.services ? Object.keys(sector.services).length : 0;
  const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);
  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <div className="floating-alert-overlay" onClick={onClose}>
      <div
        className="floating-alert-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          ...alignStyle,
          alignItems: 'stretch',
          borderTop: '4px solid var(--rose)'
        }}
      >
        {/* Header with Close */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--rose)',
              flexShrink: 0
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {t('modals.deleteSectorTitle')}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--rose)' }}>
                {t('modals.deleteSectorSub')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-xs)'
            }}
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sector Info Summary */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--cyan)" />
              <strong style={{ fontSize: '0.98rem', color: 'var(--text)' }}>
                {localizedName}
              </strong>
            </div>
            <span className="mono badge-pill badge-purple" style={{ fontSize: '0.74rem' }}>
              {sector.code}
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '1.25rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              <span>{t('modals.servicesCount')}</span>
              <strong style={{ color: 'var(--text)' }}>{servicesCount}</strong>
            </div>
            <div>
              <span>{t('modals.endpointsCount')}</span>
              <strong style={{ color: endpointCount > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>
                {endpointCount} {isEn ? (endpointCount === 1 ? 'Route' : 'Routes') : (endpointCount === 1 ? 'مسار' : 'مسارات')}
              </strong>
            </div>
          </div>
        </div>

        {/* Warning Callout */}
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem 1rem',
          display: 'flex',
          gap: '0.65rem',
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={20} color="var(--rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            lineHeight: 1.55,
            margin: 0
          }}>
            {t('modals.deleteWarningText')}
          </p>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.85rem',
          marginTop: '0.5rem'
        }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}
            onClick={onClose}
          >
            {t('modals.btnCancel')}
          </button>

          <button
            type="button"
            className="btn btn-rose"
            style={{ padding: '0.6rem 1.35rem', fontSize: '0.88rem' }}
            onClick={() => onConfirmDelete(sectorKey)}
          >
            <Trash2 size={16} />
            <span>{t('modals.btnConfirmDelete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
