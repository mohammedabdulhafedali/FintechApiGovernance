import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Shield,
  Layers,
  Building,
  Check,
  Info
} from 'lucide-react';
import { UserGroup } from '../../types/auth';
import { iamService } from '../../services/iamService';
import { useLanguage } from '../../i18n';

interface CreateUserViewProps {
  groups: UserGroup[];
  onSuccess: (newUser?: any) => void;
  onCancel: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const CreateUserView: React.FC<CreateUserViewProps> = ({
  groups,
  onSuccess,
  onCancel,
  onNotify
}) => {
  const { isRtl } = useLanguage();

  // Basic Information State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome@2026');

  // Organization & Entity Information (General Optional Metadata)
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSector, setOrganizationSector] = useState('banking');

  // Dynamic Multi-Group Selection (Permission Templates)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    groups.length > 0 ? [groups[0].id] : []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle group selection (Multi-group support)
  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      if (prev.includes(groupId)) {
        // Keep at least one group if desired, or allow toggling
        if (prev.length === 1) {
          if (onNotify) {
            onNotify(
              isRtl ? 'تنبيه' : 'Notice',
              isRtl ? 'يجب أن ينتمي المستخدم إلى مجموعة صلاحيات واحدة على الأقل' : 'User must belong to at least one group',
              'warning'
            );
          }
          return prev;
        }
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  // Calculate Cumulative Effective Permissions (Union of all selected groups)
  const effectivePermissionData = useMemo(() => {
    const selectedGroups = groups.filter((g) => selectedGroupIds.includes(g.id));
    const allPermissions = new Set<string>();
    let hasSuperAdmin = false;

    selectedGroups.forEach((g) => {
      if ((g.permissions || []).includes('*')) {
        hasSuperAdmin = true;
      }
      (g.permissions || []).forEach((p) => allPermissions.add(p));
    });

    return {
      selectedGroups,
      hasSuperAdmin,
      permissionsList: Array.from(allPermissions),
      totalCount: hasSuperAdmin ? 'شامل (*)' : allPermissions.size
    };
  }, [groups, selectedGroupIds]);

  // Helper: Generate Secure Password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    if (onNotify) {
      onNotify('كلمة مرور جديدة', 'تم توليد كلمة مرور مبدئية قوية', 'info');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !fullName.trim()) {
      if (onNotify) {
        onNotify('بيانات ناقصة', 'يرجى استكمال الحقول الأساسية المطلوبة', 'warning');
      }
      return;
    }

