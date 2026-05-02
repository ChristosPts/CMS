'use client';

import { useState } from 'react';

export default function SettingsForm({ initial }) {
  const [siteName, setSiteName]                     = useState(initial.site_name);
  const [contactEmail, setContactEmail]             = useState(initial.contact_email);
  const [defaultLocale, setDefaultLocale]           = useState(initial.default_locale);
  const [activeLocales, setActiveLocales]           = useState(initial.active_locales);
  const [registrationEnabled, setRegistrationEnabled] = useState(initial.registration_enabled);
  const [maintenanceMode, setMaintenanceMode]       = useState(initial.maintenance_mode);
  const [mailProvider, setMailProvider]             = useState(initial.mail_provider);
  const [newLocale, setNewLocale]                   = useState('');
  const [saving, setSaving]                         = useState(false);
  const [toast, setToast]                           = useState(null); // { type: 'success'|'danger', msg }

  function addLocale() {
    const code = newLocale.trim().toLowerCase();
    if (!code || activeLocales.includes(code)) return;
    setActiveLocales([...activeLocales, code]);
    setNewLocale('');
  }

  function removeLocale(code) {
    if (code === defaultLocale) return; // cannot remove default
    if (activeLocales.length <= 1) return; // must keep at least one
    setActiveLocales(activeLocales.filter((l) => l !== code));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_name:            siteName,
        contact_email:        contactEmail,
        default_locale:       defaultLocale,
        active_locales:       activeLocales,
        registration_enabled: registrationEnabled,
        maintenance_mode:     maintenanceMode,
        mail_provider:        mailProvider,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (json.success) {
      setToast({ type: 'success', msg: 'Settings saved.' });
    } else {
      setToast({ type: 'danger', msg: typeof json.error === 'string' ? json.error : 'Failed to save settings.' });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible py-2 mb-4`}>
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)} />
        </div>
      )}

      {/* ── General ─────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">General</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Site Name</label>
            <input
              type="text"
              className="form-control"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              required
            />
            <div className="form-text">Used in meta titles and outgoing emails.</div>
          </div>

          <div className="mb-0">
            <label className="form-label">Contact Email</label>
            <input
              type="email"
              className="form-control"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="notifications@example.com"
            />
            <div className="form-text">Contact form submissions are sent here.</div>
          </div>
        </div>
      </div>

      {/* ── Languages ────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Languages</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Active Locales</label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {activeLocales.map((code) => (
                <span key={code} className="badge bg-secondary d-flex align-items-center gap-1 fs-6 fw-normal px-2 py-1">
                  {code}
                  {code !== defaultLocale && (
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-1"
                      style={{ fontSize: '0.6rem' }}
                      onClick={() => removeLocale(code)}
                      aria-label={`Remove ${code}`}
                    />
                  )}
                </span>
              ))}
            </div>
            <div className="input-group" style={{ maxWidth: '260px' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. fr, de, es"
                value={newLocale}
                onChange={(e) => setNewLocale(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocale())}
                maxLength={10}
              />
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addLocale}>
                Add
              </button>
            </div>
            <div className="form-text">Enter an ISO 639-1 code (e.g. <code>en</code>, <code>el</code>, <code>fr</code>). The default locale cannot be removed.</div>
          </div>

          <div className="mb-0">
            <label className="form-label">Default Locale</label>
            <select
              className="form-select"
              style={{ maxWidth: '200px' }}
              value={defaultLocale}
              onChange={(e) => setDefaultLocale(e.target.value)}
            >
              {activeLocales.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <div className="form-text">Slugs are generated from the default locale title.</div>
          </div>
        </div>
      </div>

      {/* ── Email ────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Email</div>
        <div className="card-body">
          <label className="form-label">Mail Provider</label>
          <div className="d-flex gap-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                id="mail-gmail"
                value="gmail"
                checked={mailProvider === 'gmail'}
                onChange={() => setMailProvider('gmail')}
              />
              <label className="form-check-label" htmlFor="mail-gmail">Gmail SMTP</label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                id="mail-graph"
                value="graph"
                checked={mailProvider === 'graph'}
                onChange={() => setMailProvider('graph')}
              />
              <label className="form-check-label" htmlFor="mail-graph">Microsoft Graph</label>
            </div>
          </div>
          <div className="form-text">Connection credentials are set in <code>.env.local</code>.</div>
        </div>
      </div>

      {/* ── Access ───────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Access</div>
        <div className="card-body">
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="registration-enabled"
              checked={registrationEnabled}
              onChange={(e) => setRegistrationEnabled(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="registration-enabled">
              Public registration enabled
            </label>
          </div>

          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="maintenance-mode"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="maintenance-mode">
              Maintenance mode <span className="text-muted small">(shows maintenance page to public)</span>
            </label>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
