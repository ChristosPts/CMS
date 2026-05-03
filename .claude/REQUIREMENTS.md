# REQUIREMENTS.md — CMS Project

Full requirements specification for the CMS and public-facing website platform.

---

## 1. Project Goals

Build a reusable, client-deployable CMS and public website platform. Each client receives a fresh deployment on their own VM. The platform must be flexible enough to serve organisations with differing content structures (news sites, member organisations, event-driven sites, etc.) without requiring code changes between clients.

---

## 2. System Architecture

- Single Next.js project (JSX/JS, no TypeScript) serves both the public website and the admin panel
- Admin panel lives at `/admin` — completely isolated from public routing
- Public site is fully server-rendered for SEO
- MySQL database per client deployment
- File storage is local disk per VM
- Email is configurable per client via ENV

---

## 3. User Roles

### 3.1 Admin Panel Roles

**ADMIN**
- Full access to all CMS features
- Can create, edit, publish, hide, and permanently delete any content
- Can create accounts of any role (ADMIN, MODERATOR, USER)
- Only role that can override URL slugs on pages
- Only role that can access Settings and Navbar editor

**MODERATOR**
- Can create and edit all content
- Cannot permanently delete — can only hide/unpublish items
- Can create MODERATOR and USER accounts
- Cannot access Settings or Navbar editor
- Cannot change URL slugs

### 3.2 Public Site Roles

**USER (Public)**
- Registered via email + password on the public site
- Access to pages/articles that require authentication
- May be assigned custom roles depending on client configuration

**Guest**
- Unauthenticated visitors
- Can only access PUBLIC content

---

## 4. Admin Panel

### 4.1 Authentication
- Credentials-only login (username + password)
- No email integration for admin accounts
- No self-registration — accounts created by ADMIN or MODERATOR within CMS
- Initial ADMIN account seeded via database seed script
- Session-based authentication via NextAuth.js

### 4.2 Layout
- Persistent left sidebar
- Topbar with current user info and logout
- Sidebar sections:
  - **Dashboard** (static)
  - **Content** (dynamic — one entry per ARTICLE_LIST and GRID page)
  - **Galleries** (static)
  - **Downloads** (static)
  - **Pages** (static — manages all page types)
  - **Users** (static)
  - **Messages** (static)
  - **Navbar** (static — ADMIN only)
  - **Settings** (static — ADMIN only)

### 4.3 Content Tables (all list views)
Every content list view must include:
- Sortable columns
- Search/filter input
- Pagination
- Status indicator (PUBLISHED / DRAFT / HIDDEN)
- Action buttons: Edit, View (opens public URL), Hide/Show, Delete (ADMIN only)
- "New" button to create a new item

### 4.4 Rich Text Editor
- TipTap implementation
- Required extensions: Bold, Italic, Underline, Strike, Headings (H1–H4), Bullet list, Ordered list, Blockquote, Link, Image (upload from editor), Table (with add/remove row/col), Text colour, Font size, Text align, Horizontal rule, Undo/Redo, Full screen mode
- Image uploads from within the editor go through the standard upload API
- Output stored as HTML in the database

### 4.5 File Uploads (Admin)
- Drag and drop + click-to-browse
- Image uploads: jpg, jpeg, png, gif, webp — max 10MB
- Document uploads: pdf, doc, docx — max 25MB
- Images automatically processed: resized to max 1920px, converted to WebP, thumbnail generated at 400px
- Gallery upload: multi-file selection in one operation

---

## 5. Pages System

### 5.1 Page Model
Each page has:
- Template type (see Section 6)
- URL slug (auto-generated from title, ADMIN-only editable)
- Status: PUBLISHED / DRAFT / HIDDEN
- Sort order (for navbar and sidebar ordering)
- Parent page (optional — for nested navigation)
- Per-locale translations: title, summary, rich text content, meta title, meta description
- Featured image
- Visibility setting: PUBLIC / AUTHENTICATED_ONLY / ROLE_RESTRICTED
- Connected relationships depending on template (galleries, articles, downloads)

### 5.2 Slug Rules
- Pages: auto-generated from default locale title on creation
- Pages: only ADMIN can manually override
- Duplicate slugs: append `-2`, `-3` etc.
- Articles/news/events: format is `{id}-{slugified-title}` — not user-editable
- Slugify function handles: lowercasing, space-to-hyphen, special character stripping, Greek-to-Latin transliteration

---

## 6. Page Templates

### BASIC
Fields: title, summary (plain text), rich text body, featured image, slider (connected gallery shown as carousel), downloadable files, connected articles list.

### GRID
Fields: title, summary, rich text intro. Items in the grid each have: name, role/subtitle, image, description. Used for members, team, partners.

### ARTICLE_LIST
Fields: title, summary, intro text. Displays a paginated and searchable grid of articles linked to this page. Has search, filters (by date, category if applicable), and pagination. Generates its own entry in the admin sidebar.

### ARTICLE_SINGLE
Fields: Same as BASIC but without the ability to connect other articles. Used for individual news/event/article entries.

### CONTACT
Fields: page title, intro text. Renders a contact form on the public site with: name, email, subject, message. On submit: stores message in DB, sends notification email to configured recipient.

### HOME
Reserved template. Not rendered via the standard template engine. Implemented manually per client. Admin can still edit the page metadata and SEO fields.

---

## 7. Articles System

