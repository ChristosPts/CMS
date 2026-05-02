'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors,          setErrors]          = useState({});
  const [submitting,      setSubmitting]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const res  = await fetch('/api/site-auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password, confirmPassword }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!json.success) {
      if (typeof json.error === 'object') setErrors(json.error);
      else setErrors({ _form: json.error });
      return;
    }

    router.push('/auth/login?reset=1');
  }

  return (
    <div className={styles.centeredPage}>
      <div className={`card shadow-sm ${styles.authCard}`}>
        <div className="card-body p-4">
          <h5 className="card-title mb-4 fw-semibold">Set new password</h5>

          {errors._form && <div className="alert alert-danger py-2 small">{errors._form}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
              {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
              <div className="form-text">At least 8 characters.</div>
            </div>

            <div className="mb-4">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword[0]}</div>}
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
