import { getServerSession } from 'next-auth';
import { siteAuthOptions } from './auth';

/**
 * Returns the current public-site session, or null if unauthenticated.
 */
export function getSiteSession() {
  return getServerSession(siteAuthOptions);
}

/**
 * Evaluates whether the current session can access content with the given
 * visibility setting.
 *
 * Returns one of:
 *   'allowed'          – access granted
 *   'unauthenticated'  – content requires login; redirect to /auth/login
 *   'forbidden'        – logged in but wrong role; show 404
 */
export function checkVisibility(visibility, restrictedRole, session) {
  if (visibility === 'PUBLIC') return 'allowed';

  if (visibility === 'AUTHENTICATED_ONLY') {
    return session ? 'allowed' : 'unauthenticated';
  }

  if (visibility === 'ROLE_RESTRICTED') {
    if (!session) return 'unauthenticated';
    // If no restrictedRole configured, any authenticated user passes
    if (!restrictedRole) return 'allowed';
    return session.user.role === restrictedRole ? 'allowed' : 'forbidden';
  }

  return 'allowed';
}

/**
 * Builds a Prisma `where` fragment that filters content to only what the
 * current session is allowed to see.
 *
 * Usage:  prisma.article.findMany({ where: { ...visibilityFilter(session), ... } })
 */
export function visibilityFilter(session) {
  if (!session) {
    return { visibility: 'PUBLIC' };
  }

  const conditions = [
    { visibility: 'PUBLIC' },
    { visibility: 'AUTHENTICATED_ONLY' },
  ];

  if (session.user.role) {
    conditions.push({
      visibility:     'ROLE_RESTRICTED',
      restrictedRole: session.user.role,
    });
  }

  return { OR: conditions };
}
