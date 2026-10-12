import React, { useState } from 'react';
import { RBACRole } from '../../types/schema';
import { X, Lock, ShieldCheck, Check, ShieldAlert, Plus, Save } from 'lucide-react';

interface RBACModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: RBACRole[];
  onUpdateRolePermissions: (roleId: string, action: string, granted: boolean) => void;
}

export const RBACModal: React.FC<RBACModalProps> = ({
  isOpen,
  onClose,
  roles,
  onUpdateRolePermissions
}) => {
  if (!isOpen) return null;

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'role_admin');

  const activeRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const permissionsList = [
    { key: 'view', label: 'استعراض المواصفات (View Spec)', desc: 'قراءة وثائق الـ API، المخططات، وقواعد العمل' },
    { key: 'create', label: 'إنشاء مواصفة جديدة (Create Spec)', desc: 'إضافة خدمات ومسارات جديدة في الكتالوج' },
    { key: 'edit', label: 'تعديل المسودة (Edit Draft)', desc: 'تعديل الحقول والأنواع والشروحات للمسودات غير المنشورة' },
    { key: 'delete', label: 'حذف مسودة (Delete Draft)', desc: 'إلغاء أو حذف المسودة المؤقتة قبل تقديمها للاعتماد' },
    { key: 'execute', label: 'تشغيل المحاكاة (Execute Mock)', desc: 'إرسال طلبات اختبارية لخادم المحاكاة وتوليد استجابات' },
    { key: 'approve', label: 'اعتماد طلب التغيير (Approve CR)', desc: 'المصادقة والتوقيع الرقمي كعضو في الخزينة متعددة التواقيع' },
    { key: 'export', label: 'تصدير وختم الإصدار (Export & Seal)', desc: 'إطلاق الختم الرقمي السيادي وتصدير العقود الرسمية' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13, 25, 48, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Lock size={20} color="var(--purple)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                مصفوفة الصلاحيات الديناميكية المعزولة (Decoupled Dynamic RBAC Studio)
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                تحكم فوري وديناميكي في مصفوفة أذونات الموارد لكل دور دون الحاجة لأي تعديل برمجي
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', gap: '1.5rem' }}>
          {/* Roles Selector Column */}
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              الأدوار المعرفة في النظام:
            </span>

            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text)', marginBottom: '0.2rem' }}>
                    {role.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {role.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permissions Matrix Column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'var(--bg-input)',
              padding: '0.85rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>الدور النشط حالياً:</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--purple)' }}>{activeRole.name}</span>
              </div>
              <span className={`badge-pill ${activeRole.badge}`}>
                مخصص للمنصة 1
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                        {perm.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {perm.desc}
                      </div>
                    </div>

                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: 'var(--radius-sm)',
                      background: isGranted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isGranted ? 'var(--emerald)' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isGranted ? 'var(--emerald)' : 'transparent'
                    }}>
                      <Check size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(11, 20, 38, 0.7)'
        }}>
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '0.82rem' }}>
            <Save size={14} />
            <span>حفظ ومزامنة الصلاحيات فوراً</span>
          </button>
        </div>
      </div>
    </div>
  );
};
