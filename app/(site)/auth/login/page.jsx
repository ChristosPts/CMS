'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router     = useRouter();
  const params     = useSearchParams();
  const verified    = params.get('verified') === '1';
  const resetDone   = params.get('reset') === '1';
  const callbackUrl = params.get('callbackUrl') ?? '/';

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('site-credentials', {
      email,
      password,
      rememberMe: String(rememberMe),
      redirect:   false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password, or email not verified.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className={styles.centeredPage}>
      <div className={`card shadow-sm ${styles.authCard}`}>
        <div className="card-body p-4">
          <h5 className="card-title mb-4 fw-semibold">Sign in</h5>

          {verified && (
            <div className="alert alert-success py-2 small">
              <i className="bi bi-check-circle me-1" />Email verified! You can now sign in.
            </div>
          )}
          {resetDone && (
            <div className="alert alert-success py-2 small">
              <i className="bi bi-check-circle me-1" />Password updated successfully. Please sign in.
            </div>
          )}
          {error && (
            <div className="alert alert-danger py-2 small">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required autoFocus autoComplete="email"
              />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label">Password</label>
                <Link href="/auth/forgot-password" className="small">Forgot password?</Link>
              </div>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
            </div>

            <div className="mb-4 form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="rememberMe">Remember me for 30 days</label>
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <hr className="my-3" />
          <p className="text-center text-muted small mb-0">
            Don&apos;t have an account? <Link href="/auth/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
