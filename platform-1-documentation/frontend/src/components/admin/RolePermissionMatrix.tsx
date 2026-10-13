import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Save, 
  ArrowRight, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  Layers, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { ScreenResourceDefinition, ScreenActionType, UserGroup } from '../../types/auth';
import { iamService } from '../../services/iamService';
import { useLanguage } from '../../i18n';

interface RolePermissionMatrixProps {
  initialGroup?: UserGroup | null;
  onSaveSuccess: (savedGroup: UserGroup) => void;
  onCancel: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const ACTION_COLUMNS: { key: ScreenActionType; labelAr: string; labelEn: string }[] = [
  { key: 'read', labelAr: 'قراءة', labelEn: 'Read' },
  { key: 'create', labelAr: 'انشاء', labelEn: 'Create' },
  { key: 'update', labelAr: 'تعديل', labelEn: 'Update' },
  { key: 'delete', labelAr: 'حذف', labelEn: 'Delete' }
];

export const RolePermissionMatrix: React.FC<RolePermissionMatrixProps> = ({
  initialGroup,
  onSaveSuccess,
  onCancel,
  onNotify
}) => {
  const { isRtl } = useLanguage();

  // Screen resources loaded dynamically from backend/catalog
  const [screens, setScreens] = useState<ScreenResourceDefinition[]>([]);
  const [isLoadingScreens, setIsLoadingScreens] = useState(true);

  // Form State
  const [roleName, setRoleName] = useState(initialGroup?.name || '');
  const [roleKey, setRoleKey] = useState(initialGroup?.key || '');
  const [roleDesc, setRoleDesc] = useState(initialGroup?.description || '');
  const [isActive, setIsActive] = useState<boolean>(initialGroup?.status !== 'INACTIVE');
  
  // Selected Permissions: Map of screenKey -> Set of action strings
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(() => {
    return new Set(initialGroup?.permissions || []);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch dynamic screens catalog
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

  // Update form if initialGroup changes
  useEffect(() => {
    if (initialGroup) {
      setRoleName(initialGroup.name || '');
      setRoleKey(initialGroup.key || '');
      setRoleDesc(initialGroup.description || '');
      setIsActive(initialGroup.status !== 'INACTIVE');
      setSelectedPermissions(new Set(initialGroup.permissions || []));
      setHasChanges(false);
    }
  }, [initialGroup]);

  // Total available permissions count
  const totalAvailablePermissions = useMemo(() => {
    return screens.reduce((acc, s) => acc + s.supportedActions.length, 0);
  }, [screens]);

  /**
   * معالجة النقر على مربع اختيار الصلاحية
   * تطبيق قاعدة الاعتمادية المتسلسلة (Cascading Dependency Rule):
   * 1. تفعيل (إنشاء أو تعديل أو حذف) يفعل تلقائياً (قراءة) لنفس الشاشة.
   * 2. إلغاء (قراءة) يلغي تلقائياً باقي العمليات لنفس الشاشة.
   */
  const handleTogglePermission = useCallback((screenKey: string, action: ScreenActionType) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      const permKey = `${screenKey}:${action}`;

      if (next.has(permKey)) {
        // Uncheck
        next.delete(permKey);
        // إذا ألغى القراءة، نلغي الإنشاء والتعديل والحذف تلقائياً
        if (action === 'read') {
          next.delete(`${screenKey}:create`);
          next.delete(`${screenKey}:update`);
          next.delete(`${screenKey}:delete`);
        }
      } else {
        // Check
        next.add(permKey);
        // إذا فعّل أي عملية تعديلية/كتابية، نفعّل القراءة تلقائياً
        if (action === 'create' || action === 'update' || action === 'delete') {
          next.add(`${screenKey}:read`);
        }
      }

      setHasChanges(true);
      return next;
    });
  }, []);

