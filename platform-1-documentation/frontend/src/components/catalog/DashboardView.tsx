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
  Layers,
  Receipt,
  BellRing,
  Cpu,
  CheckCircle2,
  FolderGit2
} from 'lucide-react';
import { SystemModule, Sector, SystemIntegration } from '../../types/schema';
import { useLanguage } from '../../i18n';
import { Can } from '../auth/Can';
import { useAuth } from '../auth/AuthContext';

interface DashboardViewProps {
  systems: Record<string, SystemModule>;
  onSelectSystemIntegration: (systemKey: string, integrationKey: string) => void;
  onAddSystem: (newSystem: SystemModule) => void;
  onDeleteSystem?: (systemKey: string) => void;
  // Backward compatibility
  sectors?: Record<string, Sector>;
  onSelectSector?: (sectorKey: string) => void;
  onAddSector?: (newSector: Sector) => void;
  onOpenDeleteSector?: (sectorKey: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  systems,
  onSelectSystemIntegration,
  onAddSystem,
  onDeleteSystem
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  // Inline System Creation State
  const [isAdding, setIsAdding] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('SYS_');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Layers');
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(['banking', 'merchants']);

  const availableIcons = [
    { name: 'Layers', label: isRtl ? 'تحصيل' : 'Tahseel', icon: <Layers size={16} /> },
    { name: 'Receipt', label: isRtl ? 'تنترة' : 'Tantara', icon: <Receipt size={16} /> },
    { name: 'Globe', label: isRtl ? 'المجمع' : 'Aggregator', icon: <Globe size={16} /> },
    { name: 'BellRing', label: isRtl ? 'إشعارات' : 'Notifications', icon: <BellRing size={16} /> },
    { name: 'ShieldAlert', label: isRtl ? 'امتثال / حماية' : 'Compliance', icon: <ShieldAlert size={16} /> },
    { name: 'Scale', label: isRtl ? 'تسوية / ERP' : 'Settlement', icon: <Scale size={16} /> },
  ];

  const defaultIntegrationOptions = [
    { id: 'banking', nameAr: 'البنوك والمصارف', nameEn: 'Banks', icon: 'Building2' },
    { id: 'merchants', nameAr: 'المتاجر ونقاط البيع', nameEn: 'Merchants', icon: 'Store' },
    { id: 'erp', nameAr: 'أنظمة ERP والمحاسبة', nameEn: 'ERP Systems', icon: 'Scale' },
    { id: 'aml', nameAr: 'مكافحة غسل الأموال (AML)', nameEn: 'Anti-Money Laundering (AML)', icon: 'ShieldAlert' },
    { id: 'regulatory', nameAr: 'الهيئات الرقابية', nameEn: 'Regulatory', icon: 'ShieldAlert' }
  ];

  const getSystemIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layers': return <Layers size={22} style={{ color: '#38bdf8' }} />;
      case 'Receipt': return <Receipt size={22} style={{ color: '#34d399' }} />;
      case 'BellRing': return <BellRing size={22} style={{ color: '#f59e0b' }} />;
      case 'ShieldAlert':
      case 'ShieldCheck': return <ShieldAlert size={22} style={{ color: '#f43f5e' }} />;
      case 'Scale': return <Scale size={22} style={{ color: '#a855f7' }} />;
      case 'Globe': return <Globe size={22} style={{ color: '#06b6d4' }} />;
      default: return <Layers size={22} style={{ color: '#38bdf8' }} />;
    }
  };

  const getIntegrationBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Building2': return <Building2 size={13} style={{ color: '#38bdf8' }} />;
      case 'Store': return <Store size={13} style={{ color: '#34d399' }} />;
      case 'Scale': return <Scale size={13} style={{ color: '#a855f7' }} />;
      case 'ShieldAlert': return <ShieldAlert size={13} style={{ color: '#f59e0b' }} />;
      default: return <Building2 size={13} style={{ color: '#38bdf8' }} />;
    }
  };

  const toggleIntegrationSelect = (id: string) => {
    setSelectedIntegrations(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateSystemInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    const generatedKey = (nameEn.trim() || nameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `sys_${Date.now()}`;

    // Build initial integrations
    const builtIntegrations: Record<string, SystemIntegration> = {};
    selectedIntegrations.forEach(intId => {
      const opt = defaultIntegrationOptions.find(o => o.id === intId);
      if (opt) {
        builtIntegrations[intId] = {
          entityId: intId,
          name: opt.nameAr,
          nameEn: opt.nameEn,
          code: `INT_${intId.toUpperCase()}`,
          icon: opt.icon,
          direction: 'BIDIRECTIONAL',
          endpoints: []
        };
      }
    });

    const newSystem: SystemModule = {
      key: generatedKey,
      name: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      code: code.trim().toUpperCase() || `SYS_${generatedKey.toUpperCase()}`,
      icon: selectedIcon,
      description: description.trim() || (isRtl ? 'نظام مالي معتمد' : 'Certified financial system'),
      descriptionEn: nameEn.trim() || nameAr.trim(),
      status: 'ACTIVE',
      associatedSectorKeys: selectedIntegrations,
      integrations: builtIntegrations
    };

    onAddSystem(newSystem);
    setNameAr('');
    setNameEn('');
    setCode('SYS_');
    setDescription('');
    setSelectedIcon('Layers');
    setSelectedIntegrations(['banking', 'merchants']);
    setIsAdding(false);
  };

  const { canAccess } = useAuth();

  const systemEntries = Object.entries(systems).filter(([sysKey]) => {
    return canAccess('catalog:view', { systemId: sysKey });
  });

  return (
    <div className="dashboard-container">
      {/* 1. Header Overview Stats */}
      <div className="dashboard-stats-strip" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: 'var(--blue)',
            padding: '0.65rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600 }}>
              {isRtl ? 'إجمالي الأنظمة المركزية' : 'Total Core Systems'}
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800 }}>
              {systemEntries.length}
            </strong>
          </div>
        </div>

        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--emerald)',
            padding: '0.65rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex'
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600 }}>
              {isRtl ? 'روابط التكامل النشطة' : 'Active Integrations'}
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800 }}>
              {systemEntries.reduce((acc, [, s]) => acc + Object.keys(s.integrations || {}).length, 0)}
            </strong>
          </div>
        </div>

        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            background: 'rgba(168, 85, 247, 0.15)',
            color: 'var(--purple)',
            padding: '0.65rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex'
          }}>
            <Receipt size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600 }}>
              {isRtl ? 'إجمالي مسارات الـ API' : 'Total API Endpoints'}
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800 }}>
              {systemEntries.reduce((acc, [, s]) => {
                const totalInSys = Object.values(s.integrations || {}).reduce(
                  (sAcc, intItem) => sAcc + (intItem.endpoints ? intItem.endpoints.length : 0), 0
                );
                return acc + totalInSys;
              }, 0)}
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Systems Grid (عرض الأنظمة وتكاملاتها بدلاً من الجهات) */}
      <div className="sectors-grid">
        {systemEntries.map(([sysKey, sys]) => {
          const localizedName = getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name);
          const rawIntegrations = sys.integrations ? Object.entries(sys.integrations) : [];
          // Filter integrations by sovereign scope
          const integrationsList = rawIntegrations.filter(([intKey, intItem]) => {
            return canAccess('catalog:view', {
              entityId: intItem.entityId || intKey,
              systemId: sysKey
            });
          });
          const totalSysEndpoints = integrationsList.reduce(
            (sum, [, intItem]) => sum + (intItem.endpoints ? intItem.endpoints.length : 0),
            0
          );
          const firstIntKey = integrationsList[0]?.[0] || 'banking';

          return (
            <div key={sysKey} className="sector-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Card Top: Icon + Name + Code + Status */}
              <div className="sector-card-top" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div className="sector-icon-box" style={{ marginTop: '0.15rem' }}>
                  {getSystemIcon(sys.icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>
                      {localizedName}
                    </strong>
                    <span style={{
                      fontSize: '0.62rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: 'var(--blue)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {sys.code}
                    </span>
                  </div>

                </div>
              </div>

              {/* Integrations Section: Showing entities it integrates with */}
              {integrationsList.length > 0 && (
                <div style={{
                  margin: '0.85rem 0',
                  padding: '0.65rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.18)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {integrationsList.map(([intKey, integration]) => {
                    const intName = getLocalized({ ar: integration.name, en: integration.nameEn }, integration.name);
                    const epCount = integration.endpoints ? integration.endpoints.length : 0;

                    return (
                      <button
                        key={intKey}
                        type="button"
                        onClick={() => onSelectSystemIntegration(sysKey, intKey)}
                        className="dashboard-int-badge"
                        title={isRtl ? `استعراض تكامل ${intName}` : `Explore ${intName} integration`}
                      >
                        <span>{intName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

              {/* Card Footer: Explore & Total Count */}
              <div className="sector-card-footer" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <button
                  className="btn-sector-explore"
                  onClick={() => onSelectSystemIntegration(sysKey, firstIntKey)}
                  title={isRtl ? 'استعراض توثيق النظام' : 'Explore System Documentation'}
                >
                  <span>{isRtl ? 'استعراض توثيق النظام' : 'Explore System Docs'}</span>
                  {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                </button>

              </div>
            </div>
          );
        })}

        {/* 3. Inline System Creation Card (Totally Hidden if no permission) */}
        <Can perform="catalog:system:create">
          {isAdding ? (
            <form className="sector-card sector-inline-form-card" onSubmit={handleCreateSystemInline}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldPlus size={18} style={{ color: 'var(--emerald)' }} />
                <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>
                  {isRtl ? 'إضافة نظام برمجي جديد' : 'Add New Core System'}
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                  placeholder={isRtl ? 'اسم النظام بالعربية (مثلاً: نظام المقاصة)' : 'System Name (Arabic)'}
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  autoFocus
                  required
                />
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem', direction: 'ltr' }}
                  placeholder={isRtl ? 'اسم النظام بالإنجليزية (e.g. Clearing System)' : 'System Name (English)'}
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
                <input
                  type="text"
                  className="input mono"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem', direction: 'ltr' }}
                  placeholder="SYS_CLEARING"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <textarea
                  className="input"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem', minHeight: '50px', resize: 'vertical' }}
                  placeholder={isRtl ? 'وصف مختصر لمهام النظام ومسؤولياته...' : 'System description and responsibilities...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                {/* Icon Selector */}
                <div style={{ marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
                    {isRtl ? 'أيقونة النظام:' : 'System Icon:'}
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

                {/* Initial Integrations Selector */}
                <div style={{ marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
                    {isRtl ? 'الجهات التي يتكامل معها هذا النظام:' : 'Integrated Entities:'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {defaultIntegrationOptions.map(opt => {
                      const isSelected = selectedIntegrations.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleIntegrationSelect(opt.id)}
                          style={{
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            border: isSelected ? '1px solid var(--blue)' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(56, 189, 248, 0.20)' : 'transparent',
                            color: isSelected ? '#ffffff' : 'var(--text-dim)',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected && <Check size={11} style={{ display: 'inline', marginInlineEnd: '3px' }} />}
                          <span>{isRtl ? opt.nameAr : opt.nameEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button type="submit" className="btn btn-emerald" style={{ flex: 1, padding: '0.4rem', fontSize: '0.78rem' }}>
                  <Check size={14} />
                  <span>{isRtl ? 'تأكيد إضافة النظام' : 'Confirm Add System'}</span>
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
                {isRtl ? '+ إضافة نظام مركزي جديد' : '+ Add New Core System'}
              </strong>
              <span className="sector-add-sub">
                {isRtl ? 'تسجيل نظام مالي جديد (تحصيل، تنترة، المجمع) مع ربط تكاملاته' : 'Register a new financial system (Tahseel, Tantara, Aggregator)'}
              </span>
            </div>
          )}
        </Can>
      </div>
    </div>
  );
};
