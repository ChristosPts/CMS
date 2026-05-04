'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';
import FeaturedImagePicker from './FeaturedImagePicker';

export default function GridItemForm({ initial, activeLocales, defaultLocale, pageId, itemId }) {
  const router = useRouter();
  const isEdit = Boolean(itemId);

  const buildTransMap = () => {
    const map = {};
    activeLocales.forEach((loc) => {
      const existing = initial?.translations?.find((t) => t.locale === loc);
      map[loc] = { name: existing?.name ?? '', subtitle: existing?.subtitle ?? '', description: existing?.description ?? '' };
    });
    return map;
  };

  const [image,       setImage]       = useState(initial?.image       ?? null);
  const [linkUrl,     setLinkUrl]     = useState(initial?.linkUrl     ?? '');
  const [openInNewTab, setOpenInNewTab] = useState(initial?.openInNewTab ?? false);
  const [translations, setTranslations] = useState(buildTransMap);
  const [activeTab,   setActiveTab]   = useState(defaultLocale);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);

  function updateTrans(locale, field, value) {
    setTranslations((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      image:       image ?? null,
      linkUrl:     linkUrl || null,
      openInNewTab,
      translations: activeLocales.map((loc) => ({ locale: loc, ...translations[loc] })),
    };

    const url    = isEdit ? `/api/admin/grid/${pageId}/${itemId}` : `/api/admin/grid/${pageId}`;
    const method = isEdit ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setSaving(false);

    if (!json.success) {
      setError(typeof json.error === 'string' ? json.error : 'Failed to save.');
      return;
    }

    router.push(`/admin/grid/${pageId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger py-2 mb-4">{error}</div>}

      <div className="row g-4">
        {/* Left — content */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header">
              {activeLocales.length > 1 ? (
                <ul className="nav nav-tabs card-header-tabs">
                  {activeLocales.map((loc) => (
                    <li key={loc} className="nav-item">
                      <button type="button" className={`nav-link ${activeTab === loc ? 'active' : ''}`} onClick={() => setActiveTab(loc)}>
                        {loc.toUpperCase()}
                        {loc === defaultLocale && <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.65rem' }}>default</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="fw-semibold">Content</span>
              )}
            </div>

            {activeLocales.map((loc) => (
              <div key={loc} className={`card-body ${activeTab !== loc ? 'd-none' : ''}`}>
                <div className="mb-3">
                  <label className="form-label fw-medium">Name {loc === defaultLocale && <span className="text-danger">*</span>}</label>
                  <input type="text" className="form-control" value={translations[loc]?.name ?? ''} onChange={(e) => updateTrans(loc, 'name', e.target.value)} required={loc === defaultLocale} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Subtitle / Role</label>
                  <input type="text" className="form-control" value={translations[loc]?.subtitle ?? ''} onChange={(e) => updateTrans(loc, 'subtitle', e.target.value)} />
                </div>
                <div className="mb-0">
                  <label className="form-label">Description</label>
                  <RichTextEditor value={translations[loc]?.description ?? ''} onChange={(html) => updateTrans(loc, 'description', html)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — settings */}
        <div className="col-12 col-xl-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Image</div>
            <div className="card-body">
              <FeaturedImagePicker value={image} onChange={setImage} />
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Link</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">URL <span className="text-muted fw-normal">(makes the card clickable)</span></label>
                <input type="url" className="form-control form-control-sm" placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="openInNewTab" checked={openInNewTab} onChange={(e) => setOpenInNewTab(e.target.checked)} />
                <label className="form-check-label small" htmlFor="openInNewTab">Open in new tab</label>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Item' : 'Create Item'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => router.back()}>Cancel</button>
          </div>
        </div>
      </div>
    </form>
  );
}