  // تحديد كامل العمليات المدعومة لشاشة معينة
  const handleToggleAllForScreen = useCallback((screen: ScreenResourceDefinition) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      const allChecked = screen.supportedActions.every(act => next.has(`${screen.key}:${act}`));

      if (allChecked) {
        // إلغاء تحديد الكل للشاشة
        screen.supportedActions.forEach(act => next.delete(`${screen.key}:${act}`));
      } else {
        // تحديد الكل للشاشة
        screen.supportedActions.forEach(act => next.add(`${screen.key}:${act}`));
      }

      setHasChanges(true);
      return next;
    });
  }, []);

  // تحديد عمود كامل (مثلاً: قراءة للكل)
  const handleToggleColumn = useCallback((action: ScreenActionType) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      const applicableScreens = screens.filter(s => s.supportedActions.includes(action));
      const allChecked = applicableScreens.every(s => next.has(`${s.key}:${action}`));

      if (allChecked) {
        applicableScreens.forEach(s => {
          next.delete(`${s.key}:${action}`);
          if (action === 'read') {
            next.delete(`${s.key}:create`);
            next.delete(`${s.key}:update`);
            next.delete(`${s.key}:delete`);
          }
        });
      } else {
        applicableScreens.forEach(s => {
          next.add(`${s.key}:${action}`);
          if (action === 'create' || action === 'update' || action === 'delete') {
            next.add(`${s.key}:read`);
          }
        });
      }

      setHasChanges(true);
      return next;
    });
  }, [screens]);

  // تجميع الموارد والشاشات ديناميكياً بحسب النظام المصرفي والسيادي
  const groupedScreens = useMemo(() => {
    const map = new Map<string, {
      systemKey: string;
      systemName: string;
      systemNameEn?: string;
      screens: ScreenResourceDefinition[];
    }>();

    screens.forEach(s => {
      const sKey = s.systemKey || (s.category === 'GOVERNANCE_SYSTEM' ? 'GOVERNANCE_SYSTEM' : 'SYSTEM_RESOURCES');
      const sName = s.systemName || (s.category === 'GOVERNANCE_SYSTEM' ? 'إدارة وحوكمة المنظومة السيادية' : 'الخدمات المصرفية العامة');
      const sNameEn = s.systemNameEn || sKey;

      if (!map.has(sKey)) {
        map.set(sKey, {
          systemKey: sKey,
          systemName: sName,
          systemNameEn: sNameEn,
          screens: []
        });
      }
      map.get(sKey)!.screens.push(s);
    });

    return Array.from(map.values());
  }, [screens]);

  // تحديد / إلغاء تحديد كافة صلاحيات نظام كامل
  const handleToggleSystem = useCallback((groupScreens: ScreenResourceDefinition[]) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      const allChecked = groupScreens.every(s =>
        s.supportedActions.every(act => next.has(`${s.key}:${act}`))
      );

      if (allChecked) {
        groupScreens.forEach(s => {
          s.supportedActions.forEach(act => next.delete(`${s.key}:${act}`));
        });
      } else {
        groupScreens.forEach(s => {
          s.supportedActions.forEach(act => next.add(`${s.key}:${act}`));
        });
      }

      setHasChanges(true);
      return next;
    });
  }, []);

  // حفظ الدور / المجموعة
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roleName.trim()) {
      onNotify?.(
        isRtl ? 'حقل مطلوب' : 'Required Field',
        isRtl ? 'يرجى إدخال اسم الدور/المجموعة' : 'Please enter role name',
        'warning'
      );
      return;
    }

    const calculatedKey = roleKey.trim() || roleName.trim().replace(/\s+/g, '_').toUpperCase();

    setIsSubmitting(true);
    try {
      let saved: UserGroup;
      const permArray = Array.from(selectedPermissions);

      if (initialGroup?.id) {
        // Update existing group
        saved = await iamService.updateGroup(initialGroup.id, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          permissions: permArray
        });
      } else {
        // Create new group
        saved = await iamService.createGroup({
          key: calculatedKey,
          name: roleName.trim(),
          description: roleDesc.trim(),
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          permissions: permArray
        });
      }

      onNotify?.(
        isRtl ? 'تم الحفظ بنجاح' : 'Saved Successfully',
        isRtl ? `تم اعتماد مصفوفة الصلاحيات للدور [${saved.name}] بنجاح` : `Role [${saved.name}] matrix saved successfully`,
        'success'
      );
      setHasChanges(false);
      onSaveSuccess(saved);
    } catch (err: any) {
      onNotify?.(
        isRtl ? 'خطأ في الحفظ' : 'Save Error',
        err.message || (isRtl ? 'فشل حفظ مصفوفة الصلاحيات' : 'Failed to save role matrix'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        background: 'var(--bg-card, #111827)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.75rem',
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* ── 1. TOP ACTION BAR (كما في أعلى الصورة: زر حفظ بارز وزر تراجع) ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: '#9ca3af',
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
          
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f9fafb' }}>
              {initialGroup ? (isRtl ? `تعديل الدور: ${initialGroup.name}` : `Edit Role: ${initialGroup.name}`) : (isRtl ? 'إنشاء دور وصلاحيات جديدة' : 'Create New Role & Matrix')}
            </h2>
            <span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>
              {isRtl ? 'مصفوفة التحكم الديناميكية بالصلاحيات المصرفية وفق مبادئ SOLID' : 'Dynamic Role-Based Access Control Matrix (SOLID Architecture)'}
            </span>
          </div>
        </div>

        {/* زر الحفظ الأخضر الرئيسي (مطابق لموضع وزر حفظ في الصورة) */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSubmitting}
          style={{
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.65rem 1.6rem',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: hasChanges ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <Save size={16} />
          <span>{isSubmitting ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ' : 'Save')}</span>
        </button>
      </div>

      {/* ── 2. METADATA SECTION (الاسم + الحالة كما في الصورة) ── */}
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          alignItems: 'center'
        }}
      >
        {/* حقل الاسم */}
        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e5e7eb' }}>
            {isRtl ? 'الاسم' : 'Name'} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={roleName}
            onChange={(e) => {
              setRoleName(e.target.value);
              setHasChanges(true);
            }}
            placeholder={isRtl ? 'مثال: مسؤول الربط المالي (Financial Ops)' : 'e.g. Operations Manager'}
            style={{
              width: '100%',
              padding: '0.65rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* حقل رمز الدور (Key) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e5e7eb' }}>
            {isRtl ? 'رمز النظام (Role Key)' : 'Role Key'}
          </label>
          <input
            type="text"
            value={roleKey}
            onChange={(e) => {
              setRoleKey(e.target.value.toUpperCase());
              setHasChanges(true);
            }}
            placeholder="FINTECH_OPERATIONS"
            disabled={!!initialGroup}
            style={{
              width: '100%',
              padding: '0.65rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: initialGroup ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.3)',
              color: initialGroup ? '#9ca3af' : '#ffffff',
              fontSize: '0.86rem',
              outline: 'none',
              cursor: initialGroup ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* حقل الحالة (كما في الصورة Checkbox باسم "الحالة") */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e5e7eb' }}>
            {isRtl ? 'الحالة' : 'Status'}
          </label>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'pointer',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              width: 'fit-content'
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive(e.target.checked);
                setHasChanges(true);
              }}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#10b981',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? '#34d399' : '#f87171' }}>
              {isActive ? (isRtl ? 'نشط (Active)' : 'Active') : (isRtl ? 'معطل (Inactive)' : 'Inactive')}
            </span>
          </label>
        </div>
      </div>

      {/* ── 3. SECTION TAB / HEADER (تبويب "الصلاحيات" كما في الصورة) ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid rgba(16, 185, 129, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span 
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.92rem',
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}
          >
            {isRtl ? 'الصلاحيات' : 'Permissions'}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
            ({selectedPermissions.size} / {totalAvailablePermissions} {isRtl ? 'صلاحية ممنوحة' : 'granted'})
          </span>
        </div>

        {/* إحصائيات وتنبيه التبعية الذكي */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#10b981' }}>
          <ShieldCheck size={14} />
          <span>{isRtl ? 'الاعتمادية المتسلسلة نشطة: أي تعديل يمنح القراءة تلقائياً' : 'Cascading rules active'}</span>
        </div>
      </div>

      {/* ── 4. PERMISSION MATRIX TABLE (مطابق لهيكل ومصفوفة الصورة) ── */}
      <div 
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '2px solid rgba(16, 185, 129, 0.4)' }}>
              {/* عمود اسم الشاشة */}
              <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.88rem', fontWeight: 800, color: '#f3f4f6' }}>
                {isRtl ? 'اسم الشاشة' : 'Screen Name'}
              </th>

              {/* أعمدة العمليات الأربعة: قراءة | انشاء | تعديل | حذف */}
              {ACTION_COLUMNS.map((col) => (
                <th 
                  key={col.key} 
                  style={{ 
                    padding: '0.9rem 1rem', 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    color: '#e5e7eb',
                    textAlign: 'center',
                    width: '120px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                    <span>{isRtl ? col.labelAr : col.labelEn}</span>
                    <button
                      type="button"
                      title={isRtl ? `تحديد/إلغاء عمود ${col.labelAr} للكل` : `Toggle all ${col.labelEn}`}
                      onClick={() => handleToggleColumn(col.key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      {isRtl ? 'تحديد الكل' : 'All'}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoadingScreens ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                  {isRtl ? 'جاري تحميل سجل الشاشات والموارد المصرفية...' : 'Loading dynamic screens catalog...'}
                </td>
              </tr>
            ) : screens.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={28} color="#f59e0b" />
                    <span style={{ fontWeight: 700, color: '#f3f4f6' }}>
                      {isRtl ? 'لم يتم العثور على أنظمة مسجلة أو السيرفر غير متصل' : 'No systems found or backend offline'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                      {isRtl ? 'يرجى التأكد من تشغيل سيرفر المنظومة (Backend API) على المنفذ 4000 لجلب الأنظمة والخدمات الحية' : 'Please ensure Backend API server is running on port 4000 to load live systems'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              groupedScreens.map((grp) => {
                const allGroupChecked = grp.screens.every(s =>
                  s.supportedActions.every(act => selectedPermissions.has(`${s.key}:${act}`))
                );

                return (
                  <React.Fragment key={grp.systemKey}>
                    {/* رأس قسم النظام المصرفي الديناميكي */}
                    <tr style={{ background: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <td colSpan={5} style={{ padding: '0.65rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Layers size={16} color="#34d399" />
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#34d399' }}>
                              {isRtl ? grp.systemName : (grp.systemNameEn || grp.systemName)}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#9ca3af', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }}>
                              {grp.screens.length} {isRtl ? 'شاشة / خدمة' : 'screens'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleSystem(grp.screens)}
                            style={{
                              background: allGroupChecked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                              border: `1px solid ${allGroupChecked ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                              borderRadius: '4px',
                              padding: '0.2rem 0.65rem',
                              color: allGroupChecked ? '#34d399' : '#d1d5db',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {allGroupChecked 
                              ? (isRtl ? 'إلغاء تحديد النظام بالكامل' : 'Deselect System') 
                              : (isRtl ? 'تحديد كافة صلاحيات النظام' : 'Select All System')}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* صفوف شاشات وخدمات هذا النظام */}
                    {grp.screens.map((screen, idx) => {
                      const isEven = idx % 2 === 0;
                      const allScreenChecked = screen.supportedActions.every(act => selectedPermissions.has(`${screen.key}:${act}`));

                      return (
                        <tr 
                          key={screen.key}
                          style={{
                            background: isEven ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.04)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.15s'
                          }}
                        >
                          {/* اسم الشاشة + زر التحديد السريع */}
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f9fafb' }}>
                                  {screen.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                                  {screen.nameAr}
                                </div>
                              </div>

                              {/* زر سريع لتحديد كافة الخانات المتاحة للشاشة */}
                              <button
                                type="button"
                                onClick={() => handleToggleAllForScreen(screen)}
                                style={{
                                  background: allScreenChecked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                  border: `1px solid ${allScreenChecked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                  borderRadius: '4px',
                                  padding: '0.2rem 0.5rem',
                                  color: allScreenChecked ? '#34d399' : '#9ca3af',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {allScreenChecked ? (isRtl ? 'إلغاء الشاشة' : 'Deselect') : (isRtl ? 'كامل الشاشة' : 'Select All')}
                              </button>
                            </div>
                          </td>

                          {/* أعمدة العمليات الأربعة (قراءة | انشاء | تعديل | حذف) */}
                          {ACTION_COLUMNS.map((col) => {
                            const isSupported = screen.supportedActions.includes(col.key);
                            const isChecked = selectedPermissions.has(`${screen.key}:${col.key}`);

                            return (
                              <td 
                                key={col.key} 
                                style={{ 
                                  padding: '0.85rem 1rem', 
                                  textAlign: 'center',
                                  verticalAlign: 'middle'
                                }}
                              >
                                {isSupported ? (
                                  <label
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                                      border: `1px solid ${isChecked ? '#10b981' : 'rgba(255, 255, 255, 0.18)'}`,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleTogglePermission(screen.key, col.key)}
                                      style={{ display: 'none' }}
                                    />
                                    {isChecked && <Check size={16} color="#10b981" strokeWidth={3} />}
                                  </label>
                                ) : (
                                  /* خلية فارغة تماماً ومحجوبة إذا كانت الشاشة لا تدعم هذه العملية */
                                  <span 
                                    style={{ 
                                      display: 'inline-block', 
                                      width: '16px', 
                                      height: '2px', 
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      borderRadius: '1px'
                                    }} 
                                    title={isRtl ? 'العملية غير مدعومة لهذه الشاشة' : 'Action not applicable for this screen'}
                                  />
                                )}
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

      {/* شريط معلومات سفلي وتأكيد الحفظ */}
      <div 
        style={{
          marginTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#9ca3af'
        }}
      >
        <div>
          {isRtl
            ? `مجموع الصلاحيات المسجلة بالدور: ${selectedPermissions.size} من أصل ${totalAvailablePermissions}`
            : `Assigned permissions: ${selectedPermissions.size} of ${totalAvailablePermissions}`}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'none',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1.4rem',
              borderRadius: '6px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? 'حفظ الصلاحيات' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};