- "Articles" is a generic term — the same structure powers news, events, press releases, blog posts, etc.
- Each article belongs to a parent ARTICLE_LIST page (e.g. a "News" page or "Events" page)
- This parent association determines which sidebar entry the article appears under in the admin
- Articles have: title, summary, rich text body, featured image, publish date, status, author, connected galleries, connected downloads
- All fields are translatable
- Public URL format: `/{parent-page-slug}/{article-id}-{article-slug}`

---

## 8. Galleries

### Admin
- Create a gallery with a title
- Multi-file upload in one operation
- Reorder images via drag and drop
- Per-image: set alt text, hide/show, delete
- Gallery can be connected to pages or articles (many-to-many)

### Public Site
- Gallery connected to a page appears as a thumbnail of the first image
- Clicking opens a full carousel/lightbox
- Can also render as a full grid with carousel on image click

---

## 9. Downloads

- Upload PDFs or Word documents
- Each download item has: title (translatable), file, optional description
- Downloads can be connected to pages or articles (many-to-many)
- Shown as a list of downloadable links on the public page

---

## 10. Many-to-Many Relationships

All join tables include a `sortOrder` column to allow manual ordering of connected items.

| From | To | Notes |
|---|---|---|
| Page | Gallery | Pages can display one or more galleries |
| Page | Article | BASIC pages can feature selected articles |
| Page | Download | Pages can list downloadable files |
| Article | Gallery | Articles can include galleries |
| Article | Download | Articles can list downloadable files |

Connection UI in the admin editor: searchable modal or inline selector to add/remove/reorder connected items.

---

## 11. Multilingual Support

- Supported locales are configured in Settings — toggled on/off per deployment
- Default languages targeted: English (`en`) and Greek (`el`)
- System is extensible — any locale code can be added
- When a locale is enabled, all admin content forms display a duplicate set of fields for that locale
- URL structure: default locale has no prefix (`/about`), secondary locales are prefixed (`/el/about`)
- If a translation does not exist for a locale, fall back to the default locale content
- Locale switcher shown on public site when more than one locale is active

---

## 12. Navbar Editor

- Manage the public site's navigation menu
- Items have: label (per locale), URL or linked page, parent item (for dropdowns), sort order, open in new tab toggle
- Supports one level of nesting (dropdown menus)
- ADMIN only
- Changes take effect immediately on the public site

---

## 13. Public Site Authentication

### Registration
- Email + password
- Email verification required before login is permitted
- Verification link sent via email service

### Login
- Email + password
- "Remember me" option

### Password Reset
- Request reset via email
- Time-limited reset link sent to registered email

### Access Control
- Pages and articles can be set to:
  - **PUBLIC** — visible to everyone
  - **AUTHENTICATED_ONLY** — visible only to logged-in public users
  - **ROLE_RESTRICTED** — visible only to public users with a specific role
- Restrictions enforced server-side — restricted content never sent to unauthorised clients
- Unauthenticated users attempting to access restricted pages are redirected to login

---

## 14. Contact Form & Messages

### Public Site
- CONTACT template pages render a form: name, email, subject, message
- On submit:
  1. Submission stored in the `Message` DB table with timestamp and source page
  2. Notification email sent to the address configured in Settings (`contact_email`)
  3. User sees a success confirmation

### Admin Panel — Messages Inbox
- Table view of all contact form submissions
- Columns: date, name, email, subject, source page, read/unread status
- Mark as read, delete (ADMIN only)
- Unread count shown as badge in sidebar

---

## 15. Email Service

### Providers
- **Microsoft Graph API** — Application permissions (client credentials flow, not Delegated)
- **Gmail SMTP** — standard app password setup

Both are fully supported. Selected per client deployment via `MAIL_PROVIDER=ms` or `MAIL_PROVIDER=google` in the ENV. No hierarchy between them — equal choices.

### Triggered By
- Public user email verification
- Public user password reset
- Contact form submission (notification to client)

### Requirements
- Provider abstracted in `lib/mail.ts` — rest of codebase calls a single `sendMail()` function
- Failed sends must not break the user-facing operation (e.g. contact form still saves to DB)
- Send failures logged server-side

---

## 16. SEO Requirements

- All public pages rendered server-side (SSR or SSG via Next.js)
- Per-page meta: `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `<link rel="canonical">`
- Auto-generated `/sitemap.xml` listing all PUBLISHED pages and articles with `lastmod`
- `/robots.txt` disallowing `/admin`
- `next/image` used for all public images (WebP, lazy load, size optimisation)
- JSON-LD Article structured data on all ARTICLE_SINGLE pages
- No JavaScript required for initial page render of any public content

---

## 17. Settings Panel (ADMIN only)

Configurable per deployment:

| Setting Key | Type | Description |
|---|---|---|
| `site_name` | string | Used in meta titles and emails |
| `active_locales` | JSON array | e.g. `["en", "el"]` |
| `default_locale` | string | e.g. `"en"` |
| `contact_email` | string | Where contact form notifications are sent |
| `mail_provider` | string | `"graph"` or `"gmail"` |
| `registration_enabled` | boolean | Toggle public registration on/off |
| `maintenance_mode` | boolean | Show maintenance page to public |

---

## 18. Non-Requirements (Out of Scope)

- No dark mode
- No email for admin panel account management
- No social login (Google, Facebook etc.)
- No e-commerce
- No page builder drag-and-drop (templates are code-defined)
- No multi-tenant SaaS (each client is a separate deployment)
- Home page and footer are handled manually per client — not template-driven
- No automated backups in-app (handled at VM/infrastructure level)
