'use client';

import { useState } from 'react';

function getLabel(field, locale, defaultLocale) {
  return field.labelJson?.[locale] || field.labelJson?.[defaultLocale] || Object.values(field.labelJson ?? {})[0] || field.type;
}

function renderField(field, value, onChange, error, locale, defaultLocale) {
  const label    = getLabel(field, locale, defaultLocale);
  const colClass = field.width === 'half' ? 'col-12 col-sm-6' : 'col-12';
  const key      = `field-${field.id ?? field.sortOrder}`;

  const baseProps = {
    id:       key,
    required: field.required,
    value:    value ?? '',
  };

  if (field.type === 'CHECKBOX') {
    return (
      <div key={key} className="col-12">
        <div className="form-check">
          <input
            type="checkbox"
            className={`form-check-input${error ? ' is-invalid' : ''}`}
            id={key}
            required={field.required}
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="form-check-label" htmlFor={key}>
            {label}{field.required && <span className="text-danger ms-1">*</span>}
          </label>
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      </div>
    );
  }

  let input;
  switch (field.type) {
    case 'TEXTAREA':
      input = (
        <textarea
          {...baseProps}
          className={`form-control${error ? ' is-invalid' : ''}`}
          rows={5}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'EMAIL':
      input = (
        <input
          type="email"
          {...baseProps}
          className={`form-control${error ? ' is-invalid' : ''}`}
          autoComplete="email"
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'PHONE':
      input = (
        <input
          type="tel"
          {...baseProps}
          className={`form-control${error ? ' is-invalid' : ''}`}
          autoComplete="tel"
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'SELECT':
      input = (
        <select
          {...baseProps}
          className={`form-select${error ? ' is-invalid' : ''}`}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Select —</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    default:
      input = (
        <input
          type="text"
          {...baseProps}
          className={`form-control${error ? ' is-invalid' : ''}`}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div key={key} className={colClass}>
      <label className="form-label" htmlFor={key}>
        {label}{field.required && <span className="text-danger ms-1">*</span>}
      </label>
      {input}
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}

// Default fields used when no custom fields are configured
const DEFAULT_FIELDS = [
  { id: 'd1', type: 'TEXT',     labelJson: { en: 'Name',    el: 'Όνομα'   }, required: true, sortOrder: 0, width: 'half', options: null },
  { id: 'd2', type: 'EMAIL',    labelJson: { en: 'Email',   el: 'Email'   }, required: true, sortOrder: 1, width: 'half', options: null },
  { id: 'd3', type: 'TEXT',     labelJson: { en: 'Subject', el: 'Θέμα'    }, required: true, sortOrder: 2, width: 'full', options: null },
  { id: 'd4', type: 'TEXTAREA', labelJson: { en: 'Message', el: 'Μήνυμα' }, required: true, sortOrder: 3, width: 'full', options: null },
];

export default function ContactForm({ pageId, formFields = [], locale = 'en', defaultLocale = 'en' }) {
  const fields = formFields.length > 0 ? formFields : DEFAULT_FIELDS;

  const initialValues = {};
  fields.forEach((f) => {
    initialValues[String(f.id ?? f.sortOrder)] = f.type === 'CHECKBOX' ? false : '';
  });

  const [values,      setValues]      = useState(initialValues);
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [serverError, setServerError] = useState('');
  const [trap,        setTrap]        = useState('');

  function setValue(fieldKey, val) {
    setValues((prev) => ({ ...prev, [fieldKey]: val }));
    setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setServerError('');

    const res  = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pageId: pageId ?? null, fields: values, trap }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!json.success) {
      if (typeof json.error === 'object') setErrors(json.error);
      else setServerError(json.error ?? 'An error occurred. Please try again.');
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="alert alert-success d-flex align-items-center gap-2 mt-2">
        <i className="bi bi-check-circle-fill fs-5" />
        <div>
          <strong>Message sent!</strong> Thank you for reaching out. We&apos;ll be in touch shortly.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && <div className="alert alert-danger py-2 small mb-3">{serverError}</div>}

      {/* Honeypot — hidden from real users, filled by bots */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
        <label htmlFor="_hp_website">Website</label>
        <input
          id="_hp_website"
          type="text"
          name="_hp_website"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <div className="row g-3">
        {fields.map((field) => {
          const fkey = String(field.id ?? field.sortOrder);
          return renderField(field, values[fkey], (val) => setValue(fkey, val), errors[fkey], locale, defaultLocale);
        })}

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" />Sending…</>
            ) : (
              'Send Message'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
