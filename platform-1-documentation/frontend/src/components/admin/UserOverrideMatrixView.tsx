import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Save, 
  ArrowRight, 
  Check, 
  X, 
  ShieldCheck, 
  Sliders, 
  RotateCcw,
  Layers,
  Lock,
  AlertCircle,
  Building,
  Code,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  UserPublicProfile, 
  UserGroup, 
  ScreenResourceDefinition, 
  ScreenActionType, 
  UserOverrides 
} from '../../types/auth';
import { iamService } from '../../services/iamService';
import { useLanguage } from '../../i18n';

interface UserOverrideMatrixViewProps {
  user: UserPublicProfile;
  userGroup?: UserGroup;
  onClose: () => void;
  onSuccess: (updatedUser: UserPublicProfile) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const ACTION_COLUMNS: { key: ScreenActionType; labelAr: string; labelEn: string }[] = [
  { key: 'read', labelAr: 'قراءة', labelEn: 'Read' },
  { key: 'create', labelAr: 'انشاء', labelEn: 'Create' },
  { key: 'update', labelAr: 'تعديل', labelEn: 'Update' },
  { key: 'delete', labelAr: 'حذف', labelEn: 'Delete' }
];

export const UserOverrideMatrixView: React.FC<UserOverrideMatrixViewProps> = ({
  user,
  userGroup,
  onClose,
  onSuccess,
  onNotify
}) => {
  const { isRtl } = useLanguage();

  const [screens, setScreens] = useState<ScreenResourceDefinition[]>([]);
  const [isLoadingScreens, setIsLoadingScreens] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'BASE_MODULES' | 'CENTRAL_SYSTEMS' | 'ALL'>('BASE_MODULES');

  // Overrides state: granted and revoked sets
  const [grantedSet, setGrantedSet] = useState<Set<string>>(() => {
    return new Set(user.overrides?.grantedPermissions || []);
  });
  const [revokedSet, setRevokedSet] = useState<Set<string>>(() => {
    return new Set(user.overrides?.revokedPermissions || []);
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Group permissions set
  const groupPermsSet = useMemo(() => {
    return new Set(userGroup?.permissions || []);
  }, [userGroup]);

  const isGroupFullAdmin = useMemo(() => {
    return (
      groupPermsSet.has('*') ||
      userGroup?.key === 'ADMIN_GROUP' ||
      userGroup?.id === 'grp_super_admin' ||
      user.username === 'admin'
    );
  }, [groupPermsSet, userGroup, user]);

  // Load screen resources dynamically
  useEffect(() => {
    let isMounted = true;
    setIsLoadingScreens(true);
    iamService.getScreenResources()
      .then((res) => {
        if (isMounted) {
          setScreens(res);
          setIsLoadingScreens(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingScreens(false);
      });
    return () => { isMounted = false; };
  }, []);

  // تجميع الموارد بحسب الفئات (نماذج المنظومة الأساسية مقابل الصلاحيات المخصصة)
  const baseModuleScreens = useMemo(() => {
    return screens.filter(s => s.category === 'BASE_MODULES' || s.systemKey === 'BASE_MODULES');
  }, [screens]);

  const centralSystemScreens = useMemo(() => {
    return screens.filter(s => s.category !== 'BASE_MODULES' && s.systemKey !== 'BASE_MODULES');
  }, [screens]);

  const displayedScreens = useMemo(() => {
    if (activeTab === 'BASE_MODULES') return baseModuleScreens;
    if (activeTab === 'CENTRAL_SYSTEMS') return centralSystemScreens;
    return screens;
  }, [activeTab, baseModuleScreens, centralSystemScreens, screens]);

  // تجميع الموارد والشاشات ديناميكياً بحسب النظام والتبويب
  const groupedScreens = useMemo(() => {
    const map = new Map<string, {
      systemKey: string;
      systemName: string;
      systemNameEn?: string;
      systemCode?: string;
      screens: ScreenResourceDefinition[];
    }>();

    displayedScreens.forEach(s => {
      const sKey = s.systemKey || (s.category === 'BASE_MODULES' ? 'BASE_MODULES' : 'SYSTEM_RESOURCES');
      const sName = s.systemName || (s.category === 'BASE_MODULES' ? 'نماذج المنظومة الأساسية' : 'الخدمات المصرفية');
      const sNameEn = s.systemNameEn || sKey;
      const sCode = s.systemCode;

      if (!map.has(sKey)) {
        map.set(sKey, {
          systemKey: sKey,
          systemName: sName,
          systemNameEn: sNameEn,
          systemCode: sCode,
          screens: []
        });
      }
      map.get(sKey)!.screens.push(s);
    });

    return Array.from(map.values());
  }, [displayedScreens]);

  // التحقق من نطاق صلاحية المستخدم الخارجي للوصول إلى هذا النظام
  const isSystemAllowed = useCallback((systemKey: string) => {
    if (user.userType !== 'EXTERNAL') return true;
    const allowed = user.accessScope?.allowedSystemIds;
    if (!allowed || allowed.length === 0 || allowed.includes('*')) return true;
    return allowed.includes(systemKey);
  }, [user]);

  /**
   * تقييم حالة الخلية الفردية للمستخدم:
   * 1. 'revoked': محجوبة كاستثناء فردي (أحمر)
   * 2. 'granted': ممنوحة كاستثناء فردي (أخضر مضيء)
   * 3. 'inherited': موروثة طبيعياً من دور المجموعة (أزرق/سماوي)
   * 4. 'none': غير ممنوحة وغير موروثة (رمادي فارغ)
   */
  const getCellState = useCallback((screenKey: string, action: ScreenActionType): 'revoked' | 'granted' | 'inherited' | 'none' => {
    const permKey = `${screenKey}:${action}`;

    if (revokedSet.has(permKey)) {
      return 'revoked';
    }

    if (grantedSet.has(permKey)) {
      return 'granted';
    }

    if (isGroupFullAdmin || groupPermsSet.has(permKey)) {
      return 'inherited';
    }

    return 'none';
  }, [revokedSet, grantedSet, isGroupFullAdmin, groupPermsSet]);

  /**
   * تبديل حالة الخلية الفردية عند النقر:
   * - إذا كانت موروثة من المجموعة -> النقر يحجبها ويمنعها (Revoke).
   * - إذا كانت محجوبة -> النقر يزيل الحجب ويعيدها للموروث الطبيعي.
   * - إذا كانت غير ممنوحة -> النقر يمنحها كاستثناء خاص (Grant).
   * - إذا كانت ممنوحة كاستثناء -> النقر يلغي الاستثناء ويعيدها لغير ممنوحة.
   */
  const handleCellClick = useCallback((screenKey: string, action: ScreenActionType) => {
    if (isGroupFullAdmin) {
      onNotify?.(
        isRtl ? 'صلاحيات سيادية مجمدة' : 'Sovereign Permissions Frozen',
        isRtl ? 'صلاحيات المسؤول السيادي مجمدة وشاملة (*) ولا يمكن حجبها أو استثناؤها لضمان استقرار المنظومة.' : 'Admin permissions are permanently frozen (*).',
        'warning'
      );
      return;
    }

    const permKey = `${screenKey}:${action}`;
    const currentState = getCellState(screenKey, action);

    setGrantedSet(prevGranted => {
      setRevokedSet(prevRevoked => {
        const nextGranted = new Set(prevGranted);
        const nextRevoked = new Set(prevRevoked);

        if (currentState === 'inherited') {
          // حجب الصلاحية الموروثة
          nextRevoked.add(permKey);
          nextGranted.delete(permKey);

          // قاعدة الاعتمادية: إذا حجب القراءة، نحجب تلقائياً الإنشاء والتعديل والحذف
          if (action === 'read') {
            nextRevoked.add(`${screenKey}:create`);
            nextRevoked.add(`${screenKey}:update`);
            nextRevoked.add(`${screenKey}:delete`);
            nextGranted.delete(`${screenKey}:create`);
            nextGranted.delete(`${screenKey}:update`);
            nextGranted.delete(`${screenKey}:delete`);
          }
        } else if (currentState === 'revoked') {
          // إلغاء الحجب والعودة للأصل الموروث
          nextRevoked.delete(permKey);
        } else if (currentState === 'none') {
          // منح استثناء فردي إضافي
          nextGranted.add(permKey);
          nextRevoked.delete(permKey);

          // قاعدة الاعتمادية: إذا منح تعديل أو إنشاء أو حذف، نمنح القراءة تلقائياً
          if (action === 'create' || action === 'update' || action === 'delete') {
            nextGranted.add(`${screenKey}:read`);
            nextRevoked.delete(`${screenKey}:read`);
          }
        } else if (currentState === 'granted') {
          // إلغاء المنح الإضافي والعودة للوضع الطبيعي
          nextGranted.delete(permKey);
          if (action === 'read') {
            nextGranted.delete(`${screenKey}:create`);
            nextGranted.delete(`${screenKey}:update`);
            nextGranted.delete(`${screenKey}:delete`);
          }
        }

        setHasChanges(true);
        return nextRevoked;
      });
      return prevGranted;
    });
  }, [getCellState, isGroupFullAdmin, onNotify, isRtl]);

  // استعادة الوضع الافتراضي لمجموعة المستخدم وإلغاء كافة الاستثناءات
  const handleResetAllOverrides = useCallback(() => {
    if (isGroupFullAdmin) return;
    setGrantedSet(new Set());
    setRevokedSet(new Set());
    setHasChanges(true);
  }, [isGroupFullAdmin]);

  // حفظ الاستثناءات
  const handleSave = async () => {
    if (isGroupFullAdmin) {
      onNotify?.(
        isRtl ? 'صلاحيات سيادية مجمدة' : 'Sovereign Permissions Frozen',
        isRtl ? 'صلاحيات المسؤول السيادي مجمدة وشاملة (*) ومحمية دائماً.' : 'Admin permissions are permanently frozen (*).',
        'info'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const overrides: UserOverrides = {
        grantedPermissions: Array.from(grantedSet),
        revokedPermissions: Array.from(revokedSet)
      };

      const updated = await iamService.updateUserOverrides(user.id, overrides);

      onNotify?.(
        isRtl ? 'تم الحفظ بنجاح' : 'Saved Successfully',
        isRtl ? `تم اعتماد مصفوفة استثناءات المستخدم [${user.fullName}] بنجاح` : `Overrides matrix committed for [${user.fullName}]`,
        'success'
      );

      setHasChanges(false);
      onSuccess(updated);
    } catch (err: any) {
      onNotify?.(
        isRtl ? 'خطأ في الحفظ' : 'Save Error',
        err.message || (isRtl ? 'فشل حفظ استثناءات الصلاحيات' : 'Failed to save user overrides'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        width: '100%',
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '1.75rem',
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {/* ── 1. TOP ACTION & STATUS BAR (شريط واحد نظيف وأنيق خالي من الحشو) ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--overlay-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: 'var(--text-muted, #9ca3af)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.84rem',
              transition: 'all 0.2s'
            }}
          >
            <ArrowRight size={15} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
            <span>{isRtl ? 'رجوع' : 'Back'}</span>
          </button>

          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #f9fafb)' }}>
            {isRtl ? `تخصيص الصلاحيات: ${user.fullName || user.username}` : `User Permissions: ${user.fullName || user.username}`}
          </h2>

          {/* شارة الدور */}
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--overlay-subtle)',
              border: '1px solid var(--border)',
              padding: '0.35rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.82rem'
            }}
          >
            <span style={{ color: 'var(--text-muted, #9ca3af)' }}>{isRtl ? 'الدور:' : 'Role:'}</span>
            <span style={{ color: 'var(--primary, #60a5fa)', fontWeight: 700 }}>
              {user.groupName || userGroup?.name || (isRtl ? 'غير محدد' : 'Unassigned')}
            </span>
          </div>

          {/* شريك خارجي إذا وجد فقط */}
          {user.userType === 'EXTERNAL' && (
            <span
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                fontWeight: 600,
                fontSize: '0.78rem'
              }}
            >
              {user.organizationName || user.organizationId || (isRtl ? 'شريك خارجي' : 'External Partner')}
            </span>
          )}

          {/* الدليل اللوني مدمج بشكل أنيق وبسيط */}
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'var(--overlay-subtle)',
              border: '1px solid var(--border)',
              padding: '0.35rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#93c5fd' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              {isRtl ? 'موروثة' : 'Inherited'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#34d399' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              {isRtl ? 'ممنوحة' : 'Granted'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f87171' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              {isRtl ? 'محجوبة' : 'Denied'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleResetAllOverrides}
            disabled={isGroupFullAdmin}
            title={
              isGroupFullAdmin
                ? (isRtl ? 'صلاحيات المسؤول السيادي مجمدة وشاملة (*)' : 'Sovereign admin permissions are frozen (*)')
                : (isRtl ? 'إلغاء كافة الاستثناءات والعودة لأصل الدور' : 'Reset all overrides to role default')
            }
            style={{
              padding: '0.6rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--overlay-subtle)',
              color: 'var(--text-muted, #9ca3af)',
              fontSize: '0.82rem',
              cursor: isGroupFullAdmin ? 'not-allowed' : 'pointer',
              opacity: isGroupFullAdmin ? 0.45 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <RotateCcw size={14} />
            <span>{isRtl ? 'استعادة أصل الدور' : 'Reset to Role'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || isGroupFullAdmin}
            title={
              isGroupFullAdmin
                ? (isRtl ? 'صلاحيات المسؤول السيادي مجمدة ومحمية بالكامل (*)' : 'Sovereign admin permissions are frozen (*)')
                : undefined
            }
            style={{
              background: isGroupFullAdmin ? 'rgba(16, 185, 129, 0.15)' : '#10b981',
              color: isGroupFullAdmin ? '#34d399' : '#ffffff',
              border: isGroupFullAdmin ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.6rem',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: (isSubmitting || isGroupFullAdmin) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isGroupFullAdmin ? 'none' : hasChanges ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isGroupFullAdmin ? <Lock size={16} /> : <Save size={16} />}
            <span>
              {isSubmitting
                ? (isRtl ? 'جاري الحفظ...' : 'Saving...')
                : isGroupFullAdmin
                ? (isRtl ? 'الصلاحيات مجمدة سيادياً (*)' : 'Sovereign Frozen (*)')
                : (isRtl ? 'حفظ' : 'Save')}
            </span>
          </button>
        </div>
      </div>

      {/* ── 2.5 SOVEREIGN FROZEN BANNER ── */}
      {isGroupFullAdmin && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '12px',
            padding: '1.1rem 1.35rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 18px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#34d399', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{isRtl ? 'صلاحيات المسؤول السيادي مجمدة ومحمية بالكامل (*)' : 'Sovereign Admin Permissions Frozen & Protected (*)'}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.35)'
                }}
              >
                {isRtl ? 'غير قابلة للحجب' : 'Unrevokable'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)', lineHeight: 1.55 }}>
              {isRtl
                ? 'حساب المسؤول الرئيسي السيادي للنظام يتمتع بالصلاحية الشاملة الكاملة (*) الدائمة. تم قفل وتجميد تعديل الصلاحيات لمنع أي استثناء أو حجب غير مقصود لضمان استقرار المنظومة.'
                : 'The Sovereign Admin possesses permanent full wildcard (*) permissions. Overrides and revoking are permanently disabled.'}
            </div>
          </div>
        </div>
      )}

      {/* ── 2.7 TAB CONTROLLER (فصل النماذج الأساسية عن الصلاحيات المخصصة الهرمية) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('BASE_MODULES')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'BASE_MODULES' ? 'rgba(59, 130, 246, 0.15)' : 'var(--overlay-subtle)',
            border: `1px solid ${activeTab === 'BASE_MODULES' ? '#3b82f6' : 'var(--border)'}`,
            color: activeTab === 'BASE_MODULES' ? '#60a5fa' : 'var(--text-muted, #9ca3af)'
          }}
        >
          <Building size={16} />
          <span>{isRtl ? 'نماذج وشاشات المنظومة الأساسية' : 'Core System Modules'}</span>
          <span style={{ fontSize: '0.74rem', padding: '0.1rem 0.45rem', borderRadius: '12px', background: activeTab === 'BASE_MODULES' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)', color: activeTab === 'BASE_MODULES' ? '#93c5fd' : '#9ca3af' }}>
            {baseModuleScreens.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CENTRAL_SYSTEMS')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'CENTRAL_SYSTEMS' ? 'rgba(16, 185, 129, 0.15)' : 'var(--overlay-subtle)',
            border: `1px solid ${activeTab === 'CENTRAL_SYSTEMS' ? '#10b981' : 'var(--border)'}`,
            color: activeTab === 'CENTRAL_SYSTEMS' ? '#34d399' : 'var(--text-muted, #9ca3af)'
          }}
        >
          <Sliders size={16} />
          <span>{isRtl ? 'الصلاحيات المخصصة للأنظمة والتكاملات' : 'Granular Systems & Scopes'}</span>
          <span style={{ fontSize: '0.74rem', padding: '0.1rem 0.45rem', borderRadius: '12px', background: activeTab === 'CENTRAL_SYSTEMS' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)', color: activeTab === 'CENTRAL_SYSTEMS' ? '#6ee7b7' : '#9ca3af' }}>
            {centralSystemScreens.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'ALL' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: `1px solid ${activeTab === 'ALL' ? '#8b5cf6' : 'transparent'}`,
            color: activeTab === 'ALL' ? '#a78bfa' : 'var(--text-muted, #9ca3af)'
          }}
        >
          <span>{isRtl ? 'عرض الكل (المصفوفة الشاملة)' : 'View All Matrix'}</span>
        </button>
      </div>

      {/* ── 3. FULL PAGE UNIFIED MATRIX TABLE (جدول الصلاحيات بعرض كامل الصفحة) ── */}
      <div 
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
          <thead>
            <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid rgba(16, 185, 129, 0.4)' }}>
              <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #f3f4f6)' }}>
                {isRtl ? 'اسم الشاشة / الخدمة' : 'Screen / Service Name'}
              </th>

              {ACTION_COLUMNS.map((col) => (
                <th 
                  key={col.key} 
                  style={{ 
                    padding: '0.9rem 1rem', 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    color: 'var(--text-muted, #e5e7eb)',
                    textAlign: 'center',
                    width: '120px'
                  }}
                >
                  {isRtl ? col.labelAr : col.labelEn}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoadingScreens ? (
              <tr>
                <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: '#9ca3af' }}>
                  {isRtl ? 'جاري تحميل سجل الشاشات والموارد المصرفية...' : 'Loading dynamic screens catalog...'}
                </td>
              </tr>
            ) : displayedScreens.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={28} color="#f59e0b" />
                    <span style={{ fontWeight: 700, color: '#f3f4f6' }}>
                      {isRtl ? 'لا توجد عناصر في هذا التبويب' : 'No items found in this tab'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              groupedScreens.map((grp) => {
                const isBase = grp.systemKey === 'BASE_MODULES';
                const allowed = isSystemAllowed(grp.systemKey);

                return (
                  <React.Fragment key={grp.systemKey}>
                    {/* رأس قسم النظام المصرفي الديناميكي أو نماذج المنظومة */}
                    <tr 
                      style={{ 
                        background: isBase ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
                        borderBottom: `1px solid ${isBase ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'}` 
                      }}
                    >
                      <td colSpan={5} style={{ padding: '0.65rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {isBase ? <Building size={16} color="#60a5fa" /> : <Layers size={16} color="#34d399" />}
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isBase ? '#60a5fa' : '#34d399' }}>
                              {isRtl ? grp.systemName : (grp.systemNameEn || grp.systemName)}
                            </span>
                            {grp.systemCode && (
                              <span 
                                style={{ 
                                  fontSize: '0.72rem', 
                                  color: '#10b981', 
                                  padding: '0.1rem 0.5rem', 
                                  borderRadius: '4px', 
                                  background: 'rgba(16, 185, 129, 0.15)', 
                                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                                  fontFamily: 'monospace' 
                                }}
                              >
                                {grp.systemCode}
                              </span>
                            )}
                            <span style={{ fontSize: '0.74rem', color: '#9ca3af', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }}>
                              {grp.screens.length} {isRtl ? 'شاشة / تكامل' : 'screens'}
                            </span>
                          </div>

                          {/* شارة حالة نطاق صلاحية المستخدم الخارجي */}
                          {user.userType === 'EXTERNAL' && !isBase && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {allowed ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  {isRtl ? 'ضمن نطاق ترخيص الشريك المصرح به' : 'Within Partner Scope'}
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                  <Lock size={12} />
                                  {isRtl ? 'محظور: خارج نطاق ترخيص الشريك' : 'Restricted: Out of Scope'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* صفوف شاشات وخدمات هذا النظام */}
                    {grp.screens.map((screen, idx) => {
                      const isEven = idx % 2 === 0;

                      return (
                        <tr 
                          key={screen.key}
                          style={{
                            background: isEven ? 'var(--table-row-alt)' : 'var(--table-row-hover)',
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s'
                          }}
                        >
                          {/* اسم الشاشة */}
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main, #f9fafb)' }}>
                              {screen.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #9ca3af)', marginTop: '0.15rem' }}>
                              {screen.nameAr}
                            </div>
                          </td>

                          {/* أعمدة العمليات الأربعة (قراءة | انشاء | تعديل | حذف) */}
                          {ACTION_COLUMNS.map((col) => {
                            const isSupported = screen.supportedActions.includes(col.key);
                            if (!isSupported) {
                              return (
                                <td key={col.key} style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                  <span 
                                    style={{ 
                                      display: 'inline-block', 
                                      width: '16px', 
                                      height: '2px', 
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      borderRadius: '1px'
                                    }} 
                                  />
                                </td>
                              );
                            }

                            const state = getCellState(screen.key, col.key);

                            // إعدادات المظهر التفاعلي لكل حالة
                            let bg = 'rgba(0, 0, 0, 0.3)';
                            let border = '1px solid rgba(255, 255, 255, 0.18)';
                            let icon = null;
                            let tooltip = isRtl ? 'غير ممنوحة (انقر لمنحها)' : 'Not granted (click to grant)';

                            if (state === 'inherited') {
                              bg = 'rgba(59, 130, 246, 0.2)';
                              border = '1px solid #3b82f6';
                              icon = <Check size={16} color="#60a5fa" strokeWidth={3} />;
                              tooltip = isRtl ? 'موروثة من الدور (انقر لحجبها)' : 'Inherited from role (click to revoke)';
                            } else if (state === 'granted') {
                              bg = 'rgba(16, 185, 129, 0.25)';
                              border = '1px solid #10b981';
                              icon = <Check size={16} color="#10b981" strokeWidth={3} />;
                              tooltip = isRtl ? 'استثناء: ممنوحة خاصة (انقر لإلغاء المنح)' : 'Granted override (click to clear)';
                            } else if (state === 'revoked') {
                              bg = 'rgba(239, 68, 68, 0.25)';
                              border = '1px solid #ef4444';
                              icon = <X size={16} color="#f87171" strokeWidth={3} />;
                              tooltip = isRtl ? 'استثناء: محجوبة وممنوعة (انقر لإلغاء الحجب)' : 'Revoked override (click to restore)';
                            }

                            return (
                              <td 
                                key={col.key} 
                                style={{ 
                                  padding: '0.85rem 1rem', 
                                  textAlign: 'center',
                                  verticalAlign: 'middle'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleCellClick(screen.key, col.key)}
                                  disabled={isGroupFullAdmin}
                                  title={isGroupFullAdmin ? (isRtl ? 'صلاحيات سيادية مجمدة ومحمية بالكامل (*)' : 'Sovereign permissions frozen (*)') : tooltip}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    background: bg,
                                    border: border,
                                    cursor: isGroupFullAdmin ? 'not-allowed' : 'pointer',
                                    opacity: isGroupFullAdmin ? 0.9 : 1,
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {icon}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 4. FOOTER STATS & ACTIONS ── */}
      <div 
        style={{
          marginTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.84rem',
          color: '#9ca3af'
        }}
      >
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <span>
            {isRtl ? `الاستثناءات الإضافية الممنوحة: ` : `Granted Overrides: `}
            <strong style={{ color: '#34d399' }}>{grantedSet.size}</strong>
          </span>
          <span>
            {isRtl ? `الاستثناءات المحجوبة والممنوعة: ` : `Revoked Overrides: `}
            <strong style={{ color: '#f87171' }}>{revokedSet.size}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'none',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            {isRtl ? 'رجوع' : 'Back'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            style={{
              padding: '0.55rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? 'حفظ التعديلات' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
