'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TYPE_LABELS = {
  'application/pdf': { label: 'PDF', cls: 'bg-danger' },
  'application/msword': { label: 'DOC', cls: 'bg-primary' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', cls: 'bg-primary' },
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsList({
  downloads: initial, total, page, perPage, search, defaultLocale, role,
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [downloads, setDownloads] = useState(initial);
  const [pending, startTransition] = useTransition();

  function navigate(updates) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  async function deleteDownload(id) {
    if (!confirm('Permanently delete this download? This cannot be undone.')) return;
    await fetch(`/api/admin/downloads/${id}`, { method: 'DELETE' });
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 240 }}
          placeholder="Search title…"
          defaultValue={search}
          onChange={(e) => navigate({ search: e.target.value, page: '1' })}
        />
        <Link href="/admin/downloads/new" className="btn btn-sm btn-primary ms-auto">
          <i className="bi bi-plus-lg me-1" />New Download
        </Link>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {downloads.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No downloads yet.{' '}
                    <Link href="/admin/downloads/new">Upload one</Link>.
                  </td>
                </tr>
              )}
              {downloads.map((d) => {
                const title = (
                  d.translations.find((t) => t.locale === defaultLocale) ??
                  d.translations[0]
                )?.title || d.originalName;

                const typeInfo = TYPE_LABELS[d.fileType] ?? { label: d.fileType.split('/')[1]?.toUpperCase() ?? '?', cls: 'bg-secondary' };

                return (
                  <tr key={d.id}>
                    <td>
                      <div className="fw-medium">{title}</div>
                      <div className="text-muted small">{d.originalName}</div>
                    </td>
                    <td>
                      <span className={`badge ${typeInfo.cls}`}>{typeInfo.label}</span>
                    </td>
                    <td className="text-muted small">{formatBytes(d.fileSize)}</td>
                    <td className="text-muted small">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end">
                        <Link
                          href={`/admin/downloads/${d.id}/edit`}
                          className="btn btn-sm btn-outline-secondary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </Link>
                        <a
                          href={`/uploads/${d.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                          title="Download"
                        >
                          <i className="bi bi-download" />
                        </a>
                        {role === 'ADMIN' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Delete"
                            onClick={() => deleteDownload(d.id)}
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
            <small className="text-muted">{total} download{total !== 1 ? 's' : ''} total</small>
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
