'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

const STATUSES = ['PUBLISHED', 'DRAFT', 'HIDDEN'];

export default function ArticlesTable({
  articles, total, page, perPage,
  sortBy, sortDir, search, status,
  sectionSlug, role,
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting]    = useState(null);

  function navigate(updates) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  function handleSort(col) {
    const dir = sortBy === col && sortDir === 'desc' ? 'asc' : 'desc';
    navigate({ sortBy: col, sortDir: dir, page: '1' });
  }

  function sortIcon(col) {
    if (sortBy !== col) return <i className="bi bi-arrow-down-up text-muted ms-1 small" />;
    return sortDir === 'asc'
      ? <i className="bi bi-arrow-up ms-1 small" />
      : <i className="bi bi-arrow-down ms-1 small" />;
  }

  async function changeStatus(id, newStatus) {
    await fetch(`/api/admin/articles/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    startTransition(() => router.refresh());
  }

  async function deleteArticle(id) {
    if (!confirm('Permanently delete this article? This cannot be undone.')) return;
    setDeleting(id);
    await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    setDeleting(null);
    startTransition(() => router.refresh());
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 240 }}
          placeholder="Search title…"
          defaultValue={search}
          onChange={(e) => navigate({ search: e.target.value, page: '1' })}
        />
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 160 }}
          value={status}
          onChange={(e) => navigate({ status: e.target.value, page: '1' })}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <Link
          href={`/admin/${sectionSlug}/new`}
          className="btn btn-sm btn-primary ms-auto"
        >
          <i className="bi bi-plus-lg me-1" />New Article
        </Link>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th onClick={() => handleSort('status')} role="button">
                  Status {sortIcon('status')}
                </th>
                <th onClick={() => handleSort('publishDate')} role="button">
                  Published {sortIcon('publishDate')}
                </th>
                <th>Author</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No articles yet.{' '}
                    <Link href={`/admin/${sectionSlug}/new`}>Create one</Link>.
                  </td>
                </tr>
              )}
              {articles.map((a) => {
                const title = a.translations[0]?.title || <em className="text-muted">Untitled</em>;
                return (
                  <tr key={a.id} className={pending ? 'opacity-50' : ''}>
                    <td>
                      <div className="fw-medium">{title}</div>
                      <div className="text-muted small font-monospace">{a.slug}</div>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-muted small">
                      {a.publishDate
                        ? new Date(a.publishDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="text-muted small">
                      {a.author?.name || a.author?.username || '—'}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end">
                        <Link
                          href={`/admin/${sectionSlug}/${a.id}/edit`}
                          className="btn btn-sm btn-outline-secondary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </Link>
                        <a
                          href={`/${sectionSlug}/${a.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                          title="View"
                        >
                          <i className="bi bi-box-arrow-up-right" />
                        </a>
                        {a.status === 'HIDDEN' ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            title="Publish"
                            onClick={() => changeStatus(a.id, 'PUBLISHED')}
                          >
                            <i className="bi bi-eye" />
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-warning"
                            title="Hide"
                            onClick={() => changeStatus(a.id, 'HIDDEN')}
                          >
                            <i className="bi bi-eye-slash" />
                          </button>
                        )}
                        {role === 'ADMIN' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Delete"
                            disabled={deleting === a.id}
                            onClick={() => deleteArticle(a.id)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between py-2">
            <small className="text-muted">{total} article{total !== 1 ? 's' : ''} total</small>
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
