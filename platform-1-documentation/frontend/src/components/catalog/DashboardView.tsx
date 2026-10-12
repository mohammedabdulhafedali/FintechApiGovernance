import React from 'react';
import { Building2, Store, ShieldAlert, Scale, Plus, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface DashboardViewProps {
  sectors: Record<string, Sector>;
  onSelectSector: (sectorKey: string) => void;
  onOpenAddSector: () => void;
  onOpenDeleteSector: (sectorKey: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sectors,
  onSelectSector,
  onOpenAddSector,
  onOpenDeleteSector
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  const getSectorIcon = (key: string) => {
    switch (key) {
      case 'banking': return <Building2 size={20} color="#38bdf8" />;
      case 'merchants': return <Store size={20} color="#34d399" />;
      case 'aml': return <ShieldAlert size={20} color="#f59e0b" />;
      case 'settlement': return <Scale size={20} color="#a855f7" />;
      default: return <Building2 size={20} color="#38bdf8" />;
    }
  };

  const getSectorCount = (sector: Sector) => {
    if (!sector || !sector.services) return 0;
    return Object.values(sector.services).reduce(
      (acc, srv) => acc + (srv.endpoints ? srv.endpoints.length : 0),
      0
    );
  };

  const sectorEntries = Object.entries(sectors);

  return (
    <div className="dashboard-container">
      {/* 1. Sectors Grid (Horizontal Cards) */}
      <div className="sectors-grid">
        {sectorEntries.map(([key, sector]) => {
          const count = getSectorCount(sector);
          const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);

          return (
            <div key={key} className="sector-card">
              <div className="sector-card-top">
                <div className="sector-title-wrap">
                  <div className="sector-icon-box">
                    {getSectorIcon(key)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text)', display: 'block' }}>
                      {localizedName}
                    </strong>
                    {sector.code && (
                      <span className="mono" style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                        {sector.code}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.74rem',
                    color: 'var(--rose)',
                    borderColor: 'rgba(244, 63, 94, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDeleteSector(key);
                  }}
                  title={t('dashboard.deleteSectorTitle', { name: localizedName })}
                >
                  <Trash2 size={13} />
                  <span>{t('dashboard.delete')}</span>
                </button>
              </div>

              <div style={{
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--emerald)' }}>
                  {count} {count === 1 ? 'API' : 'APIs'}
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => onSelectSector(key)}
                >
                  <span>{t('dashboard.explore')}</span>
                  {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Add New Sector Card (Dashed Border) */}
      <div className="sector-add-card" onClick={onOpenAddSector}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--emerald)',
          marginBottom: '0.35rem'
        }}>
          <Plus size={20} />
        </div>
        <strong style={{ fontSize: '0.92rem', color: 'var(--emerald)', display: 'block' }}>
          {t('dashboard.addNewSectorCardTitle')}
        </strong>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
          {t('dashboard.addNewSectorCardSub')}
        </span>
      </div>
    </div>
  );
};
