'use client';

import { useState, useEffect } from 'react';
import FeaturedImagePicker from './FeaturedImagePicker';

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function blankItem(activeLocales, sortOrder) {
  const translations = {};
  activeLocales.forEach((loc) => {
    translations[loc] = { name: '', subtitle: '', description: '' };
  });
  return { _key: makeKey(), id: null, image: null, sortOrder, translations };
}

function fromInitial(items, activeLocales) {
  return (items ?? []).map((item) => {
    const translations = {};
    activeLocales.forEach((loc) => {
      const t = item.translations?.find((x) => x.locale === loc);
      translations[loc] = {
        name:        t?.name        ?? '',
        subtitle:    t?.subtitle    ?? '',
        description: t?.description ?? '',
      };
    });
    return { _key: makeKey(), id: item.id, image: item.image ?? null, sortOrder: item.sortOrder, translations };
  });
}

export default function GridItemsEditor({ activeLocales, defaultLocale, initialItems, onChange }) {
  const [items,       setItems]       = useState(() => fromInitial(initialItems, activeLocales));
  const [expandedKey, setExpandedKey] = useState(null);
  const [localeTab,   setLocaleTab]   = useState(defaultLocale);

  // Propagate upward whenever items change
  useEffect(() => {
    onChange(items.map((item, idx) => ({
      id:          item.id,
      image:       item.image,
      sortOrder:   idx,
      translations: Object.entries(item.translations).map(([locale, t]) => ({
        locale, name: t.name, subtitle: t.subtitle, description: t.description,
      })),
    })));
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  function setAndPropagate(next) {
    setItems(next.map((i, idx) => ({ ...i, sortOrder: idx })));
  }

  function addItem() {
    const item = blankItem(activeLocales, items.length);
    setItems((prev) => [...prev, item]);
    setExpandedKey(item._key);
  }

  function removeItem(_key) {
    setAndPropagate(items.filter((i) => i._key !== _key));
    if (expandedKey === _key) setExpandedKey(null);
  }

  function moveUp(idx) {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setAndPropagate(next);
  }

  function moveDown(idx) {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setAndPropagate(next);
  }

  function setImage(_key, filename) {
    setItems((prev) => prev.map((i) => i._key === _key ? { ...i, image: filename } : i));
  }

  function setTrans(_key, locale, field, value) {
    setItems((prev) => prev.map((i) =>
      i._key === _key
        ? { ...i, translations: { ...i.translations, [locale]: { ...i.translations[locale], [field]: value } } }
        : i
    ));
  }

  return (
    <div>
      {items.length === 0 && (
        <p className="text-muted small mb-2">No items yet. Add one below.</p>
      )}

      {items.map((item, idx) => {
        const label = item.translations[defaultLocale]?.name || `Item ${idx + 1}`;
        const isOpen = expandedKey === item._key;

        return (
          <div key={item._key} className="card border shadow-sm mb-2">
            {/* ── Header (always visible) ──────────────────────── */}
            <div className="card-header d-flex align-items-center gap-2 py-2 px-3">
              <span className="fw-medium small text-truncate flex-grow-1">{label}</span>

              {/* Reorder */}
              <div className="d-flex flex-column">
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 lh-1 text-muted"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                  title="Move up"
                ><i className="bi bi-chevron-up" /></button>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 lh-1 text-muted"
                  disabled={idx === items.length - 1}
                  onClick={() => moveDown(idx)}
                  title="Move down"
                ><i className="bi bi-chevron-down" /></button>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setExpandedKey(isOpen ? null : item._key)}
              >
                {isOpen ? <i className="bi bi-chevron-up" /> : <i className="bi bi-pencil" />}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeItem(item._key)}
                title="Delete item"
              >
                <i className="bi bi-trash" />
              </button>
            </div>

            {/* ── Body (collapsible) ───────────────────────────── */}
            {isOpen && (
              <div className="card-body">
                <div className="row g-3">
                  {/* Image */}
                  <div className="col-12 col-sm-4">
                    <label className="form-label small fw-medium">Image</label>
                    <FeaturedImagePicker
                      value={item.image}
                      onChange={(filename) => setImage(item._key, filename)}
                    />
                  </div>

                  {/* Translations */}
                  <div className="col-12 col-sm-8">
                    {/* Locale tabs */}
                    {activeLocales.length > 1 && (
                      <ul className="nav nav-tabs mb-3">
                        {activeLocales.map((loc) => (
                          <li key={loc} className="nav-item">
                            <button
                              type="button"
                              className={`nav-link py-1 px-3 ${localeTab === loc ? 'active' : ''}`}
                              onClick={() => setLocaleTab(loc)}
                            >
                              {loc.toUpperCase()}
                              {loc === defaultLocale && (
                                <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.6rem' }}>default</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeLocales.map((loc) => (
                      <div key={loc} className={localeTab !== loc ? 'd-none' : ''}>
                        <div className="mb-2">
                          <label className="form-label small">Name {loc === defaultLocale && <span className="text-danger">*</span>}</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.translations[loc]?.name ?? ''}
                            onChange={(e) => setTrans(item._key, loc, 'name', e.target.value)}
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label small">Subtitle / Role</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.translations[loc]?.subtitle ?? ''}
                            onChange={(e) => setTrans(item._key, loc, 'subtitle', e.target.value)}
                          />
                        </div>
                        <div className="mb-0">
                          <label className="form-label small">Description</label>
                          <textarea
                            className="form-control form-control-sm"
                            rows={3}
                            value={item.translations[loc]?.description ?? ''}
                            onChange={(e) => setTrans(item._key, loc, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className="btn btn-sm btn-outline-primary mt-1" onClick={addItem}>
        <i className="bi bi-plus-circle me-1" />Add Item
      </button>
    </div>
  );
}
