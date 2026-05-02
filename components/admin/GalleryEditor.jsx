'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Sortable image card ────────────────────────────────────────────────────

function SortableImage({ image, onAltSave, onToggleHide, onDelete }) {
  const [alt, setAlt] = useState(image.alt ?? '');
  const [saving, setSaving] = useState(false);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleAltBlur() {
    if (alt === (image.alt ?? '')) return;
    setSaving(true);
    await onAltSave(image.id, alt);
    setSaving(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="col-6 col-md-4 col-lg-3">
      <div className={`card border-0 shadow-sm h-100 ${image.hidden ? 'opacity-50' : ''}`}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="card-header py-1 px-2 d-flex align-items-center justify-content-between bg-light"
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <i className="bi bi-grip-horizontal text-muted" />
          {image.hidden && <span className="badge bg-secondary small">Hidden</span>}
        </div>

        {/* Thumbnail */}
        <div style={{ height: 140, overflow: 'hidden' }}>
          <Image
            src={`/uploads/thumbnails/thumb_${image.filename}`}
            alt={alt || image.filename}
            width={200}
            height={140}
            className="w-100 h-100"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </div>

        <div className="card-body p-2">
          {/* Alt text */}
          <input
            type="text"
            className={`form-control form-control-sm mb-2 ${saving ? 'opacity-50' : ''}`}
            placeholder="Alt text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={handleAltBlur}
          />

          {/* Actions */}
          <div className="d-flex gap-1">
            <button
              type="button"
              className={`btn btn-sm flex-grow-1 ${image.hidden ? 'btn-outline-success' : 'btn-outline-warning'}`}
              onClick={() => onToggleHide(image.id, !image.hidden)}
              title={image.hidden ? 'Show' : 'Hide'}
            >
              <i className={`bi bi-eye${image.hidden ? '' : '-slash'}`} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onDelete(image.id)}
              title="Delete"
            >
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────

export default function GalleryEditor({ galleryId, initialTitle, initialImages }) {
  const [title,     setTitle]     = useState(initialTitle);
  const [titleSaved, setTitleSaved] = useState(false);
  const [images,    setImages]    = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Title save ────────────────────────────────────────────────────────
  async function saveTitle() {
    await fetch(`/api/admin/galleries/${galleryId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title }),
    });
    setTitleSaved(true);
    setTimeout(() => setTitleSaved(false), 2000);
  }

  // ── Image upload ──────────────────────────────────────────────────────
  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setUploadErrors([]);

    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));

    const res  = await fetch(`/api/admin/galleries/${galleryId}/images`, { method: 'POST', body: fd });
    const json = await res.json();

    if (json.success) {
      setImages((prev) => [...prev, ...json.data.uploaded]);
      if (json.data.errors?.length) setUploadErrors(json.data.errors);
    }
    setUploading(false);
    e.target.value = '';
  }

  // ── DnD reorder ───────────────────────────────────────────────────────
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);
    setImages(reordered);

    fetch(`/api/admin/galleries/${galleryId}/reorder`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ imageIds: reordered.map((i) => i.id) }),
    });
  }

  // ── Per-image actions ─────────────────────────────────────────────────
  async function handleAltSave(imageId, alt) {
    await fetch(`/api/admin/galleries/${galleryId}/images/${imageId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ alt }),
    });
    setImages((prev) => prev.map((img) => img.id === imageId ? { ...img, alt } : img));
  }

  async function handleToggleHide(imageId, hidden) {
    await fetch(`/api/admin/galleries/${galleryId}/images/${imageId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ hidden }),
    });
    setImages((prev) => prev.map((img) => img.id === imageId ? { ...img, hidden } : img));
  }

  async function handleDelete(imageId) {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    await fetch(`/api/admin/galleries/${galleryId}/images/${imageId}`, { method: 'DELETE' });
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  return (
    <div>
      {/* Title */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <label className="form-label fw-semibold">Gallery Title</label>
          <div className="input-group" style={{ maxWidth: 400 }}>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
            />
            <button type="button" className="btn btn-outline-secondary" onClick={saveTitle}>
              {titleSaved ? <i className="bi bi-check text-success" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="bi bi-upload me-2" />
          {uploading ? 'Uploading…' : 'Upload Images'}
        </button>
        <span className="text-muted small">JPG, PNG, GIF, WebP · max 10 MB each · multi-select supported</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="d-none"
          onChange={handleFiles}
        />
      </div>

      {uploadErrors.length > 0 && (
        <div className="alert alert-warning py-2 mb-3">
          {uploadErrors.map((e, i) => (
            <div key={i}><strong>{e.name}</strong>: {e.error}</div>
          ))}
        </div>
      )}

      {/* Image grid with DnD */}
      {images.length === 0 ? (
        <div
          className="border border-dashed rounded d-flex align-items-center justify-content-center text-muted"
          style={{ height: 200, cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <i className="bi bi-images fs-1 d-block mb-2" />
            Click to upload images
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="row g-3">
              {images.map((image) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  onAltSave={handleAltSave}
                  onToggleHide={handleToggleHide}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
