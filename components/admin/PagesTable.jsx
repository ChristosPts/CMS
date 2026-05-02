'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

const TEMPLATES = ['BASIC', 'GRID', 'ARTICLE_LIST', 'ARTICLE_SINGLE', 'CONTACT', 'HOME'];
const STATUSES  = ['PUBLISHED', 'DRAFT', 'HIDDEN'];

export default function PagesTable({ pages, total, page, perPage, sortBy, sortDir, search, status, template, role }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const params    = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(null);

  console.log(pages)

  function navigate(updates) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  function handleSearch(e) {
    navigate({ search: e.target.value, page: '1' });
  }

  function handleSort(col) {
    const dir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    navigate({ sortBy: col, sortDir: dir, page: '1' });
  }

  function sortIcon(col) {
    if (sortBy !== col) return <i className="bi bi-arrow-down-up text-muted ms-1 small" />;
    return sortDir === 'asc'
      ? <i className="bi bi-arrow-up ms-1 small" />
      : <i className="bi bi-arrow-down ms-1 small" />;
  }

  async function changeStatus(id, newStatus) {
    await fetch(`/api/admin/pages/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    startTransition(() => router.refresh());
  }

  async function deletePage(id) {
    if (!confirm('Permanently delete this page? This cannot be undone.')) return;
    setDeleting(id);
    await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    setDeleting(null);
    startTransition(() => router.refresh());
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      {/* ── Filters bar ──────────────────────────────────────── */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 240 }}
          placeholder="Search title…"
          defaultValue={search}
          onChange={handleSearch}
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
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 180 }}
          value={template}
          onChange={(e) => navigate({ template: e.target.value, page: '1' })}
        >
          <option value="">All templates</option>
          {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <Link href="/admin/pages/new" className="btn btn-sm btn-primary ms-auto">
          <i className="bi bi-plus-lg me-1" />New Page
        </Link>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th onClick={() => handleSort('sortOrder')} role="button" style={{ width: 50 }}>
                  # {sortIcon('sortOrder')}
                </th>
                <th>Title</th>
                <th onClick={() => handleSort('template')} role="button">
                  Template {sortIcon('template')}
                </th>
                <th onClick={() => handleSort('status')} role="button">
                  Status {sortIcon('status')}
                </th>
                <th onClick={() => handleSort('updatedAt')} role="button">
                  Updated {sortIcon('updatedAt')}
                </th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">No pages found.</td>
                </tr>
              )}
              {pages.map((p) => {
                const title = p.translations[0]?.title || <em className="text-muted">Untitled</em>;
                return (
                  <tr key={p.id} className={pending ? 'opacity-50' : ''}>
                    <td className="text-muted small">{p.id}</td>
                    <td>
                      <div className="fw-medium">{title}</div>
                      <div className="text-muted small font-monospace">/{p.slug}</div>
                    </td>
                    <td><span className="badge bg-light text-dark border">{p.template}</span></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-muted small">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end">
                        <Link
                          href={`/admin/pages/${p.id}/edit`}
                          className="btn btn-sm btn-outline-secondary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </Link>
                        <a
                          href={`/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                          title="View public page"
                        >
                          <i className="bi bi-box-arrow-up-right" />
                        </a>
                        {p.status === 'HIDDEN' ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            title="Publish"
                            onClick={() => changeStatus(p.id, 'PUBLISHED')}
                          >
                            <i className="bi bi-eye" />
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-warning"
                            title="Hide"
                            onClick={() => changeStatus(p.id, 'HIDDEN')}
                          >
                            <i className="bi bi-eye-slash" />
                          </button>
                        )}
                        {role === 'ADMIN' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Delete"
                            disabled={deleting === p.id}
                            onClick={() => deletePage(p.id)}
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

        {/* ── Pagination ────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between py-2">
            <small className="text-muted">
              {total} page{total !== 1 ? 's' : ''} total
            </small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => navigate({ page: String(page - 1) })}>
                    &laquo;
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => navigate({ page: String(p) })}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => navigate({ page: String(page + 1) })}>
                    &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
