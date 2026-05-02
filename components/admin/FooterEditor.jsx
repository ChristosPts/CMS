'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

// ── Social item editor ──────────────────────────────────────────────────────

function SocialRow({ social, index, total, onChange, onRemove, onMove }) {
  const inputRef = useRef(null);

  async function handleIconUpload(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) onChange({ ...social, icon: json.data.filename });
  }

  return (
    <div className="border rounded p-3 mb-2 bg-white">
      <div className="d-flex gap-3 align-items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div
            className="border rounded d-flex align-items-center justify-content-center bg-light"
            style={{ width: 48, height: 48, cursor: 'pointer', overflow: 'hidden' }}
            onClick={() => inputRef.current?.click()}
            title="Upload icon"
          >
            {social.icon ? (
              <Image src={`/uploads/${social.icon}`} alt="" width={40} height={40} style={{ objectFit: 'contain' }} unoptimized />
            ) : (
              <i className="bi bi-image text-muted" />
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="d-none" onChange={(e) => handleIconUpload(e.target.files?.[0])} />
        </div>

        <div className="flex-grow-1 row g-2">
          <div className="col-12 col-sm-6">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Label (e.g. Facebook)"
              value={social.label}
              onChange={(e) => onChange({ ...social, label: e.target.value })}
            />
          </div>
          <div className="col-12 col-sm-6">
            <input
              type="url"
              className="form-control form-control-sm"
              placeholder="URL"
              value={social.url}
              onChange={(e) => onChange({ ...social, url: e.target.value })}
            />
          </div>
        </div>

        <div className="d-flex flex-column gap-1">
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === 0} onClick={() => onMove(index, -1)}><i className="bi bi-chevron-up" /></button>
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === total - 1} onClick={() => onMove(index, 1)}><i className="bi bi-chevron-down" /></button>
          <button type="button" className="btn btn-sm btn-outline-danger p-1 lh-1" onClick={onRemove}><i className="bi bi-x" /></button>
        </div>
      </div>
    </div>
  );
}

// ── Nav item editor (one column = parent + children) ───────────────────────

