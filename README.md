# CMS

A full-stack Content Management System + public website platform built with Next.js. Each client receives a standalone deployment on their own VM with their own database — no multi-tenancy, no shared infrastructure.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, JSX only — no TypeScript) |
| Database | MySQL / MariaDB |
| ORM | Prisma 6 |
| Auth | NextAuth.js v4 (two independent configs) |
| Rich Text | TipTap |
| Styling | Bootstrap 5 + custom CSS |
| Uploads | Local disk + sharp (WebP conversion + thumbnails) |
| Email | Nodemailer — Gmail SMTP or Microsoft Graph API |
| Server | Node.js behind Nginx reverse proxy |

---

## Prerequisites

- Node.js 18+
- MySQL 8 or MariaDB 10.6+
- An empty database already created

---

## Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd cms
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Seed the database (creates admin user + default settings)
npm run db:seed

# 5. Start dev server
npm run dev
```

The app runs at `http://localhost:3000`.

- Admin panel: `http://localhost:3000/admin`
- Default credentials: **username** `admin` / **password** `admin`
- Change the admin password immediately after first login.

---

## Environment Variables

Create `.env.local` in the project root. Never commit this file.

```env
# ── Database ─────────────────────────────────────────────────────────────
DATABASE_URL="mysql://user:password@localhost:3306/dbname"

# ── NextAuth ──────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# ── Email — choose one provider ───────────────────────────────────────────
MAIL_PROVIDER="gmail"          # "gmail" or "graph"

# Gmail SMTP
GMAIL_USER="you@gmail.com"
GMAIL_PASS="your-app-password"

# Microsoft Graph (Application permissions / client credentials)
GRAPH_TENANT_ID="..."
GRAPH_CLIENT_ID="..."
GRAPH_CLIENT_SECRET="..."
GRAPH_FROM_EMAIL="you@yourdomain.com"
```

> The `MAIL_PROVIDER` env is the default fallback. The active provider can also be set per-deployment from the **Settings** panel inside the admin.

---

## Production Deployment

```bash
# Build
npm run build

# Start (keep alive with PM2 or systemd)
npm start
# or
pm2 start npm --name "cms" -- start

# On each new deployment, run migrations (never migrate:dev in production)
npx prisma migrate deploy
```

**Nginx config** (reverse proxy to Next.js, adjust port if needed):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /path/to/cms/public/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

> Add SSL via Certbot. The `/public/uploads/` directory is **not** in source control — back it up at the VM level.

---

## Project Structure

```
/
├── app/
│   ├── (site)/                  # Public-facing SSR pages
│   │   ├── layout.jsx           # Navbar + footer wrapper
│   │   ├── page.jsx             # Home page (manual per client)
│   │   ├── [slug]/              # Dynamic page renderer by slug
│   │   │   └── [articleSlug]/   # Article detail pages
│   │   └── auth/                # Register, login, verify, reset
│   ├── admin/
│   │   ├── login/               # Public login (not auth-gated)
│   │   └── (protected)/         # Auth-gated admin routes
│   │       ├── layout.jsx       # Sidebar + topbar shell
│   │       ├── dashboard/
│   │       ├── pages/           # All pages CRUD
│   │       ├── contact/[id]/    # Contact page editor (shortcut)
│   │       ├── [section]/       # Dynamic — one per ARTICLE_LIST page
│   │       ├── galleries/
│   │       ├── downloads/
│   │       ├── users/
│   │       ├── messages/        # Contact form inbox
│   │       ├── navbar/          # Navbar + logo editor
│   │       ├── footer/          # Footer editor
│   │       └── settings/        # Site-wide settings
│   ├── api/
│   │   ├── auth/                # Admin NextAuth
│   │   ├── site-auth/           # Public NextAuth
│   │   ├── admin/               # Protected admin API routes
│   │   │   ├── pages/
│   │   │   ├── articles/
│   │   │   ├── galleries/
│   │   │   ├── downloads/
│   │   │   ├── upload/
│   │   │   ├── messages/
│   │   │   ├── users/
│   │   │   ├── navbar/
│   │   │   ├── footer/
│   │   │   └── settings/
│   │   └── contact/             # Public contact form endpoint
│   └── sitemap.xml/
├── components/
│   ├── admin/                   # Admin UI components
│   └── site/
│       └── templates/           # Public page templates (BASIC, GRID, etc.)
├── lib/
│   ├── auth.js                  # NextAuth configs (admin + site)
│   ├── prisma.js                # Prisma client singleton
│   ├── mail.js                  # sendMail() abstraction (Gmail / Graph)
│   ├── settings.js              # getLocaleConfig(), getDefaultLocale()
│   ├── slugify.js               # slugify(), articleSlug()
│   ├── siteAuth.js              # getSiteSession(), checkVisibility()
│   └── apiAuth.js               # requireAdminSession(), requireAdminRole()
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── styles/
│   ├── admin.css
│   └── site.css
└── public/
    └── uploads/                 # All uploaded files (not in git)
```

---

## Admin Panel

Access at `/admin`. Login with admin credentials (no self-registration for admins).

### Roles

