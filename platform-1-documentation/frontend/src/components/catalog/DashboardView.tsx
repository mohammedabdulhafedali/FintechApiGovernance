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
  ShieldPlus,
  Coins,
  Wallet,
  Globe,
  PlusCircle
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
  const [selectedIcon, setSelectedIcon] = useState('Building2');

  const availableIcons = [
    { name: 'Building2', label: 'بنك / قطاع', icon: <Building2 size={16} /> },
    { name: 'Store', label: 'متاجر', icon: <Store size={16} /> },
    { name: 'ShieldAlert', label: 'امتثال / حماية', icon: <ShieldAlert size={16} /> },
    { name: 'Scale', label: 'تسوية / مقاصة', icon: <Scale size={16} /> },
    { name: 'Coins', label: 'مدفوعات', icon: <Coins size={16} /> },
    { name: 'Wallet', label: 'محفظة', icon: <Wallet size={16} /> },
    { name: 'Globe', label: 'بوابة دولية', icon: <Globe size={16} /> },
  ];

  const getSectorIcon = (key: string, iconName?: string) => {
    const iconToUse = iconName || key;
    switch (iconToUse) {
      case 'banking':
      case 'Building2': return <Building2 size={20} color="#38bdf8" />;
      case 'merchants':
      case 'Store': return <Store size={20} color="#34d399" />;
      case 'aml':
      case 'ShieldAlert': return <ShieldAlert size={20} color="#f59e0b" />;
      case 'settlement':
      case 'Scale': return <Scale size={20} color="#a855f7" />;
      case 'coins':
      case 'Coins': return <Coins size={20} color="#facc15" />;
      case 'wallet':
      case 'Wallet': return <Wallet size={20} color="#ec4899" />;
      case 'globe':
      case 'Globe': return <Globe size={20} color="#06b6d4" />;
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
      icon: selectedIcon,
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
    setSelectedIcon('Building2');
    setIsAdding(false);
  };

  const sectorEntries = Object.entries(sectors);

  return (
    <div className="dashboard-container">
      {/* 1. Sectors Grid (Sovereign Cards Grid - Image 1) */}
      <div className="sectors-grid">
        {sectorEntries.map(([key, sector]) => {
          const count = getSectorCount(sector);
          const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);

          return (
            <div key={key} className="sector-card">
              <div className="sector-card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="sector-icon-box">
                  {getSectorIcon(key, sector.icon)}
                </div>
                <strong style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: 700 }}>
                  {localizedName}
                </strong>
              </div>

              <div className="sector-card-footer">
                <button
                  className="btn-sector-explore"
                  onClick={() => onSelectSector(key)}
                  title={t('dashboard.explore')}
                >
                  <span>{isRtl ? 'استعراض' : 'Explore'}</span>
                  {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                </button>
                <span className="sector-count-badge">
                  APIs {count}
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

              {/* Icon Selector */}
              <div style={{ marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
                  {isRtl ? 'أيقونة القطاع:' : 'Sector Icon:'}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {availableIcons.map(ico => (
                    <button
                      key={ico.name}
                      type="button"
                      className={`btn-slim-action ${selectedIcon === ico.name ? 'active' : ''}`}
                      style={{
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.75rem',
                        borderColor: selectedIcon === ico.name ? 'var(--emerald)' : 'var(--border)',
                        background: selectedIcon === ico.name ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: selectedIcon === ico.name ? 'var(--emerald)' : 'var(--text-dim)'
                      }}
                      onClick={() => setSelectedIcon(ico.name)}
                      title={ico.label}
                    >
                      {ico.icon}
                    </button>
                  ))}
                </div>
              </div>
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
            <div className="sector-add-icon-circle">
              <Plus size={18} />
            </div>
            <strong className="sector-add-title">
              {isRtl ? '+ إضافة جهة / شريك مالي جديد' : '+ Add New Financial Sector / Partner'}
            </strong>
            <span className="sector-add-sub">
              {isRtl ? 'تسجيل هيئة أو مصرف أو قطاع مالي جديد' : 'Register a new authority, bank, or financial sector'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
