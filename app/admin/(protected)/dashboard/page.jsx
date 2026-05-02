import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await getServerSession(adminAuthOptions);

  const [pageCount, articleCount, messageCount, unreadCount] =
    await Promise.all([
      prisma.page.count(),
      prisma.article.count(),
      prisma.message.count(),
      prisma.message.count({ where: { read: false } }),
    ]);

  return (
    <div>
      <h4 className="mb-4">Dashboard</h4>

      <div className="row g-3">
        <StatCard
          label="Pages"
          value={pageCount}
          icon="layout-text-sidebar-reverse"
          href="/admin/pages"
          color="primary"
        />
        <StatCard
          label="Articles"
          value={articleCount}
          icon="file-earmark-text"
          href="#"
          color="info"
        />
        <StatCard
          label="Messages"
          value={messageCount}
          icon="envelope"
          href="/admin/messages"
          color="success"
          badge={unreadCount > 0 ? unreadCount : null}
        />
      </div>

      <div className="mt-4 p-3 bg-white rounded border small text-muted">
        Logged in as <strong>{session?.user?.username}</strong> &middot; Role:{' '}
        <strong>{session?.user?.role}</strong>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, href, color, badge }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <a href={href} className="text-decoration-none">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex align-items-center gap-3">
            <div className={`text-${color} fs-2`}>
              <i className={`bi bi-${icon}`} />
            </div>
            <div>
              <div className="fw-semibold fs-4">
                {value}
                {badge && (
                  <span className="badge bg-danger ms-2 fs-6">{badge}</span>
                )}
              </div>
              <div className="text-muted small">{label}</div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
