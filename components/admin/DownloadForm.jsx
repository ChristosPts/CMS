'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadForm({ initial, activeLocales, defaultLocale, downloadId }) {
  const router = useRouter();
  const isEdit = Boolean(downloadId);
  const fileRef = useRef(null);

  // ── File state ──────────────────────────────────────────────────────────
  const [fileInfo, setFileInfo] = useState(
    initial
      ? {
          filename:     initial.filename,
          originalName: initial.originalName,
          fileType:     initial.fileType,
          fileSize:     initial.fileSize,
        }
      : null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // ── Translations ────────────────────────────────────────────────────────
  const buildTransMap = () => {
    const map = {};
    activeLocales.forEach((loc) => {
      const existing = initial?.translations?.find((t) => t.locale === loc);
      map[loc] = { title: existing?.title ?? '', description: existing?.description ?? '' };
    });
    return map;
  };
  const [translations, setTranslations] = useState(buildTransMap);
  const [activeTab,    setActiveTab]    = useState(defaultLocale);

  function updateTrans(locale, field, value) {
    setTranslations((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  }

  // ── File upload ─────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');

    const fd = new FormData();
    fd.append('file', file);

    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();

    setUploading(false);
    e.target.value = '';

    if (json.success) {
      setFileInfo(json.data);
      // Pre-fill title from filename if empty
      const name = file.name.replace(/\.[^.]+$/, '');
      setTranslations((prev) => {
        const updated = { ...prev };
        activeLocales.forEach((loc) => {
          if (!updated[loc].title) updated[loc] = { ...updated[loc], title: name };
        });
        return updated;
      });
    } else {
      setUploadError(json.error ?? 'Upload failed');
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fileInfo) { setError('Please upload a file.'); return; }

    const defaultTitle = translations[defaultLocale]?.title;
    if (!defaultTitle) { setError(`Title is required for the default locale (${defaultLocale}).`); return; }

    setSaving(true);
    setError('');

    const payload = {
      ...fileInfo,
      translations: activeLocales.map((loc) => ({
        locale:      loc,
        title:       translations[loc].title || defaultTitle,
        description: translations[loc].description,
      })),
    };

    const url    = isEdit ? `/api/admin/downloads/${downloadId}` : '/api/admin/downloads';
    const method = isEdit ? 'PUT' : 'POST';

    const res  = await fetch(url, {
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

    router.push('/admin/downloads');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger py-2 mb-4">{error}</div>}

      <div className="row g-4">
        {/* ── Left — translations ─────────────────────────────────────────── */}
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
                <span className="fw-semibold">Details</span>
              )}
            </div>

            {activeLocales.map((loc) => (
              <div key={loc} className={`card-body ${activeTab !== loc ? 'd-none' : ''}`}>
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Title {loc === defaultLocale && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={translations[loc]?.title ?? ''}
                    onChange={(e) => updateTrans(loc, 'title', e.target.value)}
                    required={loc === defaultLocale}
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={translations[loc]?.description ?? ''}
                    onChange={(e) => updateTrans(loc, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — file ────────────────────────────────────────────────── */}
        <div className="col-12 col-xl-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">File</div>
            <div className="card-body">
              {fileInfo ? (
                <div className="mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className={`badge ${
                      fileInfo.fileType === 'application/pdf' ? 'bg-danger' : 'bg-primary'
                    } fs-6`}>
                      {TYPE_LABELS[fileInfo.fileType] ?? 'FILE'}
                    </span>
                    <span className="fw-medium small">{fileInfo.originalName}</span>
                  </div>
                  <div className="text-muted small">{formatBytes(fileInfo.fileSize)}</div>
                </div>
              ) : (
                <div className="text-muted small mb-3">No file uploaded yet.</div>
              )}

              {uploadError && (
                <div className="text-danger small mb-2">{uploadError}</div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="d-none"
                onChange={handleFile}
              />
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <i className="bi bi-upload me-1" />
                {uploading ? 'Uploading…' : fileInfo ? 'Replace File' : 'Upload File'}
              </button>
              <div className="form-text mt-1">PDF, DOC, DOCX · max 25 MB</div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create Download'}
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
