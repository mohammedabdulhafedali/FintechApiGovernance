import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { UserGroup, UserType } from '../../types/auth';
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

  // Form State
  const [userType, setUserType] = useState<UserType>('INTERNAL');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome@2026');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');

  // External Scoped State
  const [organizationId, setOrganizationId] = useState('banking');
  const [organizationName, setOrganizationName] = useState('بنك اليمن والكويت');
  const [allowedSystems, setAllowedSystems] = useState<string[]>(['collection']);
  const [allowedEntities, setAllowedEntities] = useState<string[]>(['banking']);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!username.trim() || !email.trim() || !fullName.trim() || !selectedGroupId) {
      if (onNotify) {
        onNotify('بيانات ناقصة', 'يرجى استكمال جميع الحقول الإلزامية قبل المتابعة', 'warning');
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
        groupId: selectedGroupId,
        userType: userType,
        organizationId: userType === 'EXTERNAL' ? organizationId : undefined,
        organizationName: userType === 'EXTERNAL' ? organizationName.trim() : undefined,
        accessScope: userType === 'EXTERNAL' ? {
          allowedEntityIds: allowedEntities,
          allowedSystemIds: allowedSystems
        } : {
          allowedEntityIds: ['*'],
          allowedSystemIds: ['*']
        }
      });

      if (onNotify) {
        onNotify('تم الحفظ', `تم إنشاء المستخدم (${fullName}) بنجاح`, 'success');
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
        maxWidth: '820px',
        margin: '0 auto',
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* ── 1. COMPACT HEADER & ACCOUNT TYPE TABS ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>
            {isRtl ? 'إضافة مستخدم جديد' : 'Add New User'}
          </h2>

          {/* Segmented Account Type Tabs */}
          <div
            style={{
              display: 'inline-flex',
              padding: '0.2rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              gap: '0.25rem'
            }}
          >
            <button
              type="button"
              onClick={() => setUserType('INTERNAL')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: userType === 'INTERNAL' ? '#3b82f6' : 'transparent',
                color: userType === 'INTERNAL' ? '#ffffff' : '#94a3b8',
                fontWeight: userType === 'INTERNAL' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={14} />
              <span>{isRtl ? 'مستخدم داخلي' : 'Internal'}</span>
            </button>

            <button
              type="button"
              onClick={() => setUserType('EXTERNAL')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: userType === 'EXTERNAL' ? '#a855f7' : 'transparent',
                color: userType === 'EXTERNAL' ? '#ffffff' : '#94a3b8',
                fontWeight: userType === 'EXTERNAL' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Globe size={14} />
              <span>{isRtl ? 'شريك خارجي' : 'External'}</span>
            </button>
          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>


          {/* ── 3. EXTERNAL PARTNER SCOPE (CONDITIONAL) ── */}
          {userType === 'EXTERNAL' && (
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.06)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '10px',
                padding: '1.1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#e9d5ff' }}>
                  {isRtl ? 'اسم الجهة / البنك الشريك *' : 'Partner Organization *'}
                </label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={isRtl ? 'مثال: بنك اليمن والكويت' : 'e.g. Bank of Yemen & Kuwait'}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#e9d5ff' }}>
                  {isRtl ? 'القطاع / الكيان *' : 'Entity / Sector *'}
                </label>
                <select
                  value={organizationId}
                  onChange={(e) => {
                    setOrganizationId(e.target.value);
                    setAllowedEntities([e.target.value]);
                  }}
                  style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value="banking">{isRtl ? 'قطاع البنوك والمصارف (banking)' : 'Banking Sector'}</option>
                  <option value="merchants">{isRtl ? 'شبكة التجار والمدفوعات (merchants)' : 'Merchants Network'}</option>
                  <option value="erp">{isRtl ? 'أنظمة ERP والربط المؤسسي (erp)' : 'ERP Systems'}</option>
                  <option value="aml">{isRtl ? 'وحدات الامتثال (aml)' : 'Compliance Units'}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#e9d5ff' }}>
                  {isRtl ? 'الأنظمة المتاحة *' : 'Allowed Systems *'}
                </label>
                <select
                  value={allowedSystems[0] || 'collection'}
                  onChange={(e) => setAllowedSystems([e.target.value])}
                  style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value="collection">{isRtl ? 'نظام التحصيل فقط (SYS_TAHSEEL)' : 'Tahseel Collection System'}</option>
                  <option value="*">{isRtl ? 'كافة الأنظمة المصرح بها (*)' : 'All Authorized Systems (*)'}</option>
                </select>
              </div>
            </div>
          )}

          {/* ── 4. BASIC USER INFORMATION ── */}
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
                placeholder={isRtl ? 'مثال: أحمد عبد الله' : 'e.g. Ahmed Abdullah'}
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
                placeholder="ahmed.ali"
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
                placeholder="ahmed@example.com"
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

          {/* ── 5. ROLE ASSIGNMENT ── */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
              {isRtl ? 'الدور المسند *' : 'Assigned Role *'}
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.key}) {g.permissions.includes('*') ? (isRtl ? '— صلاحيات كاملة (*)' : '— Full Access (*)') : `— ${g.permissions.length} ${isRtl ? 'صلاحيات' : 'permissions'}`}
                </option>
              ))}
            </select>
          </div>

          {/* ── 6. ACTIONS & SUBMIT ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
              paddingTop: '1.25rem',
              marginTop: '0.5rem',
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
                padding: '0.6rem 1.5rem',
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
                  : (isRtl ? 'حفظ المستخدم' : 'Save User')}
              </span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};
