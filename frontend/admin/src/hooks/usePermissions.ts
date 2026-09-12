import { useAdminAuth } from "../context/AuthContext";

export function usePermissions() {
  const { user } = useAdminAuth();

  const isSuperAdmin = !!(user?.isSuperAdmin || user?.role === "SUPER_ADMIN");

  const effectivePermissions: string[] = user?.effectivePermissions || [];
  const dataScopes: string[] = user?.dataScopes || [];
  const roles = user?.roles || [];

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return effectivePermissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissionCodes.some((code) => effectivePermissions.includes(code));
  };

  const hasAllPermissions = (permissionCodes: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissionCodes.every((code) => effectivePermissions.includes(code));
  };

  const hasDataScope = (scope: string): boolean => {
    if (isSuperAdmin || dataScopes.includes("GLOBAL")) return true;
    return dataScopes.includes(scope);
  };

  return {
    user,
    roles,
    isSuperAdmin,
    effectivePermissions,
    dataScopes,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasDataScope,
    role: roles[0]?.name || user?.role || "GUEST",
  };
}
