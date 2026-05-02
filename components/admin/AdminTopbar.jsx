'use client';

import { signOut } from 'next-auth/react';

export default function AdminTopbar({ username, role, unreadCount, onMenuToggle }) {
  return (
    <header className="admin-topbar">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        className="btn btn-sm btn-light d-lg-none me-1"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        <i className="bi bi-list fs-5" />
      </button>

      <div className="d-flex align-items-center ms-auto gap-3">
        {unreadCount > 0 && (
          <a href="/admin/messages" className="btn btn-sm btn-light position-relative">
            <i className="bi bi-envelope" />
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </a>
        )}

        <div className="dropdown">
          <button
            className="btn btn-sm btn-light dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-person-circle me-1" />
            {username}
            {role === 'ADMIN' && (
              <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.65rem' }}>
                Admin
              </span>
            )}
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button
                className="dropdown-item text-danger"
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
              >
                <i className="bi bi-box-arrow-right me-2" />
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
