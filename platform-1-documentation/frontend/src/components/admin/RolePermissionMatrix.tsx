import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Save, 
  ArrowRight, 
  Layers, 
  Check, 
  X, 
  AlertCircle,
  Trash2,
  AlertTriangle,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { ScreenResourceDefinition, ScreenActionType, UserGroup } from '../../types/auth';
import { iamService } from '../../services/iamService';
import { useLanguage } from '../../i18n';

interface RolePermissionMatrixProps {
  initialGroup?: UserGroup | null;
  onSaveSuccess: (savedGroup: UserGroup) => void;
  onCancel: () => void;
  onDeleteSuccess?: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  assignedUsersCount?: number;
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
  onDeleteSuccess,
  onNotify,
  assignedUsersCount = 0
}) => {
  const { isRtl } = useLanguage();

  // Screen resources loaded dynamically from backend/catalog
  const [screens, setScreens] = useState<ScreenResourceDefinition[]>([]);
  const [isLoadingScreens, setIsLoadingScreens] = useState(true);

  // Deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to check if group is system super admin
  const isGroupAdmin = useCallback((grp?: UserGroup | null) => {
    if (!grp) return false;
    return (grp.permissions || []).includes('*') || grp.key === 'ADMIN_GROUP' || grp.id === 'grp_super_admin';
  }, []);

  // Form State
  const [roleName, setRoleName] = useState(initialGroup?.name || '');
  const [roleKey, setRoleKey] = useState(initialGroup?.key || '');
  const [roleDesc, setRoleDesc] = useState(initialGroup?.description || '');
  const [isActive, setIsActive] = useState<boolean>(initialGroup?.status !== 'INACTIVE');
  
  // Selected Permissions: Map of screenKey -> Set of action strings
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(() => {
    const initSet = new Set(initialGroup?.permissions || []);
    if (isGroupAdmin(initialGroup)) {
      initSet.add('*');
    }
    return initSet;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if a specific screen action is permitted
  const isPermissionChecked = useCallback((screenKey: string, action: ScreenActionType) => {
    // 1. Full Admin Wildcard
    if (selectedPermissions.has('*')) return true;

    // 2. Direct exact match
    const directKey = `${screenKey}:${action}`;
    if (selectedPermissions.has(directKey)) return true;

    // 3. Screen Wildcard (e.g. "banking:ips:*")
    if (selectedPermissions.has(`${screenKey}:*`)) return true;

    // 4. Prefix Wildcard (e.g. "catalog:*")
    const [prefix] = screenKey.split(':');
    if (prefix && selectedPermissions.has(`${prefix}:*`)) return true;

    // 5. Cross-domain mapping for legacy catalog permissions
    if (screenKey.startsWith('catalog:') && action === 'create') {
      if (selectedPermissions.has('catalog:system:create') || selectedPermissions.has('catalog:endpoint:create')) return true;
    }
    if (screenKey.startsWith('catalog:') && action === 'delete') {
      if (selectedPermissions.has('catalog:system:delete') || selectedPermissions.has('catalog:endpoint:delete')) return true;
    }
    if (screenKey.startsWith('catalog:') && action === 'read') {
      if (selectedPermissions.has('catalog:spec:export') || selectedPermissions.has('catalog:system:create') || selectedPermissions.has('catalog:endpoint:create')) return true;
    }

    return false;
  }, [selectedPermissions]);

  // Fetch dynamic screens catalog
  useEffect(() => {
    let isMounted = true;
    setIsLoadingScreens(true);
    iamService.getScreenResources()
      .then((res) => {
        if (isMounted) {
          setScreens(res);
          setIsLoadingScreens(false);
          if (isGroupAdmin(initialGroup)) {
            const allSet = new Set<string>(['*']);
            res.forEach(s => {
              s.supportedActions.forEach(act => allSet.add(`${s.key}:${act}`));
            });
            setSelectedPermissions(allSet);
          }
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingScreens(false);
      });

    return () => { isMounted = false; };
  }, [initialGroup, isGroupAdmin]);

  // Update form if initialGroup or screens change
  useEffect(() => {
    if (initialGroup) {
      setRoleName(initialGroup.name || '');
      setRoleKey(initialGroup.key || '');
      setRoleDesc(initialGroup.description || '');
      setIsActive(initialGroup.status !== 'INACTIVE');

      const isFullAdmin = isGroupAdmin(initialGroup);

      if (isFullAdmin) {
        const fullPerms = new Set<string>(['*']);
        if (screens.length > 0) {
          screens.forEach(s => {
            s.supportedActions.forEach(act => fullPerms.add(`${s.key}:${act}`));
          });
        }
        setSelectedPermissions(fullPerms);
      } else {
        const nextSet = new Set(initialGroup.permissions || []);
        if (screens.length > 0) {
          screens.forEach(s => {
            s.supportedActions.forEach(act => {
              if (
                nextSet.has(`${s.key}:${act}`) ||
                nextSet.has(`${s.key}:*`) ||
                (s.key.startsWith('catalog:') && act === 'create' && (nextSet.has('catalog:system:create') || nextSet.has('catalog:endpoint:create'))) ||
                (s.key.startsWith('catalog:') && act === 'delete' && (nextSet.has('catalog:system:delete') || nextSet.has('catalog:endpoint:delete'))) ||
                (s.key.startsWith('catalog:') && act === 'read' && (nextSet.has('catalog:spec:export') || nextSet.has('catalog:system:create') || nextSet.has('catalog:endpoint:create')))
              ) {
                nextSet.add(`${s.key}:${act}`);
                if (act !== 'read' && s.supportedActions.includes('read')) {
                  nextSet.add(`${s.key}:read`);
                }
              }
            });
          });
        }
        setSelectedPermissions(nextSet);
      }
      setHasChanges(false);
    }
  }, [initialGroup, screens, isGroupAdmin]);

  // Total available permissions count
  const totalAvailablePermissions = useMemo(() => {
    return screens.reduce((acc, s) => acc + s.supportedActions.length, 0);
  }, [screens]);

  // Effective granted permissions count
  const effectiveCount = useMemo(() => {
    if (selectedPermissions.has('*') || isGroupAdmin(initialGroup)) {
      return totalAvailablePermissions;
    }
    let count = 0;
    screens.forEach(s => {
      s.supportedActions.forEach(act => {
        if (isPermissionChecked(s.key, act)) {
          count++;
        }
      });
    });
    return count;
  }, [selectedPermissions, screens, initialGroup, totalAvailablePermissions, isPermissionChecked, isGroupAdmin]);

  /**
   * معالجة النقر على مربع اختيار الصلاحية
   * تطبيق قاعدة الاعتمادية المتسلسلة (Cascading Dependency Rule):
   * 1. تفعيل (إنشاء أو تعديل أو حذف) يفعل تلقائياً (قراءة) لنفس الشاشة.
   * 2. إلغاء (قراءة) يلغي تلقائياً باقي العمليات لنفس الشاشة.
   */
  const isSovereignFrozen = isGroupAdmin(initialGroup);

  const handleTogglePermission = useCallback((screenKey: string, action: ScreenActionType) => {
    if (isSovereignFrozen) {
      onNotify?.(
        isRtl ? 'صلاحيات سيادية مجمدة' : 'Sovereign Permissions Frozen',
        isRtl ? 'صلاحيات دور مدير النظام مجمدة ومحمية بالكامل (*) ولا يمكن تعديلها.' : 'Admin role permissions are permanently frozen and immutable.',
        'warning'
      );
      return;
    }

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      const permKey = `${screenKey}:${action}`;

      // Materialize full set if '*' was present
      if (next.has('*')) {
        next.delete('*');
        screens.forEach(s => {
          s.supportedActions.forEach(act => next.add(`${s.key}:${act}`));
        });
      }

      const currentlyChecked = next.has(permKey);

      if (currentlyChecked) {
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
  }, [screens, isSovereignFrozen, onNotify, isRtl]);

  // تحديد كامل العمليات المدعومة لشاشة معينة
  const handleToggleAllForScreen = useCallback((screen: ScreenResourceDefinition) => {
    if (isSovereignFrozen) return;

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has('*')) {
        next.delete('*');
        screens.forEach(s => {
          s.supportedActions.forEach(act => next.add(`${s.key}:${act}`));
        });
      }

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
  }, [screens, isSovereignFrozen]);

  // تحديد عمود كامل (مثلاً: قراءة للكل)
  const handleToggleColumn = useCallback((action: ScreenActionType) => {
    if (isSovereignFrozen) return;

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has('*')) {
        next.delete('*');
        screens.forEach(s => {
          s.supportedActions.forEach(act => next.add(`${s.key}:${act}`));
        });
      }

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
      let permArray = Array.from(selectedPermissions);

      // Preserve full wildcard for admin role or when 100% permissions are selected
      if (
        selectedPermissions.has('*') ||
        (screens.length > 0 && effectiveCount >= totalAvailablePermissions) ||
        calculatedKey === 'ADMIN_GROUP' ||
        initialGroup?.key === 'ADMIN_GROUP'
      ) {
        if (!permArray.includes('*')) {
          permArray.push('*');
        }
      }

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

  // Enterprise Role Deletion Protection Checks
  const isDeleteDisabled = Boolean(
    initialGroup?.isSystemDefault ||
    initialGroup?.key === 'ADMIN_GROUP' ||
    assignedUsersCount > 0
  );

  const deleteDisabledReason = initialGroup?.isSystemDefault || initialGroup?.key === 'ADMIN_GROUP'
    ? (isRtl ? 'دور سيادي افتراضي للنظام غير قابل للحذف' : 'System default sovereign role cannot be deleted')
    : assignedUsersCount > 0
      ? (isRtl ? `لا يمكن حذف الدور: يوجد (${assignedUsersCount}) مستخدم مسند إليه حالياً` : `Cannot delete: ${assignedUsersCount} users assigned`)
      : (isRtl ? 'حذف الدور من المنظومة' : 'Delete Role');

  const handleInitiateDelete = () => {
    if (!initialGroup?.id) return;
    if (initialGroup.isSystemDefault || initialGroup.key === 'ADMIN_GROUP') {
      onNotify?.(
        isRtl ? 'إجراء محظور سيادياً' : 'Protected Role',
        isRtl ? 'لا يمكن حذف الأدوار الافتراضية والسيادية للنظام للحفاظ على استقرار المنظومة.' : 'System default roles are protected from deletion.',
        'warning'
      );
      return;
    }

    if (assignedUsersCount > 0) {
      onNotify?.(
        isRtl ? 'تعذر حذف الدور' : 'Cannot Delete Role',
        isRtl 
          ? `لا يمكن حذف هذا الدور لوجود (${assignedUsersCount}) مستخدمين مسندين إليه حالياً. يرجى نقل المستخدمين لدور آخر أولاً.`
          : `Cannot delete role with ${assignedUsersCount} active assigned users. Reassign users first.`,
        'error'
      );
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!initialGroup?.id) return;
    setIsDeleting(true);
    try {
      await iamService.deleteGroup(initialGroup.id);
      onNotify?.(
        isRtl ? 'تم الحذف بنجاح' : 'Deleted Successfully',
        isRtl ? `تم حذف الدور [${initialGroup.name}] وتوثيق ذلك في سجل التدقيق الأمني` : `Role [${initialGroup.name}] deleted successfully`,
        'success'
      );
      setIsDeleteModalOpen(false);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        onCancel();
      }
    } catch (err: any) {
      onNotify?.(
        isRtl ? 'فشل الحذف' : 'Delete Failed',
        err.message || (isRtl ? 'حدث خطأ أثناء محاولة حذف الدور' : 'Failed to delete role'),
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      style={{
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '1.75rem',
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: 'var(--shadow-card)'
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
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
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
          
          {initialGroup && (
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #f9fafb)' }}>
              {isRtl ? `تعديل الدور: ${initialGroup.name}` : `Edit Role: ${initialGroup.name}`}
            </h2>
          )}

          {/* عداد الصلاحيات الممنوحة مدمج بأعلى الصفحة بدون أخذ مساحة رأسية إضافية */}
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
            <span style={{ color: 'var(--text-main, #d1d5db)', fontWeight: 700 }}>{isRtl ? 'الصلاحيات' : 'Permissions'}</span>
            <span style={{ color: '#10b981', fontWeight: 800 }}>
              ({effectiveCount} / {totalAvailablePermissions} {isRtl ? 'صلاحية ممنوحة' : 'granted'})
            </span>
          </div>
        </div>

        {/* زر الحذف وزر الحفظ الأخضر الرئيسي */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {initialGroup?.id && (
            <button
              type="button"
              onClick={handleInitiateDelete}
              disabled={isSubmitting || isDeleting || isDeleteDisabled}
              title={deleteDisabledReason}
              style={{
                background: isDeleteDisabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(239, 68, 68, 0.1)',
                color: isDeleteDisabled ? '#6b7280' : '#f87171',
                border: `1px solid ${isDeleteDisabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '8px',
                padding: '0.65rem 1.15rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isDeleteDisabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s',
                opacity: isDeleteDisabled ? 0.6 : 1
              }}
            >
              <Trash2 size={16} />
              <span>{isRtl ? 'حذف الدور' : 'Delete Role'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSubmitting || isDeleting || isSovereignFrozen}
            title={isSovereignFrozen ? (isRtl ? 'صلاحيات هذا الدور السيادي مجمدة ومحمية بالكامل (*)' : 'Sovereign role permissions are permanently frozen (*)') : undefined}
            style={{
              background: isSovereignFrozen ? 'rgba(16, 185, 129, 0.15)' : '#10b981',
              color: isSovereignFrozen ? '#34d399' : '#ffffff',
              border: isSovereignFrozen ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.6rem',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: (isSubmitting || isDeleting || isSovereignFrozen) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isSovereignFrozen ? 'none' : hasChanges ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s',
              opacity: (isSubmitting || isDeleting) ? 0.7 : 1
            }}
          >
            {isSovereignFrozen ? <Lock size={16} /> : <Save size={16} />}
            <span>
              {isSubmitting
                ? (isRtl ? 'جاري الحفظ...' : 'Saving...')
                : isSovereignFrozen
                ? (isRtl ? 'الصلاحيات مجمدة سيادياً (*)' : 'Sovereign Frozen (*)')
                : (isRtl ? 'حفظ' : 'Save')}
            </span>
          </button>
        </div>
      </div>

      {/* ── 2. METADATA SECTION (الاسم + الحالة كما في الصورة) ── */}
      <div 
        style={{
          background: 'var(--overlay-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          alignItems: 'center'
        }}
      >
        {/* حقل الاسم */}
        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-muted, #e5e7eb)' }}>
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
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--text-main, #ffffff)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* حقل رمز الدور (Key) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-muted, #e5e7eb)' }}>
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
              border: '1px solid var(--border)',
              background: initialGroup ? 'var(--overlay-subtle)' : 'var(--bg-input)',
              color: initialGroup ? 'var(--text-dim, #9ca3af)' : 'var(--text-main, #ffffff)',
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


      {/* ── 3.5 SOVEREIGN FROZEN BANNER ── */}
      {isSovereignFrozen && (
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
              <span>{isRtl ? 'صلاحيات سيادية مجمدة ومحمية بالكامل (*)' : 'Sovereign Permissions Frozen & Protected (*)'}</span>
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
                {isRtl ? 'غير قابلة للتعديل' : 'Immutable'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)', lineHeight: 1.55 }}>
              {isRtl
                ? 'يتمتع دور مدير النظام بالصلاحية الشاملة الكاملة (*) الدائمة لكافة الشاشات والعمليات. تم قفل وتجميد تعديل الصلاحيات لحماية استقرار المنظومة وضمان عدم تجزئة السيادة أو الإغلاق العرضي.'
                : 'The Admin role possesses permanent full wildcard (*) permissions. All permissions are permanently frozen and protected from modification.'}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. PERMISSION MATRIX TABLE (مطابق لهيكل ومصفوفة الصورة) ── */}
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
              {/* عمود اسم الشاشة */}
              <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #f3f4f6)' }}>
                {isRtl ? 'اسم الشاشة' : 'Screen Name'}
              </th>

              {/* أعمدة العمليات الأربعة: قراءة | انشاء | تعديل | حذف */}
              {ACTION_COLUMNS.map((col) => {
                const applicableScreens = screens.filter(s => s.supportedActions.includes(col.key));
                const isAllChecked = applicableScreens.length > 0 && applicableScreens.every(s => isPermissionChecked(s.key, col.key));
                const isSomeChecked = !isAllChecked && applicableScreens.some(s => isPermissionChecked(s.key, col.key));

                return (
                  <th 
                    key={col.key} 
                    style={{ 
                      padding: '0.75rem 1rem', 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      color: 'var(--text-muted, #e5e7eb)',
                      textAlign: 'center',
                      width: '120px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{isRtl ? col.labelAr : col.labelEn}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleColumn(col.key)}
                        disabled={isSovereignFrozen}
                        title={
                          isSovereignFrozen
                            ? (isRtl ? 'صلاحيات سيادية مجمدة ومحمية بالكامل (*)' : 'Sovereign permissions frozen (*)')
                            : isAllChecked 
                              ? (isRtl ? `إلغاء تحديد كل ${col.labelAr}` : `Deselect all ${col.labelEn}`)
                              : (isRtl ? `تحديد كل ${col.labelAr}` : `Select all ${col.labelEn}`)
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: isAllChecked 
                            ? 'rgba(16, 185, 129, 0.2)' 
                            : isSomeChecked 
                              ? 'rgba(16, 185, 129, 0.1)' 
                              : 'rgba(0, 0, 0, 0.35)',
                          border: `1.5px solid ${isAllChecked ? '#10b981' : isSomeChecked ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.25)'}`,
                          cursor: isSovereignFrozen ? 'not-allowed' : 'pointer',
                          opacity: isSovereignFrozen ? 0.75 : 1,
                          transition: 'all 0.15s ease',
                          padding: 0
                        }}
                      >
                        {isAllChecked && <Check size={15} color="#10b981" strokeWidth={3} />}
                        {!isAllChecked && isSomeChecked && (
                          <div style={{ width: '10px', height: '2px', background: '#34d399', borderRadius: '1px' }} />
                        )}
                      </button>
                    </div>
                  </th>
                );
              })}
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
                return (
                  <React.Fragment key={grp.systemKey}>
                    {/* رأس قسم النظام المصرفي الديناميكي */}
                    <tr style={{ background: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <td colSpan={5} style={{ padding: '0.65rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Layers size={16} color="#34d399" />
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#34d399' }}>
                            {isRtl ? grp.systemName : (grp.systemNameEn || grp.systemName)}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#9ca3af', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }}>
                            {grp.screens.length} {isRtl ? 'شاشة / خدمة' : 'screens'}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* صفوف شاشات وخدمات هذا النظام */}
                    {grp.screens.map((screen, idx) => {
                      const isEven = idx % 2 === 0;
                      const allScreenChecked = screen.supportedActions.every(act => isPermissionChecked(screen.key, act));

                      return (
                        <tr 
                          key={screen.key}
                          style={{
                            background: isEven ? 'var(--table-row-alt)' : 'var(--table-row-hover)',
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s'
                          }}
                        >
                          {/* اسم الشاشة + زر التحديد السريع */}
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main, #f9fafb)' }}>
                                  {screen.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #9ca3af)', marginTop: '0.15rem' }}>
                                  {screen.nameAr}
                                </div>
                              </div>

                              {/* زر سريع لتحديد كافة الخانات المتاحة للشاشة */}
                              <button
                                type="button"
                                onClick={() => handleToggleAllForScreen(screen)}
                                disabled={isSovereignFrozen}
                                style={{
                                  background: allScreenChecked ? 'rgba(16, 185, 129, 0.12)' : 'var(--overlay-subtle)',
                                  border: `1px solid ${allScreenChecked ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                                  borderRadius: '4px',
                                  padding: '0.2rem 0.5rem',
                                  color: allScreenChecked ? '#34d399' : 'var(--text-muted, #9ca3af)',
                                  fontSize: '0.68rem',
                                  cursor: isSovereignFrozen ? 'not-allowed' : 'pointer',
                                  opacity: isSovereignFrozen ? 0.75 : 1
                                }}
                              >
                                {allScreenChecked ? (isRtl ? 'إلغاء الشاشة' : 'Deselect') : (isRtl ? 'كامل الشاشة' : 'Select All')}
                              </button>
                            </div>
                          </td>

                          {/* أعمدة العمليات الأربعة (قراءة | انشاء | تعديل | حذف) */}
                          {ACTION_COLUMNS.map((col) => {
                            const isSupported = screen.supportedActions.includes(col.key);
                            const isChecked = isPermissionChecked(screen.key, col.key);

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
                                    title={isSovereignFrozen ? (isRtl ? 'صلاحية سيادية مجمدة ومحمية بالكامل (*)' : 'Sovereign permission frozen (*)') : undefined}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'var(--overlay-subtle)',
                                      border: `1px solid ${isChecked ? '#10b981' : 'var(--border)'}`,
                                      cursor: isSovereignFrozen ? 'not-allowed' : 'pointer',
                                      opacity: isSovereignFrozen ? 0.85 : 1,
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={isSovereignFrozen}
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
            ? `مجموع الصلاحيات المسجلة بالدور: ${effectiveCount} من أصل ${totalAvailablePermissions}`
            : `Assigned permissions: ${effectiveCount} of ${totalAvailablePermissions}`}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {initialGroup?.id && (
            <button
              type="button"
              onClick={handleInitiateDelete}
              disabled={isSubmitting || isDeleting || isDeleteDisabled}
              title={deleteDisabledReason}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: `1px solid ${isDeleteDisabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.25)'}`,
                background: isDeleteDisabled ? 'none' : 'rgba(239, 68, 68, 0.08)',
                color: isDeleteDisabled ? '#6b7280' : '#f87171',
                cursor: isDeleteDisabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <Trash2 size={14} />
              <span>{isRtl ? 'حذف الدور' : 'Delete'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'none',
              color: '#9ca3af',
              cursor: isDeleting ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSubmitting || isDeleting}
            style={{
              padding: '0.5rem 1.4rem',
              borderRadius: '6px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              cursor: (isSubmitting || isDeleting) ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? 'حفظ الصلاحيات' : 'Save Permissions'}
          </button>
        </div>
      </div>

      {/* ── Enterprise Delete Confirmation Modal ── */}
      {isDeleteModalOpen && initialGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            direction: isRtl ? 'rtl' : 'ltr'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #1f2937)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-dropdown)'
            }}
          >
            {/* Header with Danger Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #f9fafb)' }}>
                  {isRtl ? 'تأكيد حذف الدور من المنظومة' : 'Confirm Role Deletion'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim, #9ca3af)' }}>
                  {isRtl ? 'إجراء رقابي سيادي لا يمكن التراجع عنه' : 'Irreversible Action'}
                </span>
              </div>
            </div>

            {/* Description Body */}
            <div style={{ marginBottom: '1.5rem', color: 'var(--text-muted, #d1d5db)', fontSize: '0.88rem', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                {isRtl
                  ? `أنت على وشك حذف الدور المصرفي `
                  : `You are about to permanently delete the role `}
                <strong style={{ color: 'var(--text-main, #ffffff)', background: 'var(--overlay-hover)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  {initialGroup.name}
                </strong>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-dim, #9ca3af)', margin: '0 0.35rem' }}>({initialGroup.key})</span>.
              </p>
              
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: '#fca5a5'
                }}
              >
                {isRtl
                  ? 'سيتم حذف مصفوفة الصلاحيات المرتبطة بهذا الدور بالكامل، وتوثيق عملية الحذف في سجل التدقيق الأمني (Audit Trail).'
                  : 'All permission matrix mappings will be purged, and this event will be permanently recorded in the sovereign audit trail.'}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--overlay-subtle)',
                  color: 'var(--text-muted, #d1d5db)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                {isRtl ? 'إلغاء وتراجع' : 'Cancel'}
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                  opacity: isDeleting ? 0.75 : 1
                }}
              >
                <Trash2 size={16} />
                <span>{isDeleting ? (isRtl ? 'جاري الحذف...' : 'Deleting...') : (isRtl ? 'تأكيد الحذف نهائياً' : 'Delete Role')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
