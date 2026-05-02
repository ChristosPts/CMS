'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function LogoUploader({ currentLogo }) {
  const [logo,     setLogo]     = useState(currentLogo);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setSaving(true);
    setError('');
    setSuccess(false);

    const fd = new FormData();
    fd.append('file', file);

    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();

    if (!json.success) {
      setError(json.error ?? 'Upload failed');
      setSaving(false);
      return;
    }

    const filename = json.data.filename;

    // Save to settings
    const res2  = await fetch('/api/admin/settings/logo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ logo: filename }),
    });
    const json2 = await res2.json();
    setSaving(false);

    if (!json2.success) {
      setError(json2.error ?? 'Failed to save logo');
      return;
    }

    setLogo(filename);
    setSuccess(true);
  }

  async function handleRemove() {
    setSaving(true);
    setError('');
    setSuccess(false);

    const res  = await fetch('/api/admin/settings/logo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ logo: '' }),
    });
    const json = await res.json();
    setSaving(false);

    if (!json.success) { setError(json.error ?? 'Failed to remove logo'); return; }
    setLogo('');
    setSuccess(true);
  }

  return (
    <div>
      {error   && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 small mb-3">Logo saved.</div>}

      <div className="d-flex align-items-center gap-3 flex-wrap">
        {logo ? (
          <div className="border rounded p-2 bg-white" style={{ minWidth: 120 }}>
            <Image
              src={`/uploads/${logo}`}
              alt="Logo"
              width={160}
              height={48}
              style={{ objectFit: 'contain', maxHeight: 48, width: 'auto' }}
              unoptimized
            />
          </div>
        ) : (
          <div className="border rounded p-3 text-muted small bg-light">No logo set</div>
        )}

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => inputRef.current?.click()}
            disabled={saving}
          >
            <i className="bi bi-upload me-1" />{logo ? 'Replace' : 'Upload'}
          </button>
          {logo && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={handleRemove}
              disabled={saving}
            >
              <i className="bi bi-x" />Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="d-none"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
