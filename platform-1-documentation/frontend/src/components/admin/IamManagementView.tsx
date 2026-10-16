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
  Globe,
  Trash2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { iamService } from '../../services/iamService';
import { authService } from '../../services/authService';
import { UserPublicProfile, UserGroup, AuditLog, PermissionDefinition, UserOverrides, UserType, ResourceScope } from '../../types/auth';
import { useLanguage } from '../../i18n';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { UserOverrideMatrixView } from './UserOverrideMatrixView';
import { CreateUserView } from './CreateUserView';
import { SecurityAuditTrailView } from './SecurityAuditTrailView';

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

  // Delete Role State
  const [groupPendingDelete, setGroupPendingDelete] = useState<{ group: UserGroup; membersCount: number } | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // User Management State (Search & Delete)
  const [currentUser, setCurrentUser] = useState<UserPublicProfile | null>(null);
  const [userPendingDelete, setUserPendingDelete] = useState<UserPublicProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    // ضمان حد أدنى بصري سلس (650ms) لإكمال دورة دوران الأيقونة بنعومة
    const minDelay = new Promise(resolve => setTimeout(resolve, 650));
    try {
      const [u, g, l, p, me] = await Promise.all([
        iamService.getUsers().catch(() => []),
        iamService.getGroups().catch(() => []),
        iamService.getAuditLogs(300).catch(() => []),
        iamService.getPermissionsCatalog().catch(() => []),
        authService.getMe().catch(() => null),
        minDelay
      ]);
      setUsers(u);
      setGroups(g);
      setAuditLogs(l);
      setPermissionsCatalog(p);
      if (me) setCurrentUser(me);
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
    if (user.username === 'admin' || user.id === 'usr_admin_01') {
      if (onNotify) onNotify('إجراء محظور سيادياً', 'لا يمكن تجميد حساب المسؤول الرئيسي السيادي للنظام للحفاظ على استقرار المنظومة.', 'warning');
      return;
    }
    if (currentUser?.id === user.id) {
      if (onNotify) onNotify('تنبيه', 'لا يمكنك تجميد حسابك الشخصي النشط حالياً.', 'warning');
      return;
    }
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await iamService.toggleUserStatus(user.id, nextStatus);
      loadData();
      if (onNotify) onNotify('تم التحديث', `تم ${nextStatus === 'ACTIVE' ? 'تنشيط' : 'تجميد'} الحساب بنجاح`, 'info');
    } catch (err: any) {
      if (onNotify) onNotify('خطأ', err.message || 'فشل تعديل حالة الحساب', 'error');
    }
  };
  // Handle requesting role deletion with enterprise integrity checks
  const handleRequestDeleteGroup = (grp: UserGroup, membersCount: number) => {
    if (grp.isSystemDefault || grp.key === 'ADMIN_GROUP') {
      onNotify?.(
        isRtl ? 'إجراء محظور سيادياً' : 'Protected Role',
        isRtl ? 'لا يمكن حذف الأدوار الافتراضية والسيادية للنظام للحفاظ على استقرار المنظومة.' : 'System default roles cannot be deleted.',
        'warning'
      );
      return;
    }

    if (membersCount > 0) {
      onNotify?.(
        isRtl ? 'تعذر حذف الدور' : 'Cannot Delete Role',
        isRtl 
          ? `لا يمكن حذف الدور [${grp.name}] لوجود (${membersCount}) مستخدمين مسندين إليه حالياً. يرجى نقل المستخدمين لدور آخر أولاً.`
          : `Cannot delete role with ${membersCount} active assigned users. Reassign users first.`,
        'error'
      );
      return;
    }

    setGroupPendingDelete({ group: grp, membersCount });
  };

  // Confirm delete role from list view
  const handleConfirmDeleteFromList = async () => {
    if (!groupPendingDelete) return;
    setIsDeletingGroup(true);
    try {
      await iamService.deleteGroup(groupPendingDelete.group.id);
      onNotify?.(
        isRtl ? 'تم الحذف بنجاح' : 'Deleted Successfully',
        isRtl ? `تم حذف الدور [${groupPendingDelete.group.name}] وتوثيق ذلك في سجل التدقيق الأمني` : `Role [${groupPendingDelete.group.name}] deleted successfully`,
        'success'
      );
      setGroupPendingDelete(null);
      loadData();
    } catch (err: any) {
      onNotify?.(
        isRtl ? 'فشل الحذف' : 'Delete Failed',
        err.message || (isRtl ? 'حدث خطأ أثناء محاولة حذف الدور' : 'Failed to delete role'),
        'error'
      );
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // Handle requesting user deletion with enterprise integrity checks
  const handleRequestDeleteUser = (u: UserPublicProfile) => {
    if (u.username === 'admin' || u.id === 'usr_admin') {
      onNotify?.(
        isRtl ? 'حساب سيادي محمي' : 'Protected Account',
        isRtl ? 'لا يمكن حذف حساب المسؤول الرئيسي السيادي للنظام.' : 'Primary admin account cannot be deleted.',
        'warning'
      );
      return;
    }

    if (currentUser && (currentUser.id === u.id || currentUser.username === u.username)) {
      onNotify?.(
        isRtl ? 'إجراء غير متاح' : 'Action Not Allowed',
        isRtl ? 'لا يمكنك حذف حسابك الشخصي النشط حالياً.' : 'You cannot delete your own active account.',
        'warning'
      );
      return;
    }

    setUserPendingDelete(u);
  };

  // Confirm delete user
  const handleConfirmDeleteUser = async () => {
    if (!userPendingDelete) return;
    setIsDeletingUser(true);
    try {
      await iamService.deleteUser(userPendingDelete.id);
      onNotify?.(
        isRtl ? 'تم الحذف بنجاح' : 'Deleted Successfully',
        isRtl 
          ? `تم حذف حساب المستخدم [${userPendingDelete.fullName}] (@${userPendingDelete.username}) وتوثيق ذلك في سجل التدقيق الأمني`
          : `User [${userPendingDelete.fullName}] deleted successfully`,
        'success'
      );
      setUserPendingDelete(null);
      loadData();
    } catch (err: any) {
      onNotify?.(
        isRtl ? 'فشل الحذف' : 'Delete Failed',
        err.message || (isRtl ? 'حدث خطأ أثناء محاولة حذف حساب المستخدم' : 'Failed to delete user'),
        'error'
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Filtered users for instant search
  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.groupName && u.groupName.toLowerCase().includes(q)) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(q))
    );
  });

  return (

    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Tabs Bar & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
            <span>{isRtl ? 'مجموعات المستخدمين' : 'User Groups'}</span>
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
            <span>{isRtl ? 'سجل التدقيق الأمني' : 'Audit Trail'}</span>
            <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px' }}>
              {auditLogs.length}
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activeTab === 'groups' && !isMatrixEditorOpen && (
            <button
              onClick={() => {
                setSelectedGroupForMatrix(null);
                setIsMatrixEditorOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease'
              }}
              title={isRtl ? 'إنشاء دور ومصفوفة جديدة' : 'Create Role & Matrix'}
            >
              <Plus size={18} />
            </button>
          )}

          <button
            onClick={loadData}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: isLoading ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: 'var(--text, #ffffff)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            title={isRtl ? 'تحديث ومزامنة البيانات' : 'Refresh and sync data'}
          >
            <RefreshCw size={15} className={isLoading ? 'spin-anim' : ''} />
          </button>
        </div>
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
              onDeleteSuccess={() => {
                setIsMatrixEditorOpen(false);
                setSelectedGroupForMatrix(null);
                loadData();
              }}
              onCancel={() => {
                setIsMatrixEditorOpen(false);
                setSelectedGroupForMatrix(null);
              }}
              onNotify={onNotify}
              assignedUsersCount={users.filter(u => u.groupId === selectedGroupForMatrix?.id || u.groupId === selectedGroupForMatrix?.key).length}
            />
          ) : (
            <div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {groups.map((grp) => {
                  const membersCount = users.filter(u => u.groupId === grp.id || u.groupId === grp.key).length;
                  const isGrpActive = grp.status !== 'INACTIVE';

                  return (
                    <div
                      key={grp.id}
                      style={{
                        background: 'var(--bg-card, rgba(17, 24, 39, 0.5))',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1.25rem',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        {/* Top Header of Card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text, #f9fafb)' }}>
                            {grp.name}
                          </h3>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-dim, #9ca3af)',
                              fontFamily: 'monospace',
                              fontWeight: 600
                            }}
                          >
                            {grp.key}
                          </span>
                        </div>

                        {/* Clean Status & Metrics */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: isGrpActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: isGrpActive ? '#34d399' : '#f87171',
                              fontWeight: 600
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isGrpActive ? '#10b981' : '#ef4444' }} />
                            {isGrpActive ? (isRtl ? 'نشط' : 'ACTIVE') : (isRtl ? 'معطل' : 'INACTIVE')}
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.78rem',
                              color: 'var(--text-dim, #9ca3af)'
                            }}
                          >
                            <Users size={14} style={{ color: '#9ca3af' }} />
                            <span>{membersCount} {isRtl ? 'مستخدم' : 'Members'}</span>
                          </span>

                          {(grp.id === 'grp_super_admin' || grp.key === 'ADMIN_GROUP' || (grp.permissions || []).includes('*')) && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.74rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                fontWeight: 700
                              }}
                            >
                              <Lock size={11} />
                              {isRtl ? 'مجمد ومحمي سيادياً (*)' : 'Sovereign Frozen (*)'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clean Card Footer / Action */}
                      <div style={{ paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupForMatrix(grp);
                            setIsMatrixEditorOpen(true);
                          }}
                          style={{
                            flex: 1,
                            padding: '0.55rem 1rem',
                            borderRadius: '8px',
                            background: (grp.id === 'grp_super_admin' || grp.key === 'ADMIN_GROUP') ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            border: `1px solid ${(grp.id === 'grp_super_admin' || grp.key === 'ADMIN_GROUP') ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                            color: (grp.id === 'grp_super_admin' || grp.key === 'ADMIN_GROUP') ? '#60a5fa' : '#34d399',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = (grp.id === 'grp_super_admin' || grp.key === 'ADMIN_GROUP') ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)';
                            e.currentTarget.style.borderColor = (grp.id === 'grp_super_admin' || grp.key === 'ADMIN_GROUP') ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                          }}
                        >
                          <Sliders size={14} />
                          <span>{isRtl ? 'مصفوفة الصلاحيات' : 'Matrix'}</span>
                        </button>

                        {!grp.isSystemDefault && grp.key !== 'ADMIN_GROUP' && (
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteGroup(grp, membersCount)}
                            title={membersCount > 0 
                              ? (isRtl ? `لا يمكن حذف الدور لوجود ${membersCount} مستخدمين مسندين إليه` : `Cannot delete: ${membersCount} users assigned`)
                              : (isRtl ? 'حذف الدور' : 'Delete Role')
                            }
                            style={{
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: membersCount > 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(239, 68, 68, 0.08)',
                              border: `1px solid ${membersCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.25)'}`,
                              color: membersCount > 0 ? '#6b7280' : '#f87171',
                              cursor: membersCount > 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* Search & Counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 320px', maxWidth: '480px' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Search
                      size={16}
                      style={{
                        position: 'absolute',
                        [isRtl ? 'right' : 'left']: '0.85rem',
                        color: 'var(--text-dim, #9ca3af)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      placeholder={isRtl ? 'البحث بالاسم، الحساب، أو الدور...' : 'Search by name, username, or role...'}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: isRtl ? '0.6rem 2.4rem 0.6rem 0.85rem' : '0.6rem 0.85rem 0.6rem 2.4rem',
                        background: 'var(--bg-card, rgba(17, 24, 39, 0.6))',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: 'var(--text-main, #ffffff)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    {userSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUserSearchQuery('')}
                        style={{
                          position: 'absolute',
                          [isRtl ? 'left' : 'right']: '0.75rem',
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      padding: '0.45rem 0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--text-dim, #9ca3af)',
                      whiteSpace: 'nowrap',
                      fontWeight: 600
                    }}
                  >
                    {isRtl ? `${filteredUsers.length} مستخدم` : `${filteredUsers.length} Users`}
                  </div>
                </div>

                {/* Add User Button */}
                <button
                  onClick={() => setIsCreateUserViewOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.25rem',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.2s ease'
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
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'المستخدم والجهة' : 'User & Organization'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'مجموعات الصلاحيات (الأدوار)' : 'Assigned Groups / Roles'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'الصلاحيات التراكمية' : 'Effective Permissions'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)' }}>{isRtl ? 'الاستثناءات الفردية' : 'Overrides'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim, #9ca3af)', textAlign: 'center' }}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-dim, #9ca3af)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                        <Users size={34} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: '0.9rem' }}>
                          {userSearchQuery 
                            ? (isRtl ? `لا توجد نتائج مطابقة لـ "${userSearchQuery}"` : `No users match "${userSearchQuery}"`)
                            : (isRtl ? 'لا يوجد مستخدمون مسجلون حالياً' : 'No users found')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const grantedCount = u.overrides?.grantedPermissions?.length || 0;
                    const revokedCount = u.overrides?.revokedPermissions?.length || 0;
                    const hasAll = (u.effectivePermissions || []).includes('*');
                    const assignedGroups = (u.groupNames && u.groupNames.length > 0)
                      ? u.groupNames
                      : (u.groupName ? u.groupName.split(' + ') : [u.groupId]);

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text, #ffffff)', fontSize: '0.92rem' }}>{u.fullName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim, #9ca3af)' }}>@{u.username} • {u.email}</div>
                          {u.organizationName && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                marginTop: '0.35rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94a3b8',
                                fontSize: '0.72rem',
                                border: '1px solid rgba(255, 255, 255, 0.08)'
                              }}
                            >
                              <Building2 size={11} style={{ color: '#38bdf8' }} />
                              <span>{u.organizationName}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {assignedGroups.map((gName, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '0.22rem 0.55rem',
                                  borderRadius: '6px',
                                  background: 'rgba(59, 130, 246, 0.12)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  color: '#60a5fa',
                                  fontWeight: 600,
                                  fontSize: '0.78rem'
                                }}
                              >
                                {gName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {hasAll ? (
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#fca5a5',
                                fontWeight: 700,
                                fontSize: '0.76rem'
                              }}
                            >
                              {isRtl ? 'صلاحيات شاملة (*)' : 'Full Wildcard (*)'}
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#34d399',
                                fontWeight: 700,
                                fontSize: '0.76rem'
                              }}
                            >
                              {u.effectivePermissions?.length || 0} {isRtl ? 'صلاحية نشطة' : 'active perms'}
                            </span>
                          )}
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
                          <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                            <button
                              onClick={() => openOverridesModal(u)}
                              title={
                                u.username === 'admin' || u.id === 'usr_admin_01'
                                  ? (isRtl ? 'صلاحيات المسؤول السيادي مجمدة ومحمية بالكامل (*)' : 'Sovereign admin permissions are frozen (*)')
                                  : (isRtl ? 'تخصيص الصلاحيات الفردية للمستخدم' : 'Screen Permissions Overrides')
                              }
                              style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: '6px',
                                background: u.username === 'admin' || u.id === 'usr_admin_01' ? 'rgba(16, 185, 129, 0.12)' : 'var(--overlay-subtle, rgba(255, 255, 255, 0.08))',
                                border: `1px solid ${u.username === 'admin' || u.id === 'usr_admin_01' ? 'rgba(16, 185, 129, 0.35)' : 'var(--border, rgba(255, 255, 255, 0.15))'}`,
                                color: u.username === 'admin' || u.id === 'usr_admin_01' ? '#34d399' : 'var(--text-main, #ffffff)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              {u.username === 'admin' || u.id === 'usr_admin_01' ? <ShieldCheck size={13} /> : <Sliders size={13} />}
                              <span>{u.username === 'admin' || u.id === 'usr_admin_01' ? (isRtl ? 'الصلاحيات (مجمدة *)' : 'Permissions (*)') : (isRtl ? 'تخصيص الصلاحيات' : 'Overrides')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              disabled={u.username === 'admin' || u.id === 'usr_admin_01' || currentUser?.id === u.id}
                              title={
                                u.username === 'admin' || u.id === 'usr_admin_01'
                                  ? (isRtl ? 'حساب المسؤول السيادي محمي ولا يمكن تجميده' : 'Protected Sovereign Admin')
                                  : currentUser?.id === u.id
                                  ? (isRtl ? 'لا يمكنك تجميد حسابك الشخصي النشط' : 'Cannot suspend own active account')
                                  : u.status === 'ACTIVE'
                                  ? (isRtl ? 'تجميد الحساب' : 'Suspend Account')
                                  : (isRtl ? 'تنشيط الحساب' : 'Activate Account')
                              }
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                background:
                                  u.username === 'admin' || u.id === 'usr_admin_01' || currentUser?.id === u.id
                                    ? 'rgba(255, 255, 255, 0.03)'
                                    : u.status === 'ACTIVE'
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(16, 185, 129, 0.12)',
                                border:
                                  u.username === 'admin' || u.id === 'usr_admin_01' || currentUser?.id === u.id
                                    ? '1px solid rgba(255, 255, 255, 0.08)'
                                    : 'none',
                                color:
                                  u.username === 'admin' || u.id === 'usr_admin_01' || currentUser?.id === u.id
                                    ? 'rgba(255, 255, 255, 0.3)'
                                    : u.status === 'ACTIVE'
                                    ? '#f87171'
                                    : '#34d399',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor:
                                  u.username === 'admin' || u.id === 'usr_admin_01' || currentUser?.id === u.id
                                    ? 'not-allowed'
                                    : 'pointer'
                              }}
                            >
                              {u.status === 'ACTIVE' ? (isRtl ? 'تجميد' : 'Suspend') : (isRtl ? 'تنشيط' : 'Activate')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteUser(u)}
                              disabled={u.username === 'admin' || (currentUser?.id === u.id)}
                              title={
                                u.username === 'admin'
                                  ? (isRtl ? 'حساب المسؤول السيادي لا يمكن حذفه' : 'Protected Sovereign Admin')
                                  : currentUser?.id === u.id
                                  ? (isRtl ? 'لا يمكنك حذف حسابك الشخصي النشط' : 'Cannot delete own active account')
                                  : (isRtl ? 'حذف حساب المستخدم' : 'Delete User')
                              }
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                background: u.username === 'admin' || currentUser?.id === u.id
                                  ? 'rgba(255, 255, 255, 0.02)'
                                  : 'rgba(239, 68, 68, 0.08)',
                                border: `1px solid ${
                                  u.username === 'admin' || currentUser?.id === u.id
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(239, 68, 68, 0.25)'
                                }`,
                                color: u.username === 'admin' || currentUser?.id === u.id ? '#6b7280' : '#f87171',
                                cursor: u.username === 'admin' || currentUser?.id === u.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ── TAB 3: AUDIT TRAIL ── */}
      {activeTab === 'audit' && (
        <SecurityAuditTrailView
          logs={auditLogs}
          isLoading={isLoading}
          onRefresh={loadData}
          onNotify={onNotify}
        />
      )}



      {/* ── Confirmation Modal for Deleting Group from Card Grid ── */}
      {groupPendingDelete && (
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
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          >
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
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                  {isRtl ? 'إجراء رقابي سيادي لا يمكن التراجع عنه' : 'Irreversible Action'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', color: '#d1d5db', fontSize: '0.88rem', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                {isRtl ? 'أنت على وشك حذف الدور المصرفي ' : 'You are about to delete role '}
                <strong style={{ color: 'var(--text-main, #ffffff)', background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.08))', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  {groupPendingDelete.group.name}
                </strong>
                <span style={{ fontFamily: 'monospace', color: '#9ca3af', margin: '0 0.35rem' }}>({groupPendingDelete.group.key})</span>.
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
                  ? 'سيتم حذف مصفوفة الصلاحيات المرتبطة بهذا الدور وتوثيق عملية الحذف في سجل التدقيق الأمني (Audit Trail).'
                  : 'All permission matrix mappings will be purged and recorded in the audit trail.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setGroupPendingDelete(null)}
                disabled={isDeletingGroup}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
                  background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.05))',
                  color: 'var(--text-main, #d1d5db)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: isDeletingGroup ? 'not-allowed' : 'pointer'
                }}
              >
                {isRtl ? 'إلغاء وتراجع' : 'Cancel'}
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDeleteFromList}
                disabled={isDeletingGroup}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isDeletingGroup ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                  opacity: isDeletingGroup ? 0.75 : 1
                }}
              >
                <Trash2 size={16} />
                <span>{isDeletingGroup ? (isRtl ? 'جاري الحذف...' : 'Deleting...') : (isRtl ? 'تأكيد الحذف نهائياً' : 'Delete Role')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Deleting User ── */}
      {userPendingDelete && (
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
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          >
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
                  {isRtl ? 'تأكيد حذف حساب المستخدم' : 'Confirm User Deletion'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                  {isRtl ? 'إجراء رقابي سيادي لا يمكن التراجع عنه' : 'Irreversible Action'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', color: '#d1d5db', fontSize: '0.88rem', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                {isRtl ? 'أنت على وشك حذف حساب المستخدم ' : 'You are about to delete user '}
                <strong style={{ color: 'var(--text-main, #ffffff)', background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.08))', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  {userPendingDelete.fullName}
                </strong>
                <span style={{ fontFamily: 'monospace', color: '#9ca3af', margin: '0 0.35rem' }}>
                  (@{userPendingDelete.username})
                </span>.
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
                  ? 'سيتم حذف حساب المستخدم وجميع استثناءاته الفردية نهائياً من قاعدة البيانات وتوثيق ذلك في سجل التدقيق الأمني (Audit Trail).'
                  : 'The user account and all personal permission overrides will be permanently purged and recorded in the audit trail.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setUserPendingDelete(null)}
                disabled={isDeletingUser}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
                  background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.05))',
                  color: 'var(--text-main, #d1d5db)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: isDeletingUser ? 'not-allowed' : 'pointer'
                }}
              >
                {isRtl ? 'إلغاء وتراجع' : 'Cancel'}
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isDeletingUser ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                  opacity: isDeletingUser ? 0.75 : 1
                }}
              >
                <Trash2 size={16} />
                <span>{isDeletingUser ? (isRtl ? 'جاري الحذف...' : 'Deleting...') : (isRtl ? 'تأكيد الحذف نهائياً' : 'Delete User')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

