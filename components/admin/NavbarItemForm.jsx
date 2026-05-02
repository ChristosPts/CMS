'use client';

import { useState } from 'react';

export default function NavbarItemForm({
  initial, activeLocales, defaultLocale,
  pageOptions, topLevelItems,
  onSave, onCancel,
}) {
  const buildTrans = () => {
    const map = {};
    activeLocales.forEach((loc) => {
      map[loc] = initial?.translations?.find((t) => t.locale === loc)?.label ?? '';
    });
    return map;
  };

  const [labels,       setLabels]       = useState(buildTrans);
  const [activeTab,    setActiveTab]    = useState(defaultLocale);
  const [linkType,     setLinkType]     = useState(initial?.linkedPageId ? 'page' : 'url');
  const [url,          setUrl]          = useState(initial?.url ?? '');
  const [linkedPageId, setLinkedPageId] = useState(initial?.linkedPageId ?? '');
  const [parentId,     setParentId]     = useState(initial?.parentId ?? '');
  const [openInNewTab, setOpenInNewTab] = useState(initial?.openInNewTab ?? false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      parentId:     parentId ? parseInt(parentId, 10) : null,
      url:          linkType === 'url' ? (url || null) : null,
      linkedPageId: linkType === 'page' ? (linkedPageId ? parseInt(linkedPageId, 10) : null) : null,
      sortOrder:    initial?.sortOrder ?? 999,
      openInNewTab,
      translations: activeLocales.map((loc) => ({ locale: loc, label: labels[loc] ?? '' })),
    };

    const url_   = initial?.id ? `/api/admin/navbar/${initial.id}` : '/api/admin/navbar';
    const method = initial?.id ? 'PUT' : 'POST';

    const res  = await fetch(url_, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!json.success) {
      setError(typeof json.error === 'string' ? json.error : 'Failed to save.');
      return;
    }
    onSave(json.data);
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded p-3 bg-light mb-2">
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      {/* Label — per locale */}
      {activeLocales.length > 1 && (
        <ul className="nav nav-tabs mb-3">
          {activeLocales.map((loc) => (
            <li key={loc} className="nav-item">
              <button
                type="button"
                className={`nav-link py-1 px-3 ${activeTab === loc ? 'active' : ''}`}
                onClick={() => setActiveTab(loc)}
              >
                {loc.toUpperCase()}
                {loc === defaultLocale && (
                  <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.6rem' }}>default</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeLocales.map((loc) => (
        <div key={loc} className={activeTab !== loc ? 'd-none' : 'mb-3'}>
          <label className="form-label small fw-medium">Label{loc === defaultLocale && <span className="text-danger ms-1">*</span>}</label>
          <input
            type="text"
            className="form-control form-control-sm"
            value={labels[loc] ?? ''}
            onChange={(e) => setLabels((prev) => ({ ...prev, [loc]: e.target.value }))}
            required={loc === defaultLocale}
          />
        </div>
      ))}

      <div className="row g-2 mb-3">
        {/* Link type */}
        <div className="col-12">
          <label className="form-label small fw-medium">Destination</label>
          <div className="d-flex gap-3 mb-2">
            <div className="form-check">
              <input className="form-check-input" type="radio" id="lt-url" value="url"
                checked={linkType === 'url'} onChange={() => setLinkType('url')} />
              <label className="form-check-label small" htmlFor="lt-url">Custom URL</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" id="lt-page" value="page"
                checked={linkType === 'page'} onChange={() => setLinkType('page')} />
              <label className="form-check-label small" htmlFor="lt-page">Linked page</label>
            </div>
          </div>

          {linkType === 'url' && (
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="https://… or /path"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
          {linkType === 'page' && (
            <select
              className="form-select form-select-sm"
              value={linkedPageId}
              onChange={(e) => setLinkedPageId(e.target.value)}
            >
              <option value="">— Select page —</option>
              {pageOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.label} (/{p.slug})</option>
              ))}
            </select>
          )}
        </div>

        {/* Parent (only if not already a child item) */}
        {!initial?.parentId && (
          <div className="col-sm-6">
            <label className="form-label small fw-medium">Parent item</label>
            <select
              className="form-select form-select-sm"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— None (top level) —</option>
              {topLevelItems
                .filter((i) => i.id !== initial?.id)
                .map((i) => {
                  const label = i.translations.find((t) => t.locale === defaultLocale)?.label || `Item #${i.id}`;
                  return <option key={i.id} value={i.id}>{label}</option>;
                })}
            </select>
          </div>
        )}

        {/* Open in new tab */}
        <div className="col-sm-6 d-flex align-items-end">
          <div className="form-check form-switch mb-1">
            <input
              className="form-check-input"
              type="checkbox"
              id={`newTab-${initial?.id ?? 'new'}`}
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor={`newTab-${initial?.id ?? 'new'}`}>
              Open in new tab
            </label>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create'}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