function NavColumn({ item, index, total, activeLocales, defaultLocale, pageOptions, onChange, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(true);

  function addChild() {
    const labelJson = {};
    activeLocales.forEach((l) => { labelJson[l] = ''; });
    onChange({ ...item, children: [...(item.children ?? []), { id: null, labelJson, url: '', linkedPageId: '', openInNewTab: false, children: [] }] });
  }

  function updateChild(ci, child) {
    onChange({ ...item, children: item.children.map((c, i) => i === ci ? child : c) });
  }

  function removeChild(ci) {
    onChange({ ...item, children: item.children.filter((_, i) => i !== ci) });
  }

  return (
    <div className="border rounded mb-3 bg-white">
      {/* Column header */}
      <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light">
        <div className="d-flex flex-column gap-0">
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === 0} onClick={() => onMove(index, -1)}><i className="bi bi-chevron-up" /></button>
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === total - 1} onClick={() => onMove(index, 1)}><i className="bi bi-chevron-down" /></button>
        </div>
        <strong className="small flex-grow-1">
          {item.labelJson?.[defaultLocale] || <em className="text-muted fw-normal">Untitled column</em>}
        </strong>
        <button type="button" className="btn btn-sm btn-link text-muted p-1" onClick={() => setExpanded((e) => !e)}><i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} /></button>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRemove}><i className="bi bi-trash" /></button>
      </div>

      {expanded && (
        <div className="p-3">
          {/* Column heading labels per locale */}
          <div className="mb-3">
            <div className="form-label small fw-medium mb-1">Column heading</div>
            <div className="row g-2">
              {activeLocales.map((loc) => (
                <div key={loc} className="col-12 col-sm-6">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text text-muted">{loc.toUpperCase()}</span>
                    <input
                      type="text"
                      className="form-control"
                      value={item.labelJson?.[loc] ?? ''}
                      onChange={(e) => onChange({ ...item, labelJson: { ...item.labelJson, [loc]: e.target.value } })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column link (optional — if the heading itself is clickable) */}
          <div className="mb-3">
            <label className="form-label small">Heading link (optional)</label>
            <div className="row g-2">
              <div className="col-12 col-sm-6">
                <select
                  className="form-select form-select-sm"
                  value={item.linkedPageId || ''}
                  onChange={(e) => onChange({ ...item, linkedPageId: e.target.value, url: '' })}
                >
                  <option value="">— Link to page —</option>
                  {pageOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div className="col-12 col-sm-6">
                <input
                  type="url"
                  className="form-control form-control-sm"
                  placeholder="or custom URL"
                  value={item.url || ''}
                  onChange={(e) => onChange({ ...item, url: e.target.value, linkedPageId: '' })}
                />
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="form-label small fw-medium mb-2">Links</div>
          {(item.children ?? []).map((child, ci) => (
            <NavChildRow
              key={ci}
              child={child}
              index={ci}
              total={item.children.length}
              activeLocales={activeLocales}
              defaultLocale={defaultLocale}
              pageOptions={pageOptions}
              onChange={(c) => updateChild(ci, c)}
              onRemove={() => removeChild(ci)}
            />
          ))}
          <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={addChild}>
            <i className="bi bi-plus me-1" />Add link
          </button>
        </div>
      )}
    </div>
  );
}

function NavChildRow({ child, index, total, activeLocales, defaultLocale, pageOptions, onChange, onRemove }) {
  return (
    <div className="border rounded p-2 mb-2 bg-light">
      <div className="row g-2 align-items-center">
        <div className="col-12 col-md-4">
          <div className="input-group input-group-sm">
            <span className="input-group-text text-muted">{defaultLocale.toUpperCase()}</span>
            <input
              type="text"
              className="form-control"
              placeholder="Label"
              value={child.labelJson?.[defaultLocale] ?? ''}
              onChange={(e) => onChange({ ...child, labelJson: { ...child.labelJson, [defaultLocale]: e.target.value } })}
            />
          </div>
        </div>
        <div className="col-12 col-md-3">
          <select
            className="form-select form-select-sm"
            value={child.linkedPageId || ''}
            onChange={(e) => onChange({ ...child, linkedPageId: e.target.value, url: '' })}
          >
            <option value="">— Page —</option>
            {pageOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-3">
          <input
            type="url"
            className="form-control form-control-sm"
            placeholder="or URL"
            value={child.url || ''}
            onChange={(e) => onChange({ ...child, url: e.target.value, linkedPageId: '' })}
          />
        </div>
        <div className="col-auto">
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRemove}><i className="bi bi-x" /></button>
        </div>
      </div>
    </div>
  );
}

// ── Main editor ─────────────────────────────────────────────────────────────

export default function FooterEditor({ initial, activeLocales, defaultLocale, pageOptions }) {
  const [settings, setSettings] = useState(initial.settings ?? {});
  const [navTree,  setNavTree]  = useState(initial.navTree  ?? []);
  const [socials,  setSocials]  = useState(initial.socials  ?? []);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  function setSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function getDesc(locale) {
    try {
      const parsed = typeof settings.footer_description === 'string'
        ? JSON.parse(settings.footer_description)
        : (settings.footer_description ?? {});
      return parsed[locale] ?? '';
    } catch { return ''; }
  }

  function setDesc(locale, value) {
    let parsed = {};
    try { parsed = JSON.parse(settings.footer_description ?? '{}'); } catch {}
    setSetting('footer_description', JSON.stringify({ ...parsed, [locale]: value }));
  }

  function addColumn() {
    const labelJson = {};
    activeLocales.forEach((l) => { labelJson[l] = ''; });
    setNavTree([...navTree, { id: null, labelJson, url: '', linkedPageId: '', openInNewTab: false, children: [] }]);
  }

  function moveColumn(i, dir) {
    const next = [...navTree];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setNavTree(next);
  }

  function addSocial() {
    setSocials([...socials, { id: null, icon: '', url: '', label: '' }]);
  }

  function moveSocial(i, dir) {
    const next = [...socials];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setSocials(next);
  }

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);

    const [r1, r2, r3] = await Promise.all([
      fetch('/api/admin/footer',         { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }),
      fetch('/api/admin/footer/nav',     { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: navTree }) }),
      fetch('/api/admin/footer/socials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ socials }) }),
    ]);

    const [j1, j2, j3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
    setSaving(false);

    if (!j1.success || !j2.success || !j3.success) {
      setError('Failed to save. Please try again.');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      {error && <div className="alert alert-danger py-2 mb-4">{error}</div>}
      {saved && <div className="alert alert-success py-2 mb-4">Footer saved.</div>}

      <div className="row g-4">
        {/* Left column — settings */}
        <div className="col-12 col-xl-4">
          {/* Description per locale */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Description</div>
            <div className="card-body">
              {activeLocales.map((loc) => (
                <div key={loc} className="mb-3">
                  <label className="form-label small">{loc.toUpperCase()}</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    value={getDesc(loc)}
                    onChange={(e) => setDesc(loc, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Contact Info</div>
            <div className="card-body">
              <div className="mb-2">
                <label className="form-label small">Email</label>
                <input type="email" className="form-control form-control-sm" value={settings.footer_email ?? ''} onChange={(e) => setSetting('footer_email', e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="form-label small">Phone</label>
                <input type="text" className="form-control form-control-sm" value={settings.footer_phone ?? ''} onChange={(e) => setSetting('footer_phone', e.target.value)} />
              </div>
              <div className="mb-0">
                <label className="form-label small">Address</label>
                <textarea className="form-control form-control-sm" rows={3} value={settings.footer_address ?? ''} onChange={(e) => setSetting('footer_address', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Copyright + legal */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header fw-semibold">Copyright &amp; Legal</div>
            <div className="card-body">
              <div className="mb-2">
                <label className="form-label small">Copyright text</label>
                <input type="text" className="form-control form-control-sm" placeholder="© 2025 My Company" value={settings.footer_copyright ?? ''} onChange={(e) => setSetting('footer_copyright', e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="form-label small">Privacy Policy URL</label>
                <input type="url" className="form-control form-control-sm" placeholder="/privacy" value={settings.footer_privacy_url ?? ''} onChange={(e) => setSetting('footer_privacy_url', e.target.value)} />
              </div>
              <div className="mb-0">
                <label className="form-label small">Terms of Service URL</label>
                <input type="url" className="form-control form-control-sm" placeholder="/terms" value={settings.footer_terms_url ?? ''} onChange={(e) => setSetting('footer_terms_url', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Middle + right — nav columns + socials */}
        <div className="col-12 col-xl-8">
          {/* Nav columns */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Navigation Columns</span>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addColumn}>
                <i className="bi bi-plus me-1" />Add column
              </button>
            </div>
            <div className="card-body">
              {navTree.length === 0 && <p className="text-muted small mb-0">No columns yet.</p>}
              {navTree.map((item, i) => (
                <NavColumn
                  key={i}
                  item={item}
                  index={i}
                  total={navTree.length}
                  activeLocales={activeLocales}
                  defaultLocale={defaultLocale}
                  pageOptions={pageOptions}
                  onChange={(updated) => setNavTree(navTree.map((c, idx) => idx === i ? updated : c))}
                  onRemove={() => setNavTree(navTree.filter((_, idx) => idx !== i))}
                  onMove={moveColumn}
                />
              ))}
            </div>
          </div>

          {/* Socials */}
          <div className="card border-0 shadow-sm">
            <div className="card-header d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Social Links</span>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addSocial}>
                <i className="bi bi-plus me-1" />Add social
              </button>
            </div>
            <div className="card-body">
              {socials.length === 0 && <p className="text-muted small mb-0">No social links yet.</p>}
              {socials.map((s, i) => (
                <SocialRow
                  key={i}
                  social={s}
                  index={i}
                  total={socials.length}
                  onChange={(updated) => setSocials(socials.map((x, idx) => idx === i ? updated : x))}
                  onRemove={() => setSocials(socials.filter((_, idx) => idx !== i))}
                  onMove={moveSocial}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Footer'}
        </button>
      </div>
    </div>
  );
}