    if (selectedGroupIds.length === 0) {
      if (onNotify) {
        onNotify('مجموعة الصلاحيات', 'يرجى تحديد مجموعة صلاحيات واحدة على الأقل للمستخدم', 'warning');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await iamService.createUser({
        username: username.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        password: password || 'Welcome@2026',
        groupId: selectedGroupIds[0],
        groupIds: selectedGroupIds,
        organizationName: organizationName.trim() || undefined,
        organizationId: organizationSector || undefined,
        accessScope: {
          allowedEntityIds: ['*'],
          allowedSystemIds: ['*']
        }
      });

      if (onNotify) {
        onNotify(
          'تم الحفظ',
          `تم إنشاء المستخدم (${fullName}) بنجاح مع ربطه بـ (${selectedGroupIds.length}) قوالب صلاحيات`,
          'success'
        );
      }
      onSuccess(created);
    } catch (err: any) {
      if (onNotify) {
        onNotify('فشل التسجيل', err.message || 'حدث خطأ أثناء حفظ المستخدم', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'var(--bg-input, #1e293b)',
    color: 'var(--text-main, #ffffff)',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* ── 1. UNIFIED HEADER ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '0.9rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} style={{ color: '#3b82f6' }} />
            <span>{isRtl ? 'إضافة مستخدم جديد وقوالب الصلاحيات' : 'Add New User & Assign Roles'}</span>
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            {isRtl
              ? 'نموذج موحد لإدارة هوية المستخدم، وربطه بمجموعة أو عدة مجموعات صلاحيات تراكمية'
              : 'Unified user identity management with cumulative multi-group role templates'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '0.4rem 0.8rem',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
          <span>{isRtl ? 'رجوع' : 'Back'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

          {/* ── 2. BASIC USER IDENTITY ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem'
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                {isRtl ? 'الاسم الكامل *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRtl ? 'مثال: محمد عبد الحافظ' : 'e.g. Mohamed Abdulhafed'}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                {isRtl ? 'اسم المستخدم (للدخول) *' : 'Username *'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mohamed.ali"
                dir="ltr"
                style={{ ...inputStyle, textAlign: isRtl ? 'right' : 'left' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                {isRtl ? 'البريد الإلكتروني *' : 'Email Address *'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mohamed@example.com"
                dir="ltr"
                style={{ ...inputStyle, textAlign: isRtl ? 'right' : 'left' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                  {isRtl ? 'كلمة المرور *' : 'Password *'}
                </label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  <Sparkles size={12} />
                  <span>{isRtl ? 'توليد كلمة مرور' : 'Generate'}</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                style={{ ...inputStyle, fontFamily: 'monospace', textAlign: isRtl ? 'right' : 'left' }}
              />
            </div>
          </div>

          {/* ── 3. GENERAL ORGANIZATION / ENTITY (OPTIONAL METADATA) ── */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem'
            }}
          >
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#cbd5e1' }}>
                <Building size={14} style={{ color: '#38bdf8' }} />
                <span>{isRtl ? 'الجهة / المؤسسة / الإدارة التابع لها (اختياري)' : 'Organization / Department (Optional)'}</span>
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder={isRtl ? 'مثال: بنك اليمن والكويت، أو إدارة تقنية المعلومات الداخلية' : 'e.g. Bank of Yemen & Kuwait, or Internal IT Dept'}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#cbd5e1' }}>
                {isRtl ? 'القطاع / مجال العمل' : 'Sector / Business Domain'}
              </label>
              <select
                value={organizationSector}
                onChange={(e) => setOrganizationSector(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600 }}
              >
                <option value="internal">{isRtl ? 'المنظومة الداخلية وفريق العمل' : 'Internal Platform & Team'}</option>
                <option value="banking">{isRtl ? 'قطاع البنوك والمصارف (Banking)' : 'Banking Sector'}</option>
                <option value="merchants">{isRtl ? 'شبكة التجار وبوابات الدفع (Fintech & Merchants)' : 'Merchants & Payments'}</option>
                <option value="regulatory">{isRtl ? 'الهيئات الرقابية والتدقيق (Regulatory & Audit)' : 'Regulatory & Audit'}</option>
                <option value="telecom">{isRtl ? 'شركات الاتصالات ومزودي الخدمات' : 'Telecom & Service Providers'}</option>
              </select>
            </div>
          </div>

          {/* ── 4. DYNAMIC MULTI-GROUP SELECTION (PERMISSION TEMPLATES) ── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={16} style={{ color: '#a855f7' }} />
                  <span>{isRtl ? 'مجموعات المستخدم وقوالب الصلاحيات (User Groups / Roles)' : 'User Groups & Role Templates'}</span>
                  <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>
                    {selectedGroupIds.length} {isRtl ? 'مختارة' : 'selected'}
                  </span>
                </label>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  {isRtl
                    ? 'يمكن اختيار أكثر من مجموعة، وسيرث المستخدم تلقائياً حاصل جمع صلاحيات المجموعات المحددة'
                    : 'Select one or more groups. The user automatically receives the cumulative union of all permissions.'}
                </span>
              </div>
            </div>

            {/* Dynamic Group Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '0.75rem',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '0.3rem'
              }}
            >
              {groups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id);
                const hasAll = (group.permissions || []).includes('*');

                return (
                  <div
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '0.8rem 1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: isSelected ? '#60a5fa' : '#f1f5f9', fontSize: '0.88rem' }}>
                        {group.name}
                      </span>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isSelected ? 'none' : '1.5px solid rgba(255, 255, 255, 0.3)',
                          background: isSelected ? '#3b82f6' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff'
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#94a3b8',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {group.key}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: hasAll ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                          color: hasAll ? '#f87171' : '#34d399',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}
                      >
                        {hasAll ? (isRtl ? 'صلاحيات شاملة (*)' : 'Full Wildcard (*)') : `${group.permissions.length} ${isRtl ? 'صلاحية' : 'permissions'}`}
                      </span>
                    </div>

                    {group.description && (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.3, marginTop: '0.1rem' }}>
                        {group.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 5. LIVE CUMULATIVE PERMISSIONS PREVIEW (UNION DISPLAY) ── */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '0.9rem 1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Info size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
                  {isRtl ? 'ملخص الصلاحيات التراكمية الناتجة (Cumulative Permissions Union):' : 'Effective Permissions Union:'}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>
                {isRtl ? `إجمالي: ${effectivePermissionData.totalCount} صلاحية فريدة` : `Total: ${effectivePermissionData.totalCount} unique permissions`}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '110px', overflowY: 'auto' }}>
              {effectivePermissionData.hasSuperAdmin ? (
                <span
                  style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  * {isRtl ? '(صلاحيات إدارية عليا غير مقيدة لكافة شاشات وموارد المنظومة)' : '(Full unrestricted administrative access)'}
                </span>
              ) : effectivePermissionData.permissionsList.length === 0 ? (
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {isRtl ? 'لا توجد صلاحيات مسندة في المجموعات المحددة' : 'No permissions assigned in selected groups'}
                </span>
              ) : (
                effectivePermissionData.permissionsList.map((perm) => (
                  <span
                    key={perm}
                    style={{
                      padding: '0.18rem 0.5rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#93c5fd',
                      borderRadius: '5px',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    {perm}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* ── 6. ACTIONS & SUBMIT ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.3rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.6rem',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                opacity: isSubmitting ? 0.75 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting
                  ? (isRtl ? 'جاري الحفظ...' : 'Saving...')
                  : (isRtl ? 'حفظ المستخدم وتطبيق القوالب' : 'Save User & Apply Templates')}
              </span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};
