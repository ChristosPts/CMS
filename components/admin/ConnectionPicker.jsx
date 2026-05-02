'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

const TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

const STATUS_CLS = {
  PUBLISHED: 'bg-success',
  DRAFT:     'bg-warning text-dark',
  HIDDEN:    'bg-secondary',
};

// ── Normalise raw API results into a standard { id, label, meta } shape ────

function normalise(type, raw, defaultLocale) {
  if (type === 'gallery') {
    return raw.map((g) => ({
      id:    g.id,
      label: g.title,
      thumb: g.images?.[0]?.filename ?? null,
      meta:  `${g._count?.images ?? 0} image(s)`,
    }));
  }
  if (type === 'download') {
    return raw.map((d) => {
      const trans = d.translations?.find((t) => t.locale === defaultLocale) ?? d.translations?.[0];
      return {
        id:    d.id,
        label: trans?.title ?? d.originalName,
        thumb: null,
        meta:  TYPE_LABELS[d.fileType] ?? d.fileType,
      };
    });
  }
  if (type === 'article') {
    return raw.map((a) => {
      const trans = a.translations?.find((t) => t.locale === defaultLocale) ?? a.translations?.[0];
      return {
        id:    a.id,
        label: trans?.title ?? a.slug,
        thumb: null,
        meta:  a.status,
        metaCls: STATUS_CLS[a.status] ?? 'bg-secondary',
      };
    });
  }
  return [];
}

// ── Fetch search results from the appropriate API ──────────────────────────

async function searchItems(type, query, parentPageId) {
  let url;
  const q = encodeURIComponent(query);
  if (type === 'gallery')  url = `/api/admin/galleries?search=${q}&perPage=15`;
  if (type === 'download') url = `/api/admin/downloads?search=${q}&perPage=15`;
  if (type === 'article')  url = `/api/admin/articles?search=${q}&perPage=15${parentPageId ? `&parentPageId=${parentPageId}` : ''}`;

  const res  = await fetch(url);
  const json = await res.json();
  if (!json.success) return [];

  if (type === 'gallery')  return json.data ?? [];
  if (type === 'download') return json.data?.downloads ?? [];
  if (type === 'article')  return json.data?.articles ?? [];
  return [];
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * Props:
 *   type          – 'gallery' | 'download' | 'article'
 *   value         – array of { id, sortOrder, label, thumb?, meta?, metaCls? }
 *   onChange      – (items) => void  – called on every change
 *   defaultLocale – used to resolve translated titles in search results
 *   label         – section heading (e.g. "Connected Galleries")
 *   parentPageId  – (article picker only) restricts search to one ARTICLE_LIST parent
 */
export default function ConnectionPicker({
  type, value, onChange, defaultLocale = 'en', label, parentPageId,
}) {
  const [items,   setItems]   = useState(value ?? []);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const debounce  = useRef(null);
  const inputRef  = useRef(null);

  // Propagate changes upward
  useEffect(() => { onChange(items); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectedIds = new Set(items.map((i) => i.id));

  const doSearch = useCallback(async (q) => {
    setLoading(true);
    const raw = await searchItems(type, q, parentPageId);
    const normalised = normalise(type, raw, defaultLocale);
    setResults(normalised.filter((r) => !connectedIds.has(r.id)));
    setLoading(false);
  }, [type, defaultLocale, parentPageId, connectedIds]);

  function handleQueryChange(e) {
    setQuery(e.target.value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(e.target.value), 300);
  }

  function openSearch() {
    setOpen(true);
    setQuery('');
    doSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function addItem(item) {
    setItems((prev) => [...prev, { ...item, sortOrder: prev.length }]);
    setResults((prev) => prev.filter((r) => r.id !== item.id));
  }

  function removeItem(id) {
    setItems((prev) =>
      prev.filter((i) => i.id !== id).map((i, idx) => ({ ...i, sortOrder: idx }))
    );
  }

  function moveUp(idx) {
    if (idx === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }

  function moveDown(idx) {
    setItems((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }

  return (
    <div>
      {label && <div className="form-label fw-medium mb-2">{label}</div>}

      {/* Connected items */}
      {items.length > 0 && (
        <ul className="list-group mb-2">
          {items.map((item, idx) => (
            <li key={item.id} className="list-group-item py-2 px-3 d-flex align-items-center gap-2">
              {item.thumb && (
                <Image
                  src={`/uploads/thumbnails/thumb_${item.thumb}`}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded"
                  style={{ objectFit: 'cover', width: 40, height: 40 }}
                  unoptimized
                />
              )}
              <div className="flex-grow-1 min-w-0">
                <div className="small fw-medium text-truncate">{item.label}</div>
                {item.meta && (
                  <span className={`badge ${item.metaCls ?? 'bg-light text-dark border'} small fw-normal`}>
                    {item.meta}
                  </span>
                )}
              </div>
              {/* Reorder */}
              <div className="d-flex flex-column gap-0">
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 lh-1 text-muted"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                  title="Move up"
                >
                  <i className="bi bi-chevron-up" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 lh-1 text-muted"
                  disabled={idx === items.length - 1}
                  onClick={() => moveDown(idx)}
                  title="Move down"
                >
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeItem(item.id)}
                title="Remove"
              >
                <i className="bi bi-x" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Search / add */}
      {open ? (
        <div className="border rounded p-2 bg-light">
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder="Search…"
              value={query}
              onChange={handleQueryChange}
            />
            <button type="button" className="btn btn-outline-secondary" onClick={() => setOpen(false)}>
              <i className="bi bi-x" />
            </button>
          </div>

          {loading && <div className="text-center text-muted small py-2">Searching…</div>}

          {!loading && results.length === 0 && (
            <div className="text-center text-muted small py-2">
              {query ? 'No results.' : 'Start typing to search.'}
            </div>
          )}

          {results.length > 0 && (
            <ul className="list-group list-group-flush" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {results.map((r) => (
                <li key={r.id} className="list-group-item list-group-item-action py-2 px-2 d-flex align-items-center gap-2">
                  {r.thumb && (
                    <Image
                      src={`/uploads/thumbnails/thumb_${r.thumb}`}
                      alt=""
                      width={36}
                      height={36}
                      className="rounded"
                      style={{ objectFit: 'cover', width: 36, height: 36 }}
                      unoptimized
                    />
                  )}
                  <div className="flex-grow-1 min-w-0">
                    <div className="small fw-medium text-truncate">{r.label}</div>
                    {r.meta && (
                      <span className={`badge ${r.metaCls ?? 'bg-light text-dark border'} small fw-normal`}>
                        {r.meta}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary flex-shrink-0"
                    onClick={() => addItem(r)}
                  >
                    <i className="bi bi-plus" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={openSearch}
        >
          <i className="bi bi-plus-circle me-1" />Add {type}
        </button>
      )}
    </div>
  );
}
