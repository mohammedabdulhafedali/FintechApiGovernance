import React, { useState } from 'react';
import { RBACRole } from '../../types/schema';
import { Lock, ShieldCheck, Check, Save } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface RBACViewProps {
  roles: RBACRole[];
  onUpdateRolePermissions: (roleId: string, action: string, granted: boolean) => void;
  onNotify: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const RBACView: React.FC<RBACViewProps> = ({
  roles,
  onUpdateRolePermissions,
  onNotify
}) => {
  const { t, language, isRtl } = useLanguage();
  const isEn = language === 'en';

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'role_admin');
  const activeRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const permissionsList = isEn ? [
    { key: 'view', label: 'View Specifications (View Spec)', desc: 'Read API documentation, schemas, and governance validation rules' },
    { key: 'create', label: 'Create New Specification (Create Spec)', desc: 'Add new financial services and endpoints into central catalog' },
    { key: 'edit', label: 'Edit Draft Specification (Edit Draft)', desc: 'Modify attributes, types, and descriptions for uncertified drafts' },
    { key: 'delete', label: 'Delete Draft (Delete Draft)', desc: 'Cancel or remove temporary draft routes before submission' },
    { key: 'execute', label: 'Execute Mock Server (Execute Mock)', desc: 'Send test requests to embedded sandbox and evaluate responses' },
    { key: 'approve', label: 'Approve Change Request (Approve CR)', desc: 'Digitally endorse and sign as member of multi-signature vault' },
    { key: 'export', label: 'Export & Release Seal (Export & Seal)', desc: 'Issue sovereign KMS digital seal and export official deliverables' }
  ] : [
    { key: 'view', label: 'استعراض المواصفات (View Spec)', desc: 'قراءة وثائق الـ API، المخططات، وقواعد العمل' },
    { key: 'create', label: 'إنشاء مواصفة جديدة (Create Spec)', desc: 'إضافة خدمات ومسارات جديدة في الكتالوج' },
    { key: 'edit', label: 'تعديل المسودة (Edit Draft)', desc: 'تعديل الحقول والأنواع والشروحات للمسودات غير المنشورة' },
    { key: 'delete', label: 'حذف مسودة (Delete Draft)', desc: 'إلغاء أو حذف المسودة المؤقتة قبل تقديمها للاعتماد' },
    { key: 'execute', label: 'تشغيل المحاكاة (Execute Mock)', desc: 'إرسال طلبات اختبارية لخادم المحاكاة وتوليد استجابات' },
    { key: 'approve', label: 'اعتماد طلب التغيير (Approve CR)', desc: 'المصادقة والتوقيع الرقمي كعضو في الخزينة متعددة التواقيع' },
    { key: 'export', label: 'تصدير وختم الإصدار (Export & Seal)', desc: 'إطلاق الختم الرقمي السيادي وتصدير العقود الرسمية' }
  ];

  const handleSavePermissions = () => {
    onNotify(
      t('rbac.savedTitle'),
      isEn 
        ? `Role permissions [${activeRole.name}] committed successfully to regulatory engine.`
        : `تم حفظ وتثبيت أذونات الدور [${activeRole.name}] بنجاح في المنظومة الرقابية`,
      'success'
    );
  };

  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <div className="dedicated-view-layout">
      {/* Header */}
      <div className="dedicated-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'rgba(168, 85, 247, 0.15)',
            color: 'var(--purple)',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {t('rbac.pageTitle')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {t('rbac.pageSubtitle')}
            </p>
          </div>
        </div>

        <button className="btn btn-emerald" onClick={handleSavePermissions}>
          <Save size={16} />
          <span>{t('rbac.savePermissions')}</span>
        </button>
      </div>

      {/* Main Split Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem' }}>
        {/* Roles Sidebar */}
        <div className="dedicated-view-body" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
            {t('rbac.rolesListTitle')}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {roles.map((r) => {
              const isSelected = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'linear-gradient(135deg, #4338ca, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    ...alignStyle,
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem', display: 'block' }}>{r.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-dim)' }}>
                      {isEn ? 'Level:' : 'المستوى:'} {r.level || 'L1'}
                    </span>
                  </div>
                  {isSelected && <ShieldCheck size={18} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="dedicated-view-body">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.75rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {t('rbac.permissionsMatrixTitle', { role: activeRole.name })}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {activeRole.desc || activeRole.description}
              </p>
            </div>
            <span className="badge-pill badge-purple">
              Level {activeRole.level || 'L1'} Authorization
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {permissionsList.map((perm) => {
              const isGranted = !!activeRole.permissions[perm.key];

              return (
                <div
                  key={perm.key}
                  onClick={() => onUpdateRolePermissions(activeRole.id, perm.key, !isGranted)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isGranted ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    border: isGranted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div style={alignStyle}>
                    <strong style={{ fontSize: '0.88rem', color: isGranted ? 'var(--text)' : 'var(--text-dim)' }}>
                      {perm.label}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {perm.desc}
                    </div>
                  </div>

                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-xs)',
                    background: isGranted ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {isGranted && <Check size={16} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
