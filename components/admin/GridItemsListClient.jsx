'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function GridItemsListClient({ items: initialItems, total, page, perPage, search, pageId, role }) {
  const router  = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deleting, setDeleting] = useState(null);
  const [, startTransition] = useTransition();
  const totalPages = Math.ceil(total / perPage);

  async function deleteItem(id) {
    if (!confirm('Delete this item permanently?')) return;
    setDeleting(id);
    await fetch(`/api/admin/grid/${pageId}/${id}`, { method: 'DELETE' });
    setDeleting(null);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <form method="get" className="d-flex gap-2 mb-3">
        <input name="search" type="search" className="form-control form-control-sm" style={{ maxWidth: 240 }} placeholder="Search by name…" defaultValue={search} />
        <button type="submit" className="btn btn-sm btn-outline-secondary">Search</button>
      </form>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 60 }}>Image</th>
                <th>Name</th>
                <th>Subtitle</th>
                <th>Link</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-4">No items found.</td></tr>
              )}
              {items.map((item) => {
                const trans = item.translations[0];
                return (
                  <tr key={item.id}>
                    <td>
                      {item.image ? (
                        <Image
                          src={`/uploads/thumbnails/thumb_${item.image}`}
                          alt=""
                          width={48}
                          height={48}
                          className="rounded"
                          style={{ objectFit: 'cover', width: 48, height: 48 }}
                          unoptimized
                        />
                      ) : (
                        <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted" style={{ width: 48, height: 48 }}>
                          <i className="bi bi-image" />
                        </div>
                      )}
                    </td>
                    <td className="fw-medium">{trans?.name || <em className="text-muted">Untitled</em>}</td>
                    <td className="text-muted small">{trans?.subtitle || '—'}</td>
                    <td>
                      {item.linkUrl
                        ? <span className="text-muted small font-monospace text-truncate d-inline-block" style={{ maxWidth: 200 }} title={item.linkUrl}>{item.linkUrl}</span>
                        : <span className="text-muted small">—</span>}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end">
                        <Link href={`/admin/grid/${pageId}/${item.id}/edit`} className="btn btn-sm btn-outline-secondary" title="Edit">
                          <i className="bi bi-pencil" />
                        </Link>
                        {role === 'ADMIN' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Delete"
                            disabled={deleting === item.id}
                            onClick={() => deleteItem(item.id)}
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

        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between py-2">
            <small className="text-muted">{total} item{total !== 1 ? 's' : ''}</small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <a href={`?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ''}`} className="page-link">{p}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
