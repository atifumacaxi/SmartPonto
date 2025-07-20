import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { hasPermission, permissions } = useAuth();

  return {
    hasPermission,
    permissions,
    canViewAdminDashboard: hasPermission('view_admin_dashboard'),
    canManageUserRoles: hasPermission('manage_user_roles'),
    canViewAllUsers: hasPermission('view_all_users'),
    canViewAllTimeEntries: hasPermission('view_all_time_entries'),
    canViewOwnTimeEntries: hasPermission('view_own_time_entries'),
    canCreateTimeEntries: hasPermission('create_own_time_entries'),
    canUpdateTimeEntries: hasPermission('update_own_time_entries'),
    canDeleteTimeEntries: hasPermission('delete_own_time_entries'),
    canManageOwnTargets: hasPermission('manage_own_targets'),
    canViewAllTargets: hasPermission('view_all_targets'),
    isAdmin: permissions?.role === 'admin',
    isBoss: permissions?.role === 'boss',
    isNormalUser: permissions?.role === 'normal',
  };
};
