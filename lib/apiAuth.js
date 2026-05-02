import { getServerSession } from 'next-auth';
import { adminAuthOptions } from './auth';

/**
 * Verifies an admin session exists. Returns { session } or throws a Response.
 */
export async function requireAdminSession() {
  const session = await getServerSession(adminAuthOptions);
  if (!session) {
    return {
      session: null,
      errorResponse: Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }
  return { session, errorResponse: null };
}

/**
 * Verifies the admin session AND that the user has ADMIN role.
 */
export async function requireAdminRole() {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return { session: null, errorResponse };
  if (session.user.role !== 'ADMIN') {
    return {
      session: null,
      errorResponse: Response.json(
        { success: false, error: 'Forbidden — ADMIN role required' },
        { status: 403 }
      ),
    };
  }
  return { session, errorResponse: null };
}
