import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Layers, 
  History, 
  Plus, 
  Check, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Search,
  Sliders,
  AlertCircle,
  Building2,
  Globe
} from 'lucide-react';
import { iamService } from '../../services/iamService';
import { UserPublicProfile, UserGroup, AuditLog, PermissionDefinition, UserOverrides, UserType, ResourceScope } from '../../types/auth';
import { useLanguage } from '../../i18n';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { UserOverrideMatrixView } from './UserOverrideMatrixView';
import { CreateUserView } from './CreateUserView';

interface IamManagementViewProps {
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const IamManagementView: React.FC<IamManagementViewProps> = ({ onNotify }) => {
  const { isRtl } = useLanguage();

  const [activeTab, setActiveTab] = useState<'groups' | 'users' | 'audit'>('groups');
  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dedicated Views & Matrix state
  const [isMatrixEditorOpen, setIsMatrixEditorOpen] = useState(false);
  const [selectedGroupForMatrix, setSelectedGroupForMatrix] = useState<UserGroup | null>(null);
  const [isCreateUserViewOpen, setIsCreateUserViewOpen] = useState(false);
  const [selectedUserForOverrides, setSelectedUserForOverrides] = useState<UserPublicProfile | null>(null);

  // Overrides editor state
  const [editingOverrides, setEditingOverrides] = useState<UserOverrides>({
    grantedPermissions: [],
    revokedPermissions: []
  });

  // Search filter for audit
  const [auditSearch, setAuditSearch] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    // ضمان حد أدنى بصري سلس (650ms) لإكمال دورة دوران الأيقونة بنعومة
    const minDelay = new Promise(resolve => setTimeout(resolve, 650));
    try {
      const [u, g, l, p] = await Promise.all([
        iamService.getUsers().catch(() => []),
        iamService.getGroups().catch(() => []),
        iamService.getAuditLogs(150).catch(() => []),
        iamService.getPermissionsCatalog().catch(() => []),
        minDelay
      ]);
      setUsers(u);
      setGroups(g);
      setAuditLogs(l);
      setPermissionsCatalog(p);
    } catch {
      if (onNotify) {
        onNotify('تنبيه', 'حدث خطأ أثناء تحميل بيانات الحوكمة', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Overrides Modal
  const openOverridesModal = (u: UserPublicProfile) => {
    setSelectedUserForOverrides(u);
    setEditingOverrides({
      grantedPermissions: [...(u.overrides?.grantedPermissions || [])],
      revokedPermissions: [...(u.overrides?.revokedPermissions || [])]
    });
  };

  // Save Overrides
  const handleSaveOverrides = async () => {
    if (!selectedUserForOverrides) return;
    try {
      await iamService.updateUserOverrides(selectedUserForOverrides.id, editingOverrides);
      setSelectedUserForOverrides(null);
      loadData();
      if (onNotify) onNotify('تم الحفظ', 'تم تحديث الاستثناءات الفردية للمستخدم بنجاح', 'success');
    } catch (err: any) {
      if (onNotify) onNotify('خطأ', err.message || 'فشل حفظ الصلاحيات', 'error');
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (user: UserPublicProfile) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await iamService.toggleUserStatus(user.id, nextStatus);
      loadData();
      if (onNotify) onNotify('تم التحديث', `تم ${nextStatus === 'ACTIVE' ? 'تنشيط' : 'تجميد'} الحساب بنجاح`, 'info');
    } catch (err: any) {
      if (onNotify) onNotify('خطأ', err.message || 'فشل تعديل حالة الحساب', 'error');
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.username?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.resource?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text, #f9fafb)', margin: 0 }}>
            {isRtl ? 'إدارة المستخدمين والصلاحيات' : 'IAM & Sovereign Access Governance'}
          </h1>
          <p style={{ color: 'var(--text-dim, #9ca3af)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            {isRtl ? 'حوكمة المجموعات، وراثة الصلاحيات التلقائية، والاستثناءات الفردية مع سجل تدقيق غير قابل للتعديل' : 'Manage user groups, automatic permission inheritance, individual overrides, and audit trails.'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1rem',
            background: isLoading ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            color: 'var(--text, #ffffff)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.75 : 1,
            fontSize: '0.84rem',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
          title={isRtl ? 'تحديث ومزامنة البيانات' : 'Refresh and sync data'}
        >
          <RefreshCw size={15} className={isLoading ? 'spin-anim' : ''} />
          <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem'
        }}
      >
        <button
          onClick={() => setActiveTab('groups')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'groups' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'groups' ? '#10b981' : 'var(--text-dim, #9ca3af)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={17} />
          <span>{isRtl ? 'مجموعات المستخدمين (User Groups)' : 'User Groups'}</span>
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px' }}>
            {groups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'users' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'users' ? '#10b981' : 'var(--text-dim, #9ca3af)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={17} />
          <span>{isRtl ? 'المستخدمون والتخصيص الفردي' : 'Users & Overrides'}</span>
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px' }}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'audit' ? '#10b981' : 'var(--text-dim, #9ca3af)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <History size={17} />
          <span>{isRtl ? 'سجل التدقيق الأمني (Audit Trail)' : 'Audit Trail'}</span>
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px' }}>
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: USER GROUPS & PERMISSIONS MATRIX ── */}
      {activeTab === 'groups' && (
        <div>
          {isMatrixEditorOpen ? (
            <RolePermissionMatrix
              initialGroup={selectedGroupForMatrix}
              onSaveSuccess={(_saved) => {
                setIsMatrixEditorOpen(false);
                setSelectedGroupForMatrix(null);
                loadData();
              }}
              onCancel={() => {
                setIsMatrixEditorOpen(false);
                setSelectedGroupForMatrix(null);
              }}
              onNotify={onNotify}
            />
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, color: 'var(--text-dim, #9ca3af)', fontSize: '0.88rem' }}>
                  {isRtl
                    ? 'الأدوار والمجموعات المصرفية السيادية؛ أنشئ الدور واضبط مصفوفة الصلاحيات (قراءة / إنشاء / تعديل / حذف) لكل شاشة ديناميكياً.'
                    : 'Certified Banking Roles; define roles and configure the dynamic permissions matrix (Read/Create/Update/Delete) per screen.'}
                </p>
                <button
                  onClick={() => {
                    setSelectedGroupForMatrix(null);
                    setIsMatrixEditorOpen(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.1rem',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Plus size={16} />
                  <span>{isRtl ? 'إنشاء دور / مصفوفة جديدة' : 'Create Role & Matrix'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {groups.map((grp) => {
                  const membersCount = users.filter(u => u.groupId === grp.id).length;
                  const isGrpActive = grp.status !== 'INACTIVE';

                  return (
                    <div
                      key={grp.id}
                      style={{
                        background: 'var(--bg-card, rgba(17, 24, 39, 0.6))',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text, #f9fafb)' }}>
                              {grp.name}
                            </h3>
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: '0.3rem',
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: isGrpActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: isGrpActive ? '#34d399' : '#f87171',
                                fontWeight: 700
                              }}
                            >
                              {isGrpActive ? (isRtl ? 'نشط' : 'ACTIVE') : (isRtl ? 'معطل' : 'INACTIVE')}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-dim, #9ca3af)',
                              fontWeight: 700
                            }}
                          >
                            {grp.key}
                          </span>
                        </div>

                        <p style={{ color: 'var(--text-dim, #9ca3af)', fontSize: '0.83rem', minHeight: '38px', marginBottom: '1rem' }}>
                          {grp.description || (isRtl ? 'لا يوجد وصف مخصص' : 'No description provided')}
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-dim, #6b7280)', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                            {isRtl ? `الصلاحيات المسندة (${grp.permissions.length}):` : `Assigned Permissions (${grp.permissions.length}):`}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '75px', overflowY: 'auto' }}>
                            {grp.permissions.includes('*') ? (
                              <span style={{ fontSize: '0.74rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                                ⭐ {isRtl ? 'صلاحيات سيادية كاملة (*)' : 'Full Sovereign Access (*)'}
                              </span>
                            ) : grp.permissions.length === 0 ? (
                              <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
                                {isRtl ? 'لا توجد صلاحيات مسندة' : 'No permissions assigned'}
                              </span>
                            ) : (
                              grp.permissions.map(p => (
                                <span key={p} style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.07)', color: 'var(--text, #e5e7eb)', padding: '0.12rem 0.45rem', borderRadius: '4px' }}>
                                  {p}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #9ca3af)' }}>
                          👥 {membersCount} {isRtl ? 'مستخدم' : 'Members'}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroupForMatrix(grp);
                              setIsMatrixEditorOpen(true);
                            }}
                            style={{
                              padding: '0.4rem 0.85rem',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#34d399',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Sliders size={13} />
                            <span>{isRtl ? 'مصفوفة الصلاحيات' : 'Matrix'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: USERS & INDIVIDUAL OVERRIDES (FULL-PAGE SOVEREIGN VIEW) ── */}
      {activeTab === 'users' && (
        <div>
          {isCreateUserViewOpen ? (
            <CreateUserView
              groups={groups}
              onSuccess={(_created) => {
                setIsCreateUserViewOpen(false);
                loadData();
              }}
              onCancel={() => setIsCreateUserViewOpen(false)}
              onNotify={onNotify}
            />
          ) : selectedUserForOverrides ? (
            <UserOverrideMatrixView
              user={selectedUserForOverrides}
              userGroup={groups.find(g => g.id === selectedUserForOverrides.groupId)}
              onClose={() => setSelectedUserForOverrides(null)}
              onSuccess={(_updated) => {
                setSelectedUserForOverrides(null);
                loadData();
              }}
              onNotify={onNotify}
            />
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, color: 'var(--text-dim, #9ca3af)', fontSize: '0.88rem' }}>
                  {isRtl
                    ? 'المستخدمون يرثون صلاحيات مجموعتهم آلياً، وانقر على "تخصيص الصلاحيات" للانتقال للصفحة الرسمية لمصفوفة الشاشات لهذا المستخدم.'
                    : 'Users automatically inherit group permissions. Click "Customize" to open the official screen permissions matrix for this user.'}
                </p>
                <button
                  onClick={() => setIsCreateUserViewOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.1rem',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Plus size={16} />
                  <span>{isRtl ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
                </button>
              </div>

          <div
            style={{
              background: 'var(--bg-card, rgba(17, 24, 39, 0.6))',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'المستخدم' : 'User'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'نوع الحساب والنطاق' : 'Account & Scope'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'المجموعة المسندة' : 'Group'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'الاستثناءات الفردية' : 'Overrides'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)', textAlign: 'center' }}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const grantedCount = u.overrides?.grantedPermissions?.length || 0;
                  const revokedCount = u.overrides?.revokedPermissions?.length || 0;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text, #ffffff)', fontSize: '0.92rem' }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim, #9ca3af)' }}>@{u.username} • {u.email}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {u.userType === 'EXTERNAL' ? (
                          <div>
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: 'rgba(168, 85, 247, 0.15)',
                                color: '#c084fc',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Globe size={12} /> {isRtl ? 'شريك خارجي' : 'External Partner'}
                            </span>
                            <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: '0.3rem', fontWeight: 600 }}>
                              {u.organizationName || u.organizationId || (isRtl ? 'جهة خارجية' : 'External Entity')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                              {isRtl ? 'نطاق الأنظمة:' : 'Systems:'} {u.accessScope?.allowedSystemIds?.join(', ') || '*'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#60a5fa',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Building2 size={12} /> {isRtl ? 'داخلي' : 'Internal'}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
                              {isRtl ? 'وصول مؤسسي غير مقيد' : 'Full enterprise scope'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#60a5fa',
                            fontWeight: 600,
                            fontSize: '0.82rem'
                          }}
                        >
                          {u.groupName || u.groupId}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {u.status === 'ACTIVE' ? (
                          <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <UserCheck size={14} /> {isRtl ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <UserX size={14} /> {isRtl ? 'موقوف' : 'Suspended'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {grantedCount === 0 && revokedCount === 0 ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim, #6b7280)' }}>
                            {isRtl ? 'وراثة قياسية من المجموعة' : 'Standard group inheritance'}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.74rem' }}>
                            {grantedCount > 0 && (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                                +{grantedCount} {isRtl ? 'إضافية' : 'Granted'}
                              </span>
                            )}
                            {revokedCount > 0 && (
                              <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                                -{revokedCount} {isRtl ? 'محجوبة' : 'Revoked'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => openOverridesModal(u)}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Sliders size={13} />
                            <span>{isRtl ? 'تخصيص الصلاحيات' : 'Overrides'}</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            style={{
                              padding: '0.45rem 0.75rem',
                              borderRadius: '6px',
                              background: u.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              border: 'none',
                              color: u.status === 'ACTIVE' ? '#f87171' : '#34d399',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {u.status === 'ACTIVE' ? (isRtl ? 'تجميد' : 'Suspend') : (isRtl ? 'تنشيط' : 'Activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ── TAB 3: AUDIT TRAIL ── */}
      {activeTab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ margin: 0, color: 'var(--text-dim, #9ca3af)', fontSize: '0.88rem' }}>
              {isRtl
                ? 'سجل العمليات الأمني السيادي المباشر غير القابل للتعديل؛ يوثق كافة التحركات وقرارات السماح والمنع.'
                : 'Immutable audit log tracking all operational and security events.'}
            </p>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder={isRtl ? 'بحث في السجل...' : 'Search logs...'}
                style={{
                  width: '100%',
                  padding: '0.5rem 2.2rem',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card, rgba(17, 24, 39, 0.6))',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'التوقيت' : 'Time'}</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'المستخدم' : 'Actor'}</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'العملية' : 'Action'}</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'النتيجة' : 'Result'}</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString(isRtl ? 'ar-SA' : 'en-US');
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-dim, #9ca3af)', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>
                        @{log.username}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', fontFamily: 'monospace', color: '#93c5fd' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        {log.status === 'SUCCESS' ? (
                          <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 700, padding: '0.15rem 0.5rem', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '4px' }}>
                            {isRtl ? 'مقبولة' : 'SUCCESS'}
                          </span>
                        ) : log.status === 'DENIED' ? (
                          <span style={{ color: '#f87171', fontSize: '0.78rem', fontWeight: 700, padding: '0.15rem 0.5rem', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '4px' }}>
                            {isRtl ? 'مرفوضة' : 'DENIED'}
                          </span>
                        ) : (
                          <span style={{ color: '#fbbf24', fontSize: '0.78rem', fontWeight: 700, padding: '0.15rem 0.5rem', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '4px' }}>
                            {log.status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>
                        {log.details || log.resource}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}



    </div>
  );
};
