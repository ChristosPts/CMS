'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';
import FeaturedImagePicker from './FeaturedImagePicker';
import ConnectionPicker from './ConnectionPicker';

const VISIBILITIES = [
  { value: 'PUBLIC',             label: 'Public' },
  { value: 'AUTHENTICATED_ONLY', label: 'Authenticated users only' },
  { value: 'ROLE_RESTRICTED',    label: 'Role restricted' },
];

export default function ArticleForm({
  initial, activeLocales, defaultLocale,
  parentPageId, sectionSlug, articleId, initialConnections,
}) {
  const router  = useRouter();
  const isEdit  = Boolean(articleId);

  // ── Fields ───────────────────────────────────────────────────────────────
  const [status,         setStatus]         = useState(initial?.status         ?? 'DRAFT');
  const [visibility,     setVisibility]     = useState(initial?.visibility     ?? 'PUBLIC');
  const [restrictedRole, setRestrictedRole] = useState(initial?.restrictedRole ?? '');
  const [featuredImage,  setFeaturedImage]  = useState(initial?.featuredImage  ?? null);
  const [publishDate,    setPublishDate]    = useState(
    initial?.publishDate
      ? new Date(initial.publishDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  // ── Translations ─────────────────────────────────────────────────────────
  const buildTransMap = () => {
    const map = {};
    activeLocales.forEach((loc) => {
      const existing = initial?.translations?.find((t) => t.locale === loc);
      map[loc] = {
        title:           existing?.title           ?? '',
        summary:         existing?.summary         ?? '',
        content:         existing?.content         ?? '',
        metaTitle:       existing?.metaTitle        ?? '',
        metaDescription: existing?.metaDescription ?? '',
      };
    });
    return map;
  };

  const [translations, setTranslations] = useState(buildTransMap);
  const [activeTab,    setActiveTab]    = useState(defaultLocale);

  function updateTranslation(locale, field, value) {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));
  }

  // ── Submission ───────────────────────────────────────────────────────────
  const [connGalleries, setConnGalleries] = useState(initialConnections?.galleries ?? []);
  const [connDownloads, setConnDownloads] = useState(initialConnections?.downloads ?? []);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      parentPageId,
      status,
      visibility,
      restrictedRole: visibility === 'ROLE_RESTRICTED' ? restrictedRole : null,
      featuredImage:  featuredImage ?? null,
      publishDate:    publishDate || null,
      translations:   activeLocales.map((loc) => ({ locale: loc, ...translations[loc] })),
      galleries:  connGalleries.map((g) => ({ id: g.id, sortOrder: g.sortOrder })),
      downloads:  connDownloads.map((d) => ({ id: d.id, sortOrder: d.sortOrder })),
    };

    const url    = isEdit ? `/api/admin/articles/${articleId}` : '/api/admin/articles';
    const method = isEdit ? 'PUT' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    setSaving(false);

    if (!json.success) {
      setError(typeof json.error === 'string' ? json.error : 'Failed to save. Check all fields.');
      return;
    }

    router.push(`/admin/${sectionSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger py-2 mb-4">{error}</div>}

      <div className="row g-4">
        {/* ── Left — content ──────────────────────────────────────────── */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header">
              {activeLocales.length > 1 ? (
                <ul className="nav nav-tabs card-header-tabs">
                  {activeLocales.map((loc) => (
                    <li key={loc} className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${activeTab === loc ? 'active' : ''}`}
                        onClick={() => setActiveTab(loc)}
                      >
                        {loc.toUpperCase()}
                        {loc === defaultLocale && (
                          <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.65rem' }}>default</span>
                        )}
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
                  <label className="form-label fw-medium">
                    Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={translations[loc]?.title ?? ''}
                    onChange={(e) => updateTranslation(loc, 'title', e.target.value)}
                    required={loc === defaultLocale}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Summary</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={translations[loc]?.summary ?? ''}
                    onChange={(e) => updateTranslation(loc, 'summary', e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Content</label>
                  <RichTextEditor
                    value={translations[loc]?.content ?? ''}
                    onChange={(html) => updateTranslation(loc, 'content', html)}
                  />
                </div>

                <hr className="my-3" />
                <p className="text-muted small fw-semibold mb-2">SEO</p>

                <div className="mb-3">
                  <label className="form-label small">Meta Title</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={translations[loc]?.metaTitle ?? ''}
                    onChange={(e) => updateTranslation(loc, 'metaTitle', e.target.value)}
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label small">Meta Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={translations[loc]?.metaDescription ?? ''}
                    onChange={(e) => updateTranslation(loc, 'metaDescription', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — settings ─────────────────────────────────────────── */}
        <div className="col-12 col-xl-4">

          {/* Publish */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Publish</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">Status</label>
                <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
              </div>
              <div className="mb-0">
                <label className="form-label small">Publish Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Featured Image</div>
            <div className="card-body">
              <FeaturedImagePicker value={featuredImage} onChange={setFeaturedImage} />
            </div>
          </div>

          {/* Visibility */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Visibility</div>
            <div className="card-body">
              <select
                className="form-select form-select-sm"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                {VISIBILITIES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              {visibility === 'ROLE_RESTRICTED' && (
                <input
                  type="text"
                  className="form-control form-control-sm mt-2"
                  placeholder="Required role, e.g. member"
                  value={restrictedRole}
                  onChange={(e) => setRestrictedRole(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Connections */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Galleries</div>
            <div className="card-body">
              <ConnectionPicker
                type="gallery"
                value={connGalleries}
                onChange={setConnGalleries}
                defaultLocale={defaultLocale}
              />
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Downloads</div>
            <div className="card-body">
              <ConnectionPicker
                type="download"
                value={connDownloads}
                onChange={setConnDownloads}
                defaultLocale={defaultLocale}
              />
            </div>
          </div>

          {/* Slug (read-only) */}
          {isEdit && initial?.slug && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header fw-semibold">URL Slug</div>
              <div className="card-body">
                <div className="text-muted small font-monospace">/{sectionSlug}/{initial.slug}</div>
                <div className="form-text">Auto-generated from title. Not editable.</div>
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Article' : 'Create Article'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => router.back()}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
