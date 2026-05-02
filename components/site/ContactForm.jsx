'use client';

import { useState } from 'react';

export default function ContactForm({ pageId }) {
  const [fields, setFields] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setServerError('');

    const res  = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...fields, pageId: pageId ?? null }),
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
      <div className="alert alert-success d-flex align-items-center gap-2 mt-4">
        <i className="bi bi-check-circle-fill fs-5" />
        <div>
          <strong>Message sent!</strong> Thank you for reaching out. We&apos;ll be in touch shortly.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4" noValidate>
      {serverError && <div className="alert alert-danger py-2 small">{serverError}</div>}

      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label className="form-label">Name <span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={fields.name}
            onChange={(e) => set('name', e.target.value)}
            required
            autoComplete="name"
          />
          {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
        </div>

        <div className="col-12 col-sm-6">
          <label className="form-label">Email <span className="text-danger">*</span></label>
          <input
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
            required
            autoComplete="email"
          />
          {errors.email && <div className="invalid-feedback">{errors.email[0]}</div>}
        </div>

        <div className="col-12">
          <label className="form-label">Subject <span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
            value={fields.subject}
            onChange={(e) => set('subject', e.target.value)}
            required
          />
          {errors.subject && <div className="invalid-feedback">{errors.subject[0]}</div>}
        </div>

        <div className="col-12">
          <label className="form-label">Message <span className="text-danger">*</span></label>
          <textarea
            className={`form-control ${errors.message ? 'is-invalid' : ''}`}
            rows={6}
            value={fields.message}
            onChange={(e) => set('message', e.target.value)}
            required
          />
          {errors.message && <div className="invalid-feedback">{errors.message[0]}</div>}
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" />Sending…</>
            ) : (
              <>Send Message</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
