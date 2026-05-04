'use client';

import { useState, useEffect } from 'react';
import FeaturedImagePicker from './FeaturedImagePicker';
import RichTextEditor from './RichTextEditor';

function makeKey() { return Math.random().toString(36).slice(2); }

function blankItem(activeLocales, sortOrder) {
  const translations = {};
  activeLocales.forEach((loc) => { translations[loc] = { name: '', subtitle: '', description: '' }; });
  return { _key: makeKey(), id: null, image: null, linkUrl: '', openInNewTab: false, sortOrder, translations };
}

function fromInitial(items, activeLocales) {
  return (items ?? []).map((item) => {
    const translations = {};
    activeLocales.forEach((loc) => {
      const t = item.translations?.find((x) => x.locale === loc);
      translations[loc] = { name: t?.name ?? '', subtitle: t?.subtitle ?? '', description: t?.description ?? '' };
    });
    return { _key: makeKey(), id: item.id, image: item.image ?? null, linkUrl: item.linkUrl ?? '', openInNewTab: item.openInNewTab ?? false, sortOrder: item.sortOrder, translations };
  });
}

export default function GridItemsEditor({ activeLocales, defaultLocale, initialItems, onChange }) {
  const [items,       setItems]       = useState(() => fromInitial(initialItems, activeLocales));
  const [expandedKey, setExpandedKey] = useState(null);
  const [localeTab,   setLocaleTab]   = useState(defaultLocale);

  useEffect(() => {
    onChange(items.map((item, idx) => ({
      id:          item.id,
      image:       item.image,
      linkUrl:     item.linkUrl || null,
      openInNewTab: item.openInNewTab,
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

  function move(idx, dir) {
    const next = [...items];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setAndPropagate(next);
  }

  function setField(_key, field, value) {
    setItems((prev) => prev.map((i) => i._key === _key ? { ...i, [field]: value } : i));
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
      {items.length === 0 && <p className="text-muted small mb-2">No items yet. Add one below.</p>}

      {items.map((item, idx) => {
        const label  = item.translations[defaultLocale]?.name || `Item ${idx + 1}`;
        const isOpen = expandedKey === item._key;

        return (
          <div key={item._key} className="card border shadow-sm mb-2">
            <div className="card-header d-flex align-items-center gap-2 py-2 px-3">
              <span className="fw-medium small text-truncate flex-grow-1">{label}</span>
              {item.linkUrl && <i className="bi bi-link-45deg text-muted small" title={item.linkUrl} />}
              <div className="d-flex flex-column">
                <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={idx === 0} onClick={() => move(idx, 'up')}><i className="bi bi-chevron-up" /></button>
                <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={idx === items.length - 1} onClick={() => move(idx, 'down')}><i className="bi bi-chevron-down" /></button>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedKey(isOpen ? null : item._key)}>
                {isOpen ? <i className="bi bi-chevron-up" /> : <i className="bi bi-pencil" />}
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item._key)}><i className="bi bi-trash" /></button>
            </div>

            {isOpen && (
              <div className="card-body">
                <div className="row g-3">
                  {/* Image */}
                  <div className="col-12 col-sm-3">
                    <label className="form-label small fw-medium">Image</label>
                    <FeaturedImagePicker value={item.image} onChange={(f) => setField(item._key, 'image', f)} />
                  </div>

                  <div className="col-12 col-sm-9">
                    {/* Link URL */}
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Link URL <span className="text-muted fw-normal small">(optional — makes the card clickable)</span></label>
                      <div className="input-group input-group-sm">
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://partner-site.com"
                          value={item.linkUrl}
                          onChange={(e) => setField(item._key, 'linkUrl', e.target.value)}
                        />
                        <div className="input-group-text">
                          <div className="form-check mb-0 d-flex align-items-center gap-1">
                            <input
                              className="form-check-input mt-0"
                              type="checkbox"
                              id={`newTab-${item._key}`}
                              checked={item.openInNewTab}
                              onChange={(e) => setField(item._key, 'openInNewTab', e.target.checked)}
                            />
                            <label className="form-check-label small" htmlFor={`newTab-${item._key}`}>New tab</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Locale tabs */}
                    {activeLocales.length > 1 && (
                      <ul className="nav nav-tabs mb-3">
                        {activeLocales.map((loc) => (
                          <li key={loc} className="nav-item">
                            <button type="button" className={`nav-link py-1 px-3 ${localeTab === loc ? 'active' : ''}`} onClick={() => setLocaleTab(loc)}>
                              {loc.toUpperCase()}
                              {loc === defaultLocale && <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.6rem' }}>default</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeLocales.map((loc) => (
                      <div key={loc} className={localeTab !== loc ? 'd-none' : ''}>
                        <div className="mb-2">
                          <label className="form-label small">Name {loc === defaultLocale && <span className="text-danger">*</span>}</label>
                          <input type="text" className="form-control form-control-sm" value={item.translations[loc]?.name ?? ''} onChange={(e) => setTrans(item._key, loc, 'name', e.target.value)} />
                        </div>
                        <div className="mb-2">
                          <label className="form-label small">Subtitle / Role</label>
                          <input type="text" className="form-control form-control-sm" value={item.translations[loc]?.subtitle ?? ''} onChange={(e) => setTrans(item._key, loc, 'subtitle', e.target.value)} />
                        </div>
                        <div className="mb-0">
                          <label className="form-label small">Description</label>
                          <RichTextEditor
                            value={item.translations[loc]?.description ?? ''}
                            onChange={(html) => setTrans(item._key, loc, 'description', html)}
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
