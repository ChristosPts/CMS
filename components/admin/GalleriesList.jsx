'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function GalleriesList({ galleries: initial, role }) {
  const router   = useRouter();
  const [galleries, setGalleries]   = useState(initial);
  const [creating, setCreating]     = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [pending, startTransition]  = useTransition();

  async function createGallery(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res  = await fetch('/api/admin/galleries', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: newTitle.trim() }),
    });
    const json = await res.json();
    if (json.success) {
      setNewTitle('');
      setCreating(false);
      router.push(`/admin/galleries/${json.data.id}`);
    }
  }

  async function deleteGallery(id) {
    if (!confirm('Delete this gallery and all its images? This cannot be undone.')) return;
    await fetch(`/api/admin/galleries/${id}`, { method: 'DELETE' });
    setGalleries((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div>
      <div className="d-flex mb-3">
        {creating ? (
          <form onSubmit={createGallery} className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Gallery title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="btn btn-sm btn-primary">Create</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </form>
        ) : (
          <button className="btn btn-sm btn-primary ms-auto" onClick={() => setCreating(true)}>
            <i className="bi bi-plus-lg me-1" />New Gallery
          </button>
        )}
      </div>

      {galleries.length === 0 && (
        <div className="text-center text-muted py-5">
          No galleries yet. Create one to get started.
        </div>
      )}

      <div className="row g-3">
        {galleries.map((g) => {
          const thumb = g.images[0]?.filename;
          return (
            <div key={g.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                {thumb ? (
                  <Image
                    src={`/uploads/thumbnails/thumb_${thumb}`}
                    alt={g.title}
                    width={300}
                    height={180}
                    className="card-img-top"
                    style={{ objectFit: 'cover', height: 160 }}
                    unoptimized
                  />
                ) : (
                  <div
                    className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted"
                    style={{ height: 160 }}
                  >
                    <i className="bi bi-images fs-1" />
                  </div>
                )}
                <div className="card-body pb-2">
                  <h6 className="card-title mb-1">{g.title}</h6>
                  <p className="text-muted small mb-0">{g._count.images} image{g._count.images !== 1 ? 's' : ''}</p>
                </div>
                <div className="card-footer bg-transparent d-flex gap-2 pt-0">
                  <Link href={`/admin/galleries/${g.id}`} className="btn btn-sm btn-outline-secondary flex-grow-1">
                    <i className="bi bi-pencil me-1" />Edit
                  </Link>
                  {role === 'ADMIN' && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteGallery(g.id)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
