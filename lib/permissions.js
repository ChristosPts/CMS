/**
 * Returns true if the admin session user can permanently delete content.
 */
export function canDelete(session) {
  return session?.user?.role === 'ADMIN';
}

/**
 * Returns true if the admin session user can edit slugs.
 */
export function canEditSlug(session) {
  return session?.user?.role === 'ADMIN';
}

/**
 * Returns true if the admin session user can access Settings or Navbar.
 */
export function canAccessAdminOnly(session) {
  return session?.user?.role === 'ADMIN';
}

/**
 * Returns true if the admin session user can create accounts of a given role.
 * ADMIN can create any role. MODERATOR can create MODERATOR and USER only.
 */
export function canCreateRole(session, targetRole) {
  if (session?.user?.role === 'ADMIN') return true;
  if (session?.user?.role === 'MODERATOR') {
    return targetRole === 'MODERATOR' || targetRole === 'USER';
  }
  return false;
}
