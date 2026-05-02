'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './GalleryCarousel.module.css';

/**
 * Props:
 *  images      – [{ filename, alt }] — visible (non-hidden) images
 *  displayMode – 'thumbnail' (show 1st image → click → lightbox)
 *               | 'grid'      (show all thumbnails → click → lightbox)
 *  title       – optional caption shown above the gallery
 */
export default function GalleryCarousel({ images, displayMode = 'thumbnail', title }) {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState(0);

  const visible = images.filter((img) => !img.hidden);
  if (!visible.length) return null;

  const prev = useCallback(() => setCurrent((c) => (c - 1 + visible.length) % visible.length), [visible.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % visible.length), [visible.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);

  function openAt(index) {
    setCurrent(index);
    setOpen(true);
  }

  return (
    <div className={styles.wrapper}>
      {title && <h6 className="mb-2 text-muted">{title}</h6>}

      {displayMode === 'thumbnail' ? (
        // Single thumbnail — first visible image
        <button
          type="button"
          className={styles.thumbBtn}
          onClick={() => openAt(0)}
          aria-label="Open gallery"
        >
          <Image
            src={`/uploads/thumbnails/thumb_${visible[0].filename}`}
            alt={visible[0].alt || title || ''}
            width={400}
            height={260}
            className={styles.thumbImg}
            unoptimized
          />
          <span className={styles.thumbOverlay}>
            <i className="bi bi-images me-1" />
            {visible.length} photo{visible.length !== 1 ? 's' : ''}
          </span>
        </button>
      ) : (
        // Full grid
        <div className={styles.grid}>
          {visible.map((img, i) => (
            <button
              key={img.filename}
              type="button"
              className={styles.gridItem}
              onClick={() => openAt(i)}
              aria-label={img.alt || `Photo ${i + 1}`}
            >
              <Image
                src={`/uploads/thumbnails/thumb_${img.filename}`}
                alt={img.alt || ''}
                width={200}
                height={200}
                className={styles.gridImg}
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {open && (
        <div className={styles.lightbox} onClick={() => setOpen(false)}>
          <button
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>

          {visible.length > 1 && (
            <>
              <button
                className={`${styles.navBtn} ${styles.navPrev}`}
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <button
                className={`${styles.navBtn} ${styles.navNext}`}
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </>
          )}

          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <Image
              src={`/uploads/${visible[current].filename}`}
              alt={visible[current].alt || ''}
              width={1200}
              height={800}
              className={styles.lightboxImg}
              unoptimized
              priority
            />
            {visible[current].alt && (
              <p className={styles.caption}>{visible[current].alt}</p>
            )}
            {visible.length > 1 && (
              <p className={styles.counter}>{current + 1} / {visible.length}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
