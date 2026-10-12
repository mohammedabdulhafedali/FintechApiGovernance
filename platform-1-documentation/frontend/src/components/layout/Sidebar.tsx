import React, { useState } from 'react';
import { Sector } from '../../types/schema';
import { Search, Building2, Store, ShieldAlert, Scale, ChevronLeft, Layers, Plus } from 'lucide-react';

interface SidebarProps {
  sectors: Record<string, Sector>;
  activeSectorKey: string;
  onSelectSector: (key: string) => void;
  onAddNewApi: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sectors,
  activeSectorKey,
  onSelectSector,
  onAddNewApi
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getSectorIcon = (key: string) => {
    switch (key) {
      case 'banking': return <Building2 size={18} />;
      case 'merchants': return <Store size={18} />;
      case 'aml': return <ShieldAlert size={18} />;
      case 'settlement': return <Scale size={18} />;
      default: return <Layers size={18} />;
    }
  };

  const filteredSectors = Object.values(sectors).filter(s =>
    s.name.includes(searchQuery) || s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside style={{
      width: '280px',
      borderLeft: '1px solid var(--border)',
      background: 'rgba(8, 16, 32, 0.95)',
      backdropFilter: 'var(--glass-blur)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 65px)',
      position: 'sticky',
      top: '65px'
    }}>
      {/* Search Bar */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-input)',
          padding: '0.45rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في القطاعات والجهات..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontFamily: 'var(--font-arabic)',
              fontSize: '0.82rem',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Sectors Header */}
      <div style={{
        padding: '0.75rem 1rem 0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          كتالوج القطاعات المؤسسية
        </span>
        <span className="badge-pill badge-blue" style={{ fontSize: '0.65rem' }}>
          {filteredSectors.length} قطاعات
        </span>
      </div>

      {/* Sectors List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {filteredSectors.map((sector) => {
          const isActive = sector.key === activeSectorKey;
          const totalEndpoints = Object.values(sector.services).reduce(
            (acc, srv) => acc + srv.endpoints.length, 0
          );

          return (
            <div
              key={sector.key}
              onClick={() => onSelectSector(sector.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.35rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.08))' : 'transparent',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  color: isActive ? 'var(--blue)' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {getSectorIcon(sector.key)}
                </div>
                <div>
                  <div style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: isActive ? '#ffffff' : 'var(--text)'
                  }}>
                    {sector.name}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-latin)'
                  }}>
                    {totalEndpoints} APIs مسجلة
                  </div>
                </div>
              </div>
              <ChevronLeft size={16} color={isActive ? 'var(--blue)' : 'var(--text-dim)'} />
            </div>
          );
        })}
      </div>

      {/* Bottom Action: Add New Custom API */}
      <div style={{ padding: '0.85rem', borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-glass"
          onClick={onAddNewApi}
          style={{ width: '100%', fontSize: '0.82rem', justifyContent: 'center' }}
        >
          <Plus size={16} color="var(--emerald)" />
          <span>+ إضافة مواصفة API جديدة</span>
        </button>
      </div>
    </aside>
  );
};
