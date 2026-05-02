'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function FeaturedImagePicker({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const fd = new FormData();
    fd.append('file', file);

    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();

    setUploading(false);

    if (json.success) {
      onChange(json.data.filename);
    } else {
      setError(json.error ?? 'Upload failed');
    }

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  }

  return (
    <div>
      {value ? (
        <div className="mb-2 position-relative" style={{ maxWidth: 260 }}>
          <Image
            src={`/uploads/thumbnails/thumb_${value}`}
            alt="Featured image"
            width={260}
            height={160}
            className="img-fluid rounded border"
            style={{ objectFit: 'cover', width: '100%', height: 160 }}
            unoptimized
          />
          <button
            type="button"
            className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
            onClick={() => onChange(null)}
            title="Remove image"
          >
            <i className="bi bi-x" />
          </button>
        </div>
      ) : (
        <div
          className="border rounded d-flex align-items-center justify-content-center text-muted mb-2"
          style={{ height: 100, maxWidth: 260, cursor: 'pointer', background: '#f8f9fa' }}
          onClick={() => inputRef.current?.click()}
        >
          <i className="bi bi-image fs-3" />
        </div>
      )}

      {error && <div className="text-danger small mb-1">{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="d-none"
        onChange={handleFile}
      />

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : value ? 'Change Image' : 'Upload Image'}
      </button>
    </div>
  );
}
