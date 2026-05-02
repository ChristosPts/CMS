'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/slugify';
import RichTextEditor from './RichTextEditor';
import FeaturedImagePicker from './FeaturedImagePicker';
import ConnectionPicker from './ConnectionPicker';
import GridItemsEditor from './GridItemsEditor';

const TEMPLATES = [
  { value: 'BASIC',          label: 'Basic' },
  { value: 'GRID',           label: 'Grid (team/members/partners)' },
  { value: 'ARTICLE_LIST',   label: 'Article List (news, events…)' },
  { value: 'ARTICLE_SINGLE', label: 'Article Single' },
  { value: 'CONTACT',        label: 'Contact Form' },
  { value: 'HOME',           label: 'Home (manual)' },
];

const VISIBILITIES = [
  { value: 'PUBLIC',              label: 'Public' },
  { value: 'AUTHENTICATED_ONLY',  label: 'Authenticated users only' },
  { value: 'ROLE_RESTRICTED',     label: 'Role restricted' },
];

export default function PageForm({ initial, activeLocales, defaultLocale, parentPages, role, pageId, initialConnections }) {
  const router  = useRouter();
  const isEdit  = Boolean(pageId);

  // ── Core fields ──────────────────────────────────────────────────────────
  const [template,       setTemplate]       = useState(initial?.template       ?? 'BASIC');
  const [status,         setStatus]         = useState(initial?.status         ?? 'DRAFT');
  const [sortOrder,      setSortOrder]      = useState(initial?.sortOrder      ?? 0);
  const [parentId,       setParentId]       = useState(initial?.parentId       ?? '');
  const [visibility,     setVisibility]     = useState(initial?.visibility     ?? 'PUBLIC');
  const [restrictedRole, setRestrictedRole] = useState(initial?.restrictedRole ?? '');
  const [slug,           setSlug]           = useState(initial?.slug           ?? '');
  const [slugEdited,     setSlugEdited]     = useState(isEdit);
  const [featuredImage,  setFeaturedImage]  = useState(initial?.featuredImage  ?? null);
  const [gridItems,      setGridItems]      = useState(initial?.gridItems ?? []);
  const [connGalleries,  setConnGalleries]  = useState(initialConnections?.galleries  ?? []);
  const [connDownloads,  setConnDownloads]  = useState(initialConnections?.downloads  ?? []);
  const [connArticles,   setConnArticles]   = useState(initialConnections?.articles   ?? []);

  // ── Translations ─────────────────────────────────────────────────────────
  // Build initial translations map: locale → { title, summary, content, metaTitle, metaDescription }
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

  // Auto-generate slug from default locale title when creating
  function handleDefaultTitleChange(value) {
    updateTranslation(defaultLocale, 'title', value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  // ── Submission ───────────────────────────────────────────────────────────
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      template,
      status,
      sortOrder: Number(sortOrder),
      parentId:       parentId ? Number(parentId) : null,
      visibility,
      restrictedRole: visibility === 'ROLE_RESTRICTED' ? restrictedRole : null,
      slug:           role === 'ADMIN' ? slug : undefined,
      featuredImage:  featuredImage ?? null,
      gridItems,
      galleries:  connGalleries.map((g) => ({ id: g.id, sortOrder: g.sortOrder })),
      downloads:  connDownloads.map((d) => ({ id: d.id, sortOrder: d.sortOrder })),
      articles:   connArticles.map((a)  => ({ id: a.id, sortOrder: a.sortOrder })),
      translations: activeLocales.map((loc) => ({
        locale: loc,
        ...translations[loc],
      })),
    };

    const url    = isEdit ? `/api/admin/pages/${pageId}` : '/api/admin/pages';
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

    router.push('/admin/pages');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger py-2 mb-4">{error}</div>}

      <div className="row g-4">
        {/* ── Left column — translations ─────────────────────── */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header">
              {/* Locale tabs */}
              {activeLocales.length > 1 && (
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
              )}
              {activeLocales.length === 1 && (
                <span className="fw-semibold">Content</span>
              )}
            </div>

            {activeLocales.map((loc) => (
              <div key={loc} className={`card-body ${activeTab !== loc ? 'd-none' : ''}`}>
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Title <span className="text-danger">*</span>
                  </label>
                  {loc === defaultLocale ? (
                    <input
                      type="text"
                      className="form-control"
                      value={translations[loc]?.title ?? ''}
                      onChange={(e) => handleDefaultTitleChange(e.target.value)}
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      value={translations[loc]?.title ?? ''}
                      onChange={(e) => updateTranslation(loc, 'title', e.target.value)}
                    />
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Summary / Intro</label>
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

                {/* SEO */}
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

        {/* ── Right column — settings ────────────────────────── */}
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
                <label className="form-label small">Sort Order</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Page Settings */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Page Settings</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">Template</label>
                <select className="form-select form-select-sm" value={template} onChange={(e) => setTemplate(e.target.value)}>
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small">Parent Page</label>
                <select className="form-select form-select-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">— None —</option>
                  {parentPages.filter((p) => p.id !== pageId).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small">Visibility</label>
                <select className="form-select form-select-sm" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  {VISIBILITIES.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>

              {visibility === 'ROLE_RESTRICTED' && (
                <div className="mb-0">
                  <label className="form-label small">Required Role</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={restrictedRole}
                    onChange={(e) => setRestrictedRole(e.target.value)}
                    placeholder="e.g. member"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Featured Image</div>
            <div className="card-body">
              <FeaturedImagePicker value={featuredImage} onChange={setFeaturedImage} />
            </div>
          </div>

          {/* Connections — galleries */}
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

          {/* Connections — downloads */}
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

          {/* Connections — featured articles (BASIC template only) */}
          {template === 'BASIC' && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header fw-semibold">Featured Articles</div>
              <div className="card-body">
                <ConnectionPicker
                  type="article"
                  value={connArticles}
                  onChange={setConnArticles}
                  defaultLocale={defaultLocale}
                />
              </div>
            </div>
          )}

          {/* Slug — ADMIN only editable */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">URL Slug</div>
            <div className="card-body">
              <div className="input-group input-group-sm">
                <span className="input-group-text text-muted">/</span>
                <input
                  type="text"
                  className="form-control font-monospace"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                  readOnly={role !== 'ADMIN'}
                  title={role !== 'ADMIN' ? 'Only ADMINs can edit slugs' : ''}
                />
              </div>
              {role !== 'ADMIN' && (
                <div className="form-text">Only ADMINs can edit slugs.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Page' : 'Create Page'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => router.back()}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ── Grid Items (GRID template, edit only) ────────────────── */}
      {template === 'GRID' && isEdit && (
        <div className="mt-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header fw-semibold">Grid Items</div>
            <div className="card-body">
              <GridItemsEditor
                activeLocales={activeLocales}
                defaultLocale={defaultLocale}
                initialItems={initial?.gridItems ?? []}
                onChange={setGridItems}
              />
            </div>
          </div>
        </div>
      )}

      {template === 'GRID' && !isEdit && (
        <div className="mt-4 alert alert-info">
          <i className="bi bi-info-circle me-2" />
          Save the page first, then come back to add grid items.
        </div>
      )}
    </form>
  );
}
