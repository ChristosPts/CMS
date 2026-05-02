'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function EditRow({ user, onSave, onCancel }) {
  const [name,          setName]          = useState(user.name ?? '');
  const [publicRole,    setPublicRole]    = useState(user.publicRole ?? '');
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res  = await fetch(`/api/admin/site-users/${user.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: name || null, publicRole: publicRole || null, emailVerified }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) onSave(json.data);
  }

  return (
    <tr className="table-active">
      <td className="text-muted small">{user.email}</td>
      <td>
        <input type="text" className="form-control form-control-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Display name" style={{ maxWidth: 180 }} />
      </td>
      <td>
        <input type="text" className="form-control form-control-sm" value={publicRole} onChange={e => setPublicRole(e.target.value)} placeholder="e.g. member" style={{ maxWidth: 120 }} />
      </td>
      <td>
        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" checked={emailVerified} onChange={e => setEmailVerified(e.target.checked)} />
        </div>
      </td>
      <td className="text-muted small">{new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-primary" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

export default function SiteUsersPanel({ role }) {
  const router  = useRouter();
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const perPage = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchUsers() {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), search });
    const res  = await fetch(`/api/admin/site-users?${q}`);
    const json = await res.json();
    setLoading(false);
    if (json.success) { setUsers(json.data.users); setTotal(json.data.total); }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this site user?')) return;
    await fetch(`/api/admin/site-users/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.id !== id));
    startTransition(() => router.refresh());
  }

  function handleSaved(updated) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditing(null);
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 240 }}
          placeholder="Search email or name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <span className="text-muted small align-self-center ms-1">{total} user{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Registered</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center text-muted py-4">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted py-4">No site users found.</td></tr>
              )}
              {!loading && users.map(user => (
                editing === user.id
                  ? <EditRow key={user.id} user={user} onSave={handleSaved} onCancel={() => setEditing(null)} />
                  : (
                    <tr key={user.id}>
                      <td className="small">{user.email}</td>
                      <td className="text-muted small">{user.name || '—'}</td>
                      <td>{user.publicRole ? <span className="badge bg-secondary">{user.publicRole}</span> : <span className="text-muted small">—</span>}</td>
                      <td>
                        {user.emailVerified
                          ? <span className="badge bg-success">Verified</span>
                          : <span className="badge bg-warning text-dark">Pending</span>}
                      </td>
                      <td className="text-muted small">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex gap-1 justify-content-end">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(user.id)} title="Edit"><i className="bi bi-pencil" /></button>
                          {role === 'ADMIN' && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(user.id)} title="Delete"><i className="bi bi-trash" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="card-footer d-flex justify-content-end py-2">
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>&laquo;</button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>&raquo;</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
