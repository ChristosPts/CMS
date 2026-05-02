'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email,       setEmail]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res  = await fetch('/api/site-auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!json.success) { setError(json.error); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className={styles.centeredPage}>
        <div className={`card shadow-sm ${styles.authCard}`}>
          <div className="card-body p-4 text-center">
            <i className="bi bi-envelope-check fs-1 text-primary mb-3 d-block" />
            <h5 className="mb-2">Check your email</h5>
            <p className="text-muted small mb-3">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
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
          <h5 className="card-title mb-1 fw-semibold">Reset password</h5>
          <p className="text-muted small mb-4">Enter your email and we&apos;ll send a reset link.</p>

          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">Email</label>
              <input
                type="email" className="form-control"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus autoComplete="email"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <hr className="my-3" />
          <p className="text-center text-muted small mb-0">
            <Link href="/auth/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
