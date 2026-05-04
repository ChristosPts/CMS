'use client';

import { useState } from 'react';

export default function SettingsForm({ initial }) {
  const [siteName,               setSiteName]               = useState(initial.site_name                   ?? '');
  const [contactEmail,           setContactEmail]           = useState(initial.contact_email               ?? '');
  const [defaultLocale,          setDefaultLocale]          = useState(initial.default_locale              ?? 'en');
  const [activeLocales,          setActiveLocales]          = useState(initial.active_locales              ?? ['en']);
  const [registrationEnabled,    setRegistrationEnabled]    = useState(initial.registration_enabled        === true || initial.registration_enabled === 'true');
  const [salutationEnabled,      setSalutationEnabled]      = useState(initial.register_salutation_enabled === true || initial.register_salutation_enabled === 'true');
  const [phoneEnabled,           setPhoneEnabled]           = useState(initial.register_phone_enabled      === true || initial.register_phone_enabled === 'true');
  const [companyEnabled,         setCompanyEnabled]         = useState(initial.register_company_enabled    === true || initial.register_company_enabled === 'true');
  const [maintenanceMode,        setMaintenanceMode]        = useState(initial.maintenance_mode            === true || initial.maintenance_mode === 'true');
  const [mailProvider,           setMailProvider]           = useState(initial.mail_provider               ?? 'gmail');
  const [breadcrumbEnabled,      setBreadcrumbEnabled]      = useState(initial.breadcrumb_enabled          !== 'false');
  const [mobileNavStyle,         setMobileNavStyle]         = useState(initial.mobile_nav_style            ?? 'accordion');
  const [newLocale, setNewLocale] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  function addLocale() {
    const code = newLocale.trim().toLowerCase();
    if (!code || activeLocales.includes(code)) return;
    setActiveLocales([...activeLocales, code]);
    setNewLocale('');
  }

  function removeLocale(code) {
    if (code === defaultLocale || activeLocales.length <= 1) return;
    setActiveLocales(activeLocales.filter((l) => l !== code));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    const res = await fetch('/api/admin/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        site_name:                   siteName,
        contact_email:               contactEmail,
        default_locale:              defaultLocale,
        active_locales:              activeLocales,
        registration_enabled:        registrationEnabled,
        register_salutation_enabled: salutationEnabled,
        register_phone_enabled:      phoneEnabled,
        register_company_enabled:    companyEnabled,
        maintenance_mode:            maintenanceMode,
        mail_provider:               mailProvider,
        breadcrumb_enabled:          breadcrumbEnabled,
        mobile_nav_style:            mobileNavStyle,
      }),
    });

    const json = await res.json();
    setSaving(false);

    setToast(json.success
      ? { type: 'success', msg: 'Settings saved.' }
      : { type: 'danger',  msg: typeof json.error === 'string' ? json.error : 'Failed to save settings.' });
  }

  return (
    <form onSubmit={handleSubmit}>
      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible py-2 mb-4`}>
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)} />
        </div>
      )}

      {/* ── General ──────────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">General</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Site Name</label>
            <input type="text" className="form-control" value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
            <div className="form-text">Used in meta titles and outgoing emails.</div>
          </div>
          <div className="mb-0">
            <label className="form-label">Contact Notification Email</label>
            <input type="email" className="form-control" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="notifications@example.com" />
            <div className="form-text">Contact form submissions are sent here.</div>
          </div>
        </div>
      </div>

      {/* ── Languages ────────────────────────────────────────────────────── */}
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
                    <button type="button" className="btn-close btn-close-white ms-1" style={{ fontSize: '0.6rem' }} onClick={() => removeLocale(code)} aria-label={`Remove ${code}`} />
                  )}
                </span>
              ))}
            </div>
            <div className="input-group" style={{ maxWidth: 260 }}>
              <input type="text" className="form-control form-control-sm" placeholder="e.g. fr, de" value={newLocale} onChange={(e) => setNewLocale(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocale())} maxLength={10} />
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addLocale}>Add</button>
            </div>
            <div className="form-text">ISO 639-1 code. The default locale cannot be removed.</div>
          </div>
          <div className="mb-0">
            <label className="form-label">Default Locale</label>
            <select className="form-select" style={{ maxWidth: 200 }} value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)}>
              {activeLocales.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
            <div className="form-text">Slugs are generated from the default locale title.</div>
          </div>
        </div>
      </div>

      {/* ── Email ────────────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Email</div>
        <div className="card-body">
          <label className="form-label">Mail Provider</label>
          <div className="d-flex gap-3">
            {['gmail', 'graph'].map((p) => (
              <div key={p} className="form-check">
                <input className="form-check-input" type="radio" id={`mail-${p}`} value={p} checked={mailProvider === p} onChange={() => setMailProvider(p)} />
                <label className="form-check-label" htmlFor={`mail-${p}`}>{p === 'gmail' ? 'Gmail SMTP' : 'Microsoft Graph'}</label>
              </div>
            ))}
          </div>
          <div className="form-text">Credentials are set in <code>.env.local</code>.</div>
        </div>
      </div>

      {/* ── Access & Registration ─────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Access &amp; Registration</div>
        <div className="card-body">
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" id="reg-enabled" checked={registrationEnabled} onChange={(e) => setRegistrationEnabled(e.target.checked)} />
            <label className="form-check-label" htmlFor="reg-enabled">Public registration enabled</label>
          </div>

          {registrationEnabled && (
            <div className="ms-4 mb-3 d-flex flex-column gap-2">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="reg-salutation" checked={salutationEnabled} onChange={(e) => setSalutationEnabled(e.target.checked)} />
                <label className="form-check-label small" htmlFor="reg-salutation">Show salutation field (Mr. / Ms. / etc.)</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="reg-phone" checked={phoneEnabled} onChange={(e) => setPhoneEnabled(e.target.checked)} />
                <label className="form-check-label small" htmlFor="reg-phone">Show phone field</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="reg-company" checked={companyEnabled} onChange={(e) => setCompanyEnabled(e.target.checked)} />
                <label className="form-check-label small" htmlFor="reg-company">Show company field</label>
              </div>
            </div>
          )}

          <div className="form-check form-switch mb-0">
            <input className="form-check-input" type="checkbox" id="maintenance" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
            <label className="form-check-label" htmlFor="maintenance">
              Maintenance mode <span className="text-muted small">(shows maintenance page to public)</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Navigation</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Mobile menu style</label>
            <div className="d-flex gap-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" id="nav-accordion" value="accordion" checked={mobileNavStyle === 'accordion'} onChange={() => setMobileNavStyle('accordion')} />
                <label className="form-check-label" htmlFor="nav-accordion">Accordion <span className="text-muted small">(expands in place)</span></label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" id="nav-offcanvas" value="offcanvas" checked={mobileNavStyle === 'offcanvas'} onChange={() => setMobileNavStyle('offcanvas')} />
                <label className="form-check-label" htmlFor="nav-offcanvas">Offcanvas <span className="text-muted small">(side drawer)</span></label>
              </div>
            </div>
          </div>

          <div className="form-check form-switch mb-0">
            <input className="form-check-input" type="checkbox" id="breadcrumb" checked={breadcrumbEnabled} onChange={(e) => setBreadcrumbEnabled(e.target.checked)} />
            <label className="form-check-label" htmlFor="breadcrumb">Show breadcrumb on content pages</label>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
