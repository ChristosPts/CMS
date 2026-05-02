'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function MessagesTable({ messages: initial, total, page, perPage, filter, role }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [messages, setMessages]    = useState(initial);
  const [expanded, setExpanded]    = useState(null);
  const [pending, startTransition] = useTransition();

  function navigate(updates) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  async function markRead(id, read) {
    await fetch(`/api/admin/messages/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ read }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read } : m));
    startTransition(() => router.refresh()); // refresh sidebar unread count
  }

  async function deleteMessage(id) {
    if (!confirm('Delete this message?')) return;
    await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => router.refresh());
  }

  function toggleExpand(id, isUnread) {
    setExpanded((prev) => (prev === id ? null : id));
    if (isUnread) markRead(id, true);
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      {/* Filter tabs */}
      <ul className="nav nav-tabs mb-3">
        {[['all', 'All'], ['unread', 'Unread']].map(([val, label]) => (
          <li key={val} className="nav-item">
            <button
              className={`nav-link ${filter === val ? 'active' : ''}`}
              onClick={() => navigate({ filter: val === 'all' ? '' : val, page: '1' })}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {messages.length === 0 && (
        <div className="text-center text-muted py-5">
          {filter === 'unread' ? 'No unread messages.' : 'No messages yet.'}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        {messages.map((msg, idx) => {
          const isExpanded  = expanded === msg.id;
          const sourceTitle = msg.sourcePage?.translations?.[0]?.title ?? msg.sourcePage?.slug;

          return (
            <div key={msg.id} className={`border-bottom ${!msg.read ? 'bg-light' : ''}`}>
              {/* ── Summary row ───────────��─────────────────────────────── */}
              <div
                className="d-flex align-items-center gap-2 px-3 py-2 cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleExpand(msg.id, !msg.read)}
              >
                {/* Unread indicator */}
                <div style={{ width: 8 }}>
                  {!msg.read && (
                    <div className="rounded-circle bg-primary" style={{ width: 8, height: 8 }} />
                  )}
                </div>

                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className={`fw-medium ${!msg.read ? '' : 'text-muted'}`}>{msg.name}</span>
                    <span className="text-muted small">&lt;{msg.email}&gt;</span>
                    {sourceTitle && (
                      <span className="badge bg-light text-dark border small fw-normal">{sourceTitle}</span>
                    )}
                  </div>
                  <div className="text-truncate small" style={{ maxWidth: '60vw' }}>
                    <strong>{msg.subject}</strong>
                    {!isExpanded && <span className="text-muted ms-2">{msg.body.slice(0, 80)}{msg.body.length > 80 ? '…' : ''}</span>}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span className="text-muted small">
                    {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Mark read/unread */}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    title={msg.read ? 'Mark unread' : 'Mark read'}
                    onClick={(e) => { e.stopPropagation(); markRead(msg.id, !msg.read); }}
                  >
                    <i className={`bi bi-envelope${msg.read ? '' : '-open'}`} />
                  </button>

                  {/* Delete (ADMIN only) */}
                  {role === 'ADMIN' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  )}

                  <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-muted small`} />
                </div>
              </div>

              {/* ── Expanded message body ────────────────────────────────── */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-top bg-white">
                  <div className="small text-muted mb-2">
                    <strong>From:</strong> {msg.name} &lt;{msg.email}&gt; &nbsp;·&nbsp;
                    <strong>Subject:</strong> {msg.subject}
                    {sourceTitle && <> &nbsp;·&nbsp; <strong>Page:</strong> {sourceTitle}</>}
                  </div>
                  <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {msg.body}
                  </div>
                  <div className="mt-2">
                    <a
                      href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="bi bi-reply me-1" />Reply by email
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <small className="text-muted">{total} message{total !== 1 ? 's' : ''}</small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => navigate({ page: String(page - 1) })}>&laquo;</button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => navigate({ page: String(p) })}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => navigate({ page: String(page + 1) })}>&raquo;</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
