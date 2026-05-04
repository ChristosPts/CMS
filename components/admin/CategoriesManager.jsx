'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function CategoryRow({ cat, activeLocales, defaultLocale, onSaved, onDeleted, role }) {
  const [editing,     setEditing]     = useState(false);
  const [translations, setTranslations] = useState(() => {
    const map = {};
    activeLocales.forEach((loc) => {
      map[loc] = cat.translations.find((t) => t.locale === loc)?.name ?? '';
    });
    return map;
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    const res  = await fetch(`/api/admin/categories/${cat.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ translations: Object.entries(translations).map(([locale, name]) => ({ locale, name })), sortOrder: cat.sortOrder }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) { setEditing(false); onSaved(json.data); }
  }

  async function del() {
    if (!confirm(`Delete category "${translations[defaultLocale] || cat.slug}"? This will remove it from all articles.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    onDeleted(cat.id);
  }

  const label = translations[defaultLocale] || cat.slug;

  return (
    <div className="border rounded mb-2 bg-white">
      <div className="d-flex align-items-center gap-2 px-3 py-2">
        <span className="flex-grow-1 fw-medium small">{label}</span>
        <span className="badge bg-light text-dark border small fw-normal">{cat._count?.articles ?? 0} article{cat._count?.articles !== 1 ? 's' : ''}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing((e) => !e)}>
          <i className={`bi bi-${editing ? 'chevron-up' : 'pencil'}`} />
        </button>
        {role === 'ADMIN' && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={del} disabled={deleting}>
            <i className="bi bi-trash" />
          </button>
        )}
      </div>

      {editing && (
        <div className="border-top px-3 py-3">
          {activeLocales.map((loc) => (
            <div key={loc} className="mb-2 d-flex align-items-center gap-2">
              <span className="badge bg-secondary fw-normal" style={{ minWidth: 36 }}>{loc.toUpperCase()}</span>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={`Name (${loc})`}
                value={translations[loc]}
                onChange={(e) => setTranslations((prev) => ({ ...prev, [loc]: e.target.value }))}
              />
            </div>
          ))}
          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriesManager({ initialCategories, activeLocales, defaultLocale, role }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newTrans,   setNewTrans]   = useState(() => { const m = {}; activeLocales.forEach((l) => { m[l] = ''; }); return m; });
  const [adding,     setAdding]     = useState(false);
  const [saving,     setSaving]     = useState(false);

  function onSaved(updated) {
    setCategories((prev) => prev.map((c) => c.id === updated.id ? { ...updated, _count: c._count } : c));
  }

  function onDeleted(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function addCategory() {
    const name = newTrans[defaultLocale];
    if (!name.trim()) return;
    setSaving(true);
    const res  = await fetch('/api/admin/categories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ translations: Object.entries(newTrans).map(([locale, n]) => ({ locale, name: n })) }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) {
      setCategories((prev) => [...prev, { ...json.data, _count: { articles: 0 } }]);
      setNewTrans(() => { const m = {}; activeLocales.forEach((l) => { m[l] = ''; }); return m; });
      setAdding(false);
    }
  }

  return (
    <div>
      {categories.length === 0 && !adding && (
        <p className="text-muted small mb-3">No categories yet.</p>
      )}

      {categories.map((cat) => (
        <CategoryRow key={cat.id} cat={cat} activeLocales={activeLocales} defaultLocale={defaultLocale} onSaved={onSaved} onDeleted={onDeleted} role={role} />
      ))}

      {adding ? (
        <div className="border rounded p-3 bg-light mt-2">
          <div className="form-label small fw-medium mb-2">New category</div>
          {activeLocales.map((loc) => (
            <div key={loc} className="mb-2 d-flex align-items-center gap-2">
              <span className="badge bg-secondary fw-normal" style={{ minWidth: 36 }}>{loc.toUpperCase()}</span>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={`Name (${loc})${loc === defaultLocale ? ' *' : ''}`}
                value={newTrans[loc]}
                onChange={(e) => setNewTrans((prev) => ({ ...prev, [loc]: e.target.value }))}
              />
            </div>
          ))}
          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={addCategory} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => setAdding(true)}>
          <i className="bi bi-plus-circle me-1" />Add Category
        </button>
      )}
    </div>
  );
}
