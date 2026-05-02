'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_BADGE = { ADMIN: 'bg-danger', MODERATOR: 'bg-warning text-dark' };

function UserForm({ initial, currentUserRole, onSave, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [fields, setFields] = useState({
    username:        initial?.username        ?? '',
    name:            initial?.name            ?? '',
    role:            initial?.role            ?? 'MODERATOR',
    password:        '',
    confirmPassword: '',
  });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  function set(k, v) { setFields(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = isEdit
      ? { name: fields.name, role: fields.role }
      : { username: fields.username, name: fields.name, role: fields.role, password: fields.password, confirmPassword: fields.confirmPassword };

    const url    = isEdit ? `/api/admin/users/${initial.id}` : '/api/admin/users';
    const method = isEdit ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setSaving(false);

    if (!json.success) { setErrors(typeof json.error === 'object' ? json.error : { _form: json.error }); return; }
    onSave(json.data);
  }

  const canAssignAdmin = currentUserRole === 'ADMIN';

  return (
    <form onSubmit={handleSubmit} className="border rounded p-3 bg-light mb-3">
      {errors._form && <div className="alert alert-danger py-2 small">{errors._form}</div>}
      <div className="row g-2">
        {!isEdit && (
          <div className="col-sm-6">
            <label className="form-label small fw-medium">Username <span className="text-danger">*</span></label>
            <input type="text" className={`form-control form-control-sm ${errors.username ? 'is-invalid' : ''}`}
              value={fields.username} onChange={e => set('username', e.target.value)} required />
            {errors.username && <div className="invalid-feedback">{errors.username[0]}</div>}
          </div>
        )}
        <div className={`col-sm-${isEdit ? '6' : '6'}`}>
          <label className="form-label small fw-medium">Display Name</label>
          <input type="text" className="form-control form-control-sm"
            value={fields.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="col-sm-6">
          <label className="form-label small fw-medium">Role</label>
          <select className="form-select form-select-sm" value={fields.role} onChange={e => set('role', e.target.value)}>
            {canAssignAdmin && <option value="ADMIN">Admin</option>}
            <option value="MODERATOR">Moderator</option>
          </select>
        </div>
        {!isEdit && (
          <>
            <div className="col-sm-6">
              <label className="form-label small fw-medium">Password <span className="text-danger">*</span></label>
              <input type="password" className={`form-control form-control-sm ${errors.password ? 'is-invalid' : ''}`}
                value={fields.password} onChange={e => set('password', e.target.value)} required />
              {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
            </div>
            <div className="col-sm-6">
              <label className="form-label small fw-medium">Confirm Password <span className="text-danger">*</span></label>
              <input type="password" className={`form-control form-control-sm ${errors.confirmPassword ? 'is-invalid' : ''}`}
                value={fields.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
              {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword[0]}</div>}
            </div>
          </>
        )}
      </div>
      <div className="d-flex gap-2 mt-2">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update' : 'Create User'}</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PasswordResetForm({ userId, onDone, onCancel }) {
  const [pw, setPw]   = useState('');
  const [cpw, setCpw] = useState('');
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr({});
    const res  = await fetch(`/api/admin/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw, confirmPassword: cpw }) });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setErr(typeof json.error === 'object' ? json.error : { _form: json.error }); return; }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded p-3 bg-light mb-1">
      {err._form && <div className="alert alert-danger py-2 small">{err._form}</div>}
      <div className="row g-2 align-items-end">
        <div className="col-sm-5">
          <label className="form-label small">New Password</label>
          <input type="password" className={`form-control form-control-sm ${err.password ? 'is-invalid' : ''}`}
            value={pw} onChange={e => setPw(e.target.value)} required />
          {err.password && <div className="invalid-feedback">{err.password[0]}</div>}
        </div>
        <div className="col-sm-5">
          <label className="form-label small">Confirm</label>
          <input type="password" className={`form-control form-control-sm ${err.confirmPassword ? 'is-invalid' : ''}`}
            value={cpw} onChange={e => setCpw(e.target.value)} required />
          {err.confirmPassword && <div className="invalid-feedback">{err.confirmPassword[0]}</div>}
        </div>
        <div className="col-sm-2 d-flex gap-1">
          <button type="submit" className="btn btn-sm btn-warning" disabled={saving}>{saving ? '…' : 'Set'}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>✕</button>
        </div>
      </div>
    </form>
  );
}

export default function AdminUsersPanel({ initialUsers, currentUserId, currentUserRole }) {
  const router  = useRouter();
  const [users,    setUsers]    = useState(initialUsers);
  const [editing,  setEditing]  = useState(null); // id | 'new'
  const [resetting, setResetting] = useState(null); // id

  async function deleteUser(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.id !== id));
    router.refresh();
  }

  function handleSaved(user) {
    setUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      return exists ? prev.map(u => u.id === user.id ? user : u) : [...prev, user];
    });
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      {editing === 'new' && (
        <UserForm
          currentUserRole={currentUserRole}
          onSave={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Role</th>
                <th>Created</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <React.Fragment key={user.id}>
                  <tr>
                    <td className="fw-medium">
                      {user.username}
                      {user.id === currentUserId && (
                        <span className="badge bg-light text-dark border ms-1 small">you</span>
                      )}
                    </td>
                    <td className="text-muted">{user.name || '—'}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[user.role]}`}>{user.role}</span>
                    </td>
                    <td className="text-muted small">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(editing === user.id ? null : user.id)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-sm btn-outline-warning" onClick={() => setResetting(resetting === user.id ? null : user.id)} title="Reset password">
                          <i className="bi bi-key" />
                        </button>
                        {currentUserRole === 'ADMIN' && user.id !== currentUserId && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(user.id)} title="Delete">
                            <i className="bi bi-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {editing === user.id && (
                    <tr>
                      <td colSpan={5} className="p-2 bg-light">
                        <UserForm
                          initial={user}
                          currentUserRole={currentUserRole}
                          onSave={handleSaved}
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {resetting === user.id && (
                    <tr>
                      <td colSpan={5} className="p-2 bg-light">
                        <PasswordResetForm
                          userId={user.id}
                          onDone={() => setResetting(null)}
                          onCancel={() => setResetting(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== 'new' && (
        <button className="btn btn-sm btn-primary mt-3" onClick={() => setEditing('new')}>
          <i className="bi bi-plus-lg me-1" />New CMS User
        </button>
      )}
    </div>
  );
}
