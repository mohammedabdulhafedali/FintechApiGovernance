import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Globe,
  ShieldCheck,
  UserPlus,
  User,
  Mail,
  Lock,
  Layers,
  Key,
  CheckCircle2,
  Sparkles,
  Info
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

  // Group Details
  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  // Helper: Generate Secure Password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    if (onNotify) {
      onNotify('كلمة مرور جديدة', 'تم توليد كلمة مرور مبدئية قوية وتعيينها للمستخدم', 'info');
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
        onNotify('تم الاعتماد بنجاح', `تم تسجيل المستخدم (${fullName}) وتثبيت نطاقه السيادي فوراً`, 'success');
      }
      onSuccess(created);
    } catch (err: any) {
      if (onNotify) {
        onNotify('فشل التسجيل', err.message || 'حدث خطأ أثناء اعتماد المستخدم', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--bg-card, #111827)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* ── 1. TOP HEADER & BREADCRUMBS ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.55rem 0.95rem',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.86rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <ArrowRight size={16} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
            <span>{isRtl ? 'العودة إلى قائمة المستخدمين' : 'Back to Users'}</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                {isRtl ? 'تسجيل مستخدم جديد واعتماد النطاق السيادي' : 'Register New Sovereign User'}
              </h2>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 700
                }}
              >
                {isRtl ? 'صفحة رسمية معتمدة' : 'Official Page'}
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-dim, #9ca3af)', fontSize: '0.84rem' }}>
              {isRtl
                ? 'إدخال بيانات المستخدم وتحديد النطاق المؤسسي السيادي أو الخارجي مع وراثة فورية لصلاحيات الدور'
                : 'Define user profile, assign sovereign access boundaries, and inherit role matrix permissions.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* ── 2. SOVEREIGN CLASSIFICATION CARDS ── */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldCheck size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                {isRtl ? '١. تصنيف ونوع المستخدم السيادي' : '1. User Sovereign Classification'}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Internal Enterprise Option */}
              <div
                onClick={() => setUserType('INTERNAL')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: userType === 'INTERNAL' ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: userType === 'INTERNAL' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'inline-flex', padding: '0.55rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                    <Building2 size={22} />
                  </div>
                  {userType === 'INTERNAL' && <CheckCircle2 size={20} color="#3b82f6" />}
                </div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.96rem', fontWeight: 700, color: '#ffffff' }}>
                  {isRtl ? 'مستخدم داخلي (مؤسسي)' : 'Internal (Enterprise User)'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {isRtl
                    ? 'موظف أو مسؤول مصرفي داخل المنظومة؛ يمتلك نطاق وصول شامل للمؤسسة وتخضع كافة عملياته لسجل التدقيق.'
                    : 'Internal enterprise staff or official with full institutional visibility across all modules.'}
                </p>
              </div>

              {/* External Partner Option */}
              <div
                onClick={() => setUserType('EXTERNAL')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: userType === 'EXTERNAL' ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: userType === 'EXTERNAL' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'inline-flex', padding: '0.55rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                    <Globe size={22} />
                  </div>
                  {userType === 'EXTERNAL' && <CheckCircle2 size={20} color="#a855f7" />}
                </div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.96rem', fontWeight: 700, color: '#ffffff' }}>
                  {isRtl ? 'شريك خارجي (محدد النطاق والعزل)' : 'External Partner (Scoped & Isolated)'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {isRtl
                    ? 'بنك شريك، تاجر، أو جهة خارجية؛ يتم حصر الوصول بنطاق عزل صارم محدد بالأنظمة والجهات المسموحة فقط.'
                    : 'External partner or bank locked to a strict sovereign boundary and specific systems visibility.'}
                </p>
              </div>
            </div>
          </div>

          {/* ── 3. EXTERNAL SOVEREIGN SCOPE (CONDITIONAL & DYNAMIC) ── */}
          {userType === 'EXTERNAL' && (
            <div
              style={{
                background: 'rgba(147, 51, 234, 0.05)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <ShieldCheck size={18} color="#c084fc" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e9d5ff' }}>
                  {isRtl ? '٢. حدود النطاق والعزل السيادي للشريك الخارجي' : '2. External Partner Sovereign Boundary & Scope'}
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                    {isRtl ? 'اسم الجهة / البنك الشريك *' : 'Partner Organization Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder={isRtl ? 'مثال: بنك اليمن والكويت' : 'e.g. Bank of Yemen & Kuwait'}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                    {isRtl ? 'معرف القطاع / الكيان السيادي *' : 'Entity ID / Sector Key *'}
                  </label>
                  <select
                    value={organizationId}
                    onChange={(e) => {
                      setOrganizationId(e.target.value);
                      setAllowedEntities([e.target.value]);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: '#1e293b',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  >
                    <option value="banking">{isRtl ? 'قطاع البنوك والمصارف السيادية (banking)' : 'Banking Sector (banking)'}</option>
                    <option value="merchants">{isRtl ? 'شبكة التجار والمدفوعات الإلكترونية (merchants)' : 'Merchants Network (merchants)'}</option>
                    <option value="erp">{isRtl ? 'أنظمة ERP والربط المؤسسي (erp)' : 'ERP Systems (erp)'}</option>
                    <option value="aml">{isRtl ? 'وحدات الامتثال ومكافحة غسل الأموال (aml)' : 'AML Compliance Units (aml)'}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                    {isRtl ? 'نطاق الأنظمة المسموح بعرضها *' : 'Allowed Systems Visibility *'}
                  </label>
                  <select
                    value={allowedSystems[0] || 'collection'}
                    onChange={(e) => setAllowedSystems([e.target.value])}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: '#1e293b',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  >
                    <option value="collection">{isRtl ? 'نظام التحصيل فقط (SYS_TAHSEEL)' : 'Tahseel Collection System Only'}</option>
                    <option value="*">{isRtl ? 'كافة الأنظمة المصرح بها للجهة (*)' : 'All Authorized Systems (*)'}</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(147, 51, 234, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.8rem',
                  color: '#d8b4fe'
                }}
              >
                <Info size={16} />
                <span>
                  {isRtl
                    ? 'سيتم حصر هذا المستخدم في بيانات الجهة المحددة تلقائياً، ولن يتمكن من الوصول لأي بيانات مصرفية لجهات أخرى.'
                    : 'This user will be strictly confined to the chosen entity boundary, preventing cross-tenant leakage.'}
                </span>
              </div>
            </div>
          )}

          {/* ── 4. PERSONAL & AUTHENTICATION DETAILS ── */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <User size={18} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                {isRtl ? (userType === 'EXTERNAL' ? '٣. بيانات المستخدم والاعتماد' : '٢. بيانات المستخدم والاعتماد') : 'Identity & Credentials'}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                  {isRtl ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRtl ? 'مثال: أحمد عبد الله اليماني' : 'e.g. Ahmed Abdullah'}
                    style={{
                      width: '100%',
                      padding: isRtl ? '0.7rem 2.5rem 0.7rem 0.85rem' : '0.7rem 0.85rem 0.7rem 2.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                  {isRtl ? 'اسم المستخدم (للدخول) *' : 'Username *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ahmed.alyamani"
                    style={{
                      width: '100%',
                      padding: isRtl ? '0.7rem 2.5rem 0.7rem 0.85rem' : '0.7rem 0.85rem 0.7rem 2.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                  {isRtl ? 'البريد الإلكتروني الرسمي *' : 'Official Email *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ahmed@gov.fintech"
                    style={{
                      width: '100%',
                      padding: isRtl ? '0.7rem 2.5rem 0.7rem 0.85rem' : '0.7rem 0.85rem 0.7rem 2.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                    {isRtl ? 'كلمة المرور المبدئية *' : 'Initial Password *'}
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
                      fontWeight: 600
                    }}
                  >
                    <Sparkles size={12} />
                    <span>{isRtl ? 'توليد كلمة سر آمنة' : 'Generate Secure'}</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Welcome@2026"
                    style={{
                      width: '100%',
                      padding: isRtl ? '0.7rem 2.5rem 0.7rem 0.85rem' : '0.7rem 0.85rem 0.7rem 2.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. ROLE GROUP & AUTOMATIC PERMISSIONS INHERITANCE ── */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Layers size={18} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                {isRtl ? (userType === 'EXTERNAL' ? '٤. إسناد الدور ووراثة الصلاحيات التلقائية' : '٣. إسناد الدور ووراثة الصلاحيات التلقائية') : 'Role Group & Inheritance'}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                  {isRtl ? 'اختر مجموعة الدور المصرفي *' : 'Select User Group / Role *'}
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#1e293b',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.key}) — {g.permissions.length} {isRtl ? 'صلاحيات' : 'permissions'}
                    </option>
                  ))}
                </select>
                <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.76rem', color: '#94a3b8' }}>
                  {isRtl
                    ? 'يرث المستخدم تلقائياً كافة صلاحيات الدور المختار فور تسجيله، مع إمكانية التخصيص الفردي لاحقاً.'
                    : 'The user will inherit all permissions assigned to this role, with individual override capability.'}
                </span>
              </div>

              {/* Group Preview Card */}
              {selectedGroup && (
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fbbf24' }}>
                        {selectedGroup.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}>
                        {selectedGroup.key}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: '#d1d5db', lineHeight: 1.4 }}>
                      {selectedGroup.description || (isRtl ? 'دور مصرفي معتمد في النظام' : 'Certified Banking Role')}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#fde68a', fontWeight: 600 }}>
                    <CheckCircle2 size={15} />
                    <span>
                      {selectedGroup.permissions.includes('*')
                        ? (isRtl ? 'صلاحيات سيادية كاملة شاملة لكافة الشاشات (*)' : 'Full Sovereign Matrix Access (*)')
                        : (isRtl ? `${selectedGroup.permissions.length} صلاحية موروثة تلقائياً` : `${selectedGroup.permissions.length} inherited permissions`)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 6. ACTIONS & SUBMIT BAR ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '1rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.4rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isRtl ? 'إلغاء وعودة' : 'Cancel & Back'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.6rem',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                opacity: isSubmitting ? 0.75 : 1,
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={18} />
              <span>
                {isSubmitting
                  ? (isRtl ? 'جاري الاعتماد والتسجيل...' : 'Registering...')
                  : (isRtl ? 'تسجيل واعتماد المستخدم' : 'Register & Certify User')}
              </span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};