| Role | Capabilities |
|---|---|
| **ADMIN** | Full access. Can delete, change slugs, access Settings/Navbar/Footer/Users. |
| **MODERATOR** | Can create and edit all content. Cannot delete (only hide). Cannot access Settings, Navbar, Footer. |

### Sidebar Structure

| Group | Items |
|---|---|
| — | Dashboard |
| Content | Pages, + one entry per published ARTICLE_LIST page |
| Media | Galleries, Downloads |
| Communication | Contact page(s), Messages |
| Admin *(ADMIN only)* | Users, Navbar, Footer, Settings |

### Page Templates

| Template | Purpose |
|---|---|
| **BASIC** | Standard content page — rich text, featured image, galleries, downloads, featured articles |
| **GRID** | Grid of items (team, partners, members) — each item has name, subtitle, image, description |
| **ARTICLE_LIST** | Paginated, searchable list of articles. Generates its own admin sidebar entry. |
| **ARTICLE_SINGLE** | Individual article entry (news, events, blog posts) |
| **CONTACT** | Contact form page — configurable form fields, Google Maps embed, contact info |
| **HOME** | Reserved. Not rendered by the template engine. Admin can edit SEO metadata only. |

### Contact Form Builder

On any CONTACT template page, you can add, remove, and reorder form fields. Supported field types:

- Text, Email, Phone, Textarea, Dropdown (with custom options), Checkbox

All labels are translatable per active locale. Each field can be marked required and set to full or half width.

### Multilingual Content

All content fields (title, summary, body, meta) have one set of inputs per active locale. Locales are configured in Settings. The default locale drives slug generation; other locales are additive and fall back to default if untranslated.

### File Uploads

- Images are auto-processed: resized to max 1920px, converted to WebP, thumbnail generated at 400px.
- Documents (PDF, DOC, DOCX) are stored as-is.
- All files land in `public/uploads/`. Thumbnails are in `public/uploads/thumbnails/`.

---

## Public Site

All public pages are server-rendered (SSR) for SEO.

### Routing

| Path | Renders |
|---|---|
| `/` | Home page (`app/(site)/page.jsx` — customised per client) |
| `/{slug}` | Page by slug — template is determined automatically |
| `/{parent-slug}/{id}-{article-slug}` | Article detail page |
| `/auth/login` | Public user login |
| `/auth/register` | Public user registration (if enabled in Settings) |
| `/auth/forgot-password` | Password reset request |
| `/auth/reset-password` | Password reset form (from email link) |
| `/sitemap.xml` | Auto-generated sitemap of all published pages + articles |
| `/robots.txt` | Disallows `/admin` |

### Visibility

Pages and articles can be set to:

- **PUBLIC** — visible to everyone
- **AUTHENTICATED_ONLY** — requires a logged-in public user
- **ROLE_RESTRICTED** — requires a public user with a specific role string

Restrictions are enforced server-side; restricted content is never sent to unauthorised clients.

### Public Authentication

Public users register with email + password. Email verification is required before login. Supports "Remember me" and password reset via email. The admin can enable/disable registration and toggle optional registration fields (salutation, phone, company) from Settings.

---

## Settings Reference

Managed at `/admin/settings`.

| Key | Type | Description |
|---|---|---|
| `site_name` | string | Used in page titles, emails, and the admin sidebar |
| `logo` | string | Filename of uploaded logo — used in navbar, footer, admin sidebar |
| `active_locales` | JSON array | e.g. `["en","el"]` |
| `default_locale` | string | e.g. `"en"` |
| `contact_email` | string | Notification recipient for contact form submissions |
| `registration_enabled` | boolean | Toggle public registration on/off |
| `register_salutation_enabled` | boolean | Show salutation field on register form |
| `register_phone_enabled` | boolean | Show phone field on register form |
| `register_company_enabled` | boolean | Show company field on register form |
| `maintenance_mode` | boolean | Shows maintenance page to all public visitors |
| `mail_provider` | `gmail` \| `graph` | Active email provider |
| `footer_description` | JSON | Per-locale description shown in footer left column |
| `footer_copyright` | string | Copyright line in footer bottom bar |
| `footer_privacy_url` | string | URL for Privacy Policy link |
| `footer_terms_url` | string | URL for Terms of Service link |
| `footer_email` | string | Display email in footer right column |
| `footer_phone` | string | Display phone in footer right column |
| `footer_address` | string | Display address in footer right column |

---

## Email Service

Two providers supported, selected via `MAIL_PROVIDER`:

**Gmail SMTP** — use a Google App Password (not your account password). Requires 2FA enabled on the Google account.

**Microsoft Graph** — uses Application permissions (client credentials flow, not delegated). Requires an Azure App Registration with `Mail.Send` permission granted by a tenant admin.

Both are functionally equivalent from the application's perspective. All sends go through `lib/mail.js` → `sendMail()`.

---

## Spam Protection

Contact forms and the registration form include a **honeypot field** — a hidden input invisible to real users that bots fill in automatically. Any submission with the honeypot populated is silently discarded.

---

## Key Package Versions (pinned)

| Package | Version | Reason |
|---|---|---|
| `prisma` | `^6.0.0` | Prisma 7 broke datasource URL handling |
| `nodemailer` | `^7` | Required by next-auth v4 |
| `eslint` | `^9` | Required by Next.js 16 |
