'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const res  = await fetch('/api/site-auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!json.success) {
      if (typeof json.error === 'object') setErrors(json.error);
      else setErrors({ _form: json.error });
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className={styles.centeredPage}>
        <div className={`card shadow-sm ${styles.authCard}`}>
          <div className="card-body p-4 text-center">
            <i className="bi bi-envelope-check fs-1 text-success mb-3 d-block" />
            <h5 className="mb-2">Check your email</h5>
            <p className="text-muted small mb-3">
              We sent a verification link to <strong>{fields.email}</strong>. Click the link to activate your account.
            </p>
            <Link href="/auth/login" className="btn btn-outline-secondary btn-sm">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.centeredPage}>
      <div className={`card shadow-sm ${styles.authCard}`}>
        <div className="card-body p-4">
          <h5 className="card-title mb-4 fw-semibold">Create account</h5>

          {errors._form && <div className="alert alert-danger py-2 small">{errors._form}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Name <span className="text-muted small">(optional)</span></label>
              <input type="text" className="form-control" value={fields.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label">Email <span className="text-danger">*</span></label>
              <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                value={fields.email} onChange={(e) => set('email', e.target.value)} required />
              {errors.email && <div className="invalid-feedback">{errors.email[0]}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">Password <span className="text-danger">*</span></label>
              <input type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                value={fields.password} onChange={(e) => set('password', e.target.value)} required autoComplete="new-password" />
              {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
              <div className="form-text">At least 8 characters.</div>
            </div>

            <div className="mb-4">
              <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
              <input type="password" className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                value={fields.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required autoComplete="new-password" />
              {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword[0]}</div>}
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <hr className="my-3" />
          <p className="text-center text-muted small mb-0">
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
