import React, { useState } from 'react';
import { 
  Building2, 
  Store, 
  ShieldAlert, 
  Scale, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Check, 
  X, 
  ShieldPlus
} from 'lucide-react';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface DashboardViewProps {
  sectors: Record<string, Sector>;
  onSelectSector: (sectorKey: string) => void;
  onAddSector: (newSector: Sector) => void;
  onOpenDeleteSector: (sectorKey: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sectors,
  onSelectSector,
  onAddSector,
  onOpenDeleteSector
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  // Inline Sector Creation State (Screen Sovereignty - Zero Modals)
  const [isAdding, setIsAdding] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('SECTOR_FIN_');

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

  const handleCreateSectorInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    const generatedKey = (nameEn.trim() || nameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `sector_${Date.now()}`;

    const newSector: Sector = {
      key: generatedKey,
      name: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      code: code.trim().toUpperCase() || 'SECTOR_FIN_CUSTOM',
      icon: 'Building2',
      services: {
        core: {
          title: 'الخدمات الأساسية',
          titleEn: 'Core Services',
          code: 'CORE',
          baseUrl: 'https://api.gov.fintech',
          versions: ['v2026.2'],
          endpoints: []
        }
      }
    };

    onAddSector(newSector);
    setNameAr('');
    setNameEn('');
    setCode('SECTOR_FIN_');
    setIsAdding(false);
  };

  const sectorEntries = Object.entries(sectors);

  return (
    <div className="dashboard-container">
      {/* 1. Sectors Grid (Sovereign Cards Grid) */}
      <div className="sectors-grid">
        {sectorEntries.map(([key, sector]) => {
          const count = getSectorCount(sector);
          const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);

          return (
            <div key={key} className="sector-card">
              <div className="sector-card-top">
                <strong style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 700 }}>
                  {localizedName}
                </strong>
                <div className="sector-icon-box">
                  {getSectorIcon(key)}
                </div>
              </div>

              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => onSelectSector(key)}
                >
                  <span>{t('dashboard.explore')}</span>
                  {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                </button>
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--emerald)' }}>
                  {count} {count === 1 ? 'API' : 'APIs'}
                </span>
              </div>
            </div>
          );
        })}

        {/* 2. Inline Creation Card OR Dashed Action Card (Screen Sovereignty - Zero Modals) */}
        {isAdding ? (
          <form className="sector-card sector-inline-form-card" onSubmit={handleCreateSectorInline}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <ShieldPlus size={18} style={{ color: 'var(--emerald)' }} />
              <strong style={{ fontSize: '0.90rem', color: '#ffffff' }}>
                {t('modals.addSectorTitle')}
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <input
                type="text"
                className="input"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                placeholder={t('modals.sectorNameArPlaceholder')}
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                autoFocus
                required
              />
              <input
                type="text"
                className="input"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem', direction: 'ltr' }}
                placeholder={t('modals.sectorNameEnPlaceholder')}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
              <input
                type="text"
                className="input mono"
                style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem', direction: 'ltr' }}
                placeholder={t('modals.sectorCodePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
              <button type="submit" className="btn btn-emerald" style={{ flex: 1, padding: '0.4rem', fontSize: '0.78rem' }}>
                <Check size={14} />
                <span>{t('modals.confirmAddSectorBtn')}</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                onClick={() => setIsAdding(false)}
              >
                <X size={14} />
                <span>{t('modals.cancelBtn')}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="sector-add-card" onClick={() => setIsAdding(true)}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald)',
              marginBottom: '0.35rem'
            }}>
              <Plus size={20} />
            </div>
            <strong style={{ fontSize: '0.90rem', color: 'var(--emerald)', display: 'block' }}>
              {t('dashboard.addNewSectorCardTitle')}
            </strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
              {t('dashboard.addNewSectorCardSub')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
