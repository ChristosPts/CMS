import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import SiteUsersPanel  from '@/components/admin/SiteUsersPanel';

export const metadata = { title: 'Users' };

export default async function UsersPage({ searchParams }) {
  const session = await getServerSession(adminAuthOptions);
  const sp = await searchParams;
  const tab = sp.tab === 'site' ? 'site' : 'admin';

  // Fetch admin users for the CMS tab
  const adminUsers = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select:  { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return (
    <div>
      <h4 className="mb-4">Users</h4>

      {/* Tab nav */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <a className={`nav-link ${tab === 'admin' ? 'active' : ''}`} href="?tab=admin">
            <i className="bi bi-shield-lock me-1" />CMS Users
          </a>
        </li>
        <li className="nav-item">
          <a className={`nav-link ${tab === 'site' ? 'active' : ''}`} href="?tab=site">
            <i className="bi bi-people me-1" />Site Users
          </a>
        </li>
      </ul>

      {tab === 'admin' ? (
        <AdminUsersPanel
          initialUsers={adminUsers}
          currentUserId={parseInt(session.user.id, 10)}
          currentUserRole={session.user.role}
        />
      ) : (
        <SiteUsersPanel role={session.user.role} />
      )}
    </div>
  );
}
