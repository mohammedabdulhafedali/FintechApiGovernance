import React from 'react';
import { ShieldCheck, GitPullRequest, FileDown, Lock, Server, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentVersion: string;
  onVersionChange: (version: string) => void;
  pendingCrCount: number;
  onOpenCrModal: () => void;
  onOpenExportModal: () => void;
  onOpenRbacModal: () => void;
  onOpenMockModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentVersion,
  onVersionChange,
  pendingCrCount,
  onOpenCrModal,
  onOpenExportModal,
  onOpenRbacModal,
  onOpenMockModal
}) => {
  return (
    <header className="glass-panel" style={{
      borderBottom: '1px solid var(--border)',
      padding: '0.75rem 1.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.2))',
          border: '1px solid var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--emerald)'
        }}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              المنظومة المؤسسية لحوكمة وتوثيق الـ APIs
            </h1>
            <span className="badge-pill badge-emerald" style={{ fontSize: '0.7rem' }}>
              Platform 1: Sovereign Spec
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            المرجع السيادي المعتمد لمواصفات التكامل والختم الرقمي المشفر
          </p>
        </div>
      </div>

      {/* Global Release Baseline & Action Ribbons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Baseline Release Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-input)',
          padding: '0.35rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            خط الأساس المعماري:
          </span>
          <select
            value={currentVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--blue)',
              fontFamily: 'var(--font-latin)',
              fontWeight: 700,
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="v2026.2" style={{ background: '#0a1426', color: '#fff' }}>v2026.2 (معتمد رسمي)</option>
            <option value="v2026.1" style={{ background: '#0a1426', color: '#fff' }}>v2026.1 (سابق)</option>
            <option value="v2027.0-draft" style={{ background: '#0a1426', color: '#fff' }}>v2027.0 (مسودة ترقية)</option>
          </select>
        </div>

        {/* Change Requests Button */}
        <button
          className="btn btn-glass"
          onClick={onOpenCrModal}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <GitPullRequest size={16} color="var(--amber)" />
          <span>طلبات التغيير</span>
          {pendingCrCount > 0 && (
            <span className="badge-pill badge-amber" style={{ padding: '0.1rem 0.4rem', fontSize: '0.68rem' }}>
              {pendingCrCount}
            </span>
          )}
        </button>

        {/* Mock Server Button */}
        <button
          className="btn btn-glass"
          onClick={onOpenMockModal}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <Server size={16} color="var(--cyan)" />
          <span>خادم المحاكاة</span>
        </button>

        {/* RBAC Button */}
        <button
          className="btn btn-glass"
          onClick={onOpenRbacModal}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <Lock size={16} color="var(--purple)" />
          <span>الصلاحيات</span>
        </button>

        {/* Export Studio Button */}
        <button
          className="btn btn-emerald"
          onClick={onOpenExportModal}
          style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
        >
          <FileDown size={16} />
          <span>استوديو التصدير والختم</span>
        </button>
      </div>
    </header>
  );
};
