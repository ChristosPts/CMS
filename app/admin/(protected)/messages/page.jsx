import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import MessagesTable from '@/components/admin/MessagesTable';

export const metadata = { title: 'Messages' };

export default async function MessagesPage({ searchParams }) {
  const session = await getServerSession(adminAuthOptions);
  const filter  = searchParams.filter ?? 'all';
  const page    = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const perPage = 20;

  const where = filter === 'unread' ? { read: false } : {};

  const [messages, total, unreadCount] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        sourcePage: {
          select: {
            slug: true,
            translations: { take: 1, select: { title: true } },
          },
        },
      },
    }),
    prisma.message.count({ where }),
    prisma.message.count({ where: { read: false } }),
  ]);

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <h4 className="mb-0">Messages</h4>
        {unreadCount > 0 && (
          <span className="badge bg-danger">{unreadCount} unread</span>
        )}
      </div>

      <MessagesTable
        messages={messages}
        total={total}
        page={page}
        perPage={perPage}
        filter={filter}
        role={session.user.role}
      />
    </div>
  );
}
