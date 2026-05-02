# CLAUDE.md

Read this file at the start of every session. Also read `REQUIREMENTS.md` for full feature and business logic detail.

---

## Project

Full-stack CMS + public website. Single Next.js project, one port. Admin panel at `/admin`, public site everywhere else. One deployment per client on a Proxmox VM.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | JavaScript — `.jsx` and `.js` only, no TypeScript |
| Database | MySQL / MariaDB |
| ORM | Prisma |
| Auth | NextAuth.js (two separate configs — see REQUIREMENTS.md) |
| Rich Text | TipTap |
| Styling | Bootstrap 5 + custom CSS — no Tailwind, no dark mode |
| Uploads | Local disk + sharp |
| Email | Nodemailer — MS Graph or Gmail, switched via `MAIL_PROVIDER` ENV |
| Server | Node.js + Nginx reverse proxy |

---

## Project Structure

```
/
├── app/
│   ├── (site)/               # Public SSR pages
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   ├── [slug]/
│   │   └── auth/
│   ├── (admin)/              # Admin SPA, auth-gated
│   │   ├── layout.jsx
│   │   ├── dashboard/
│   │   ├── pages/
│   │   ├── [section]/        # Dynamic — one per ARTICLE_LIST page
│   │   ├── galleries/
│   │   ├── downloads/
│   │   ├── users/
│   │   ├── messages/
│   │   ├── navbar/
│   │   └── settings/
│   ├── api/
│   └── sitemap.xml/route.js
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── components/
│   ├── site/
│   ├── admin/
│   └── shared/
├── lib/
│   ├── auth.js
│   ├── prisma.js
│   ├── mail.js
│   ├── slugify.js
│   └── permissions.js
├── public/uploads/
└── .env.local
```

---

## Code Conventions

- `.jsx` for components, `.js` for everything else
- Server components by default — `"use client"` only when required
- API routes return `{ success: boolean, data, error }`
- All DB access via Prisma — no raw SQL unless unavoidable
- Permissions enforced server-side on every API route
- ENV variables validated on startup with `zod`
- Bootstrap utility classes or CSS modules — no inline styles
- PascalCase for components, camelCase for utilities

---

## Build Order

Each step depends on the previous. Do not skip ahead.

1. ✅ Prisma schema + migrations + seed script
2. ✅ NextAuth — admin credentials + public credentials (separate configs)
3. ✅ Admin layout — sidebar, topbar, auth guard
4. ✅ Settings model + active locales
5. ✅ Pages CRUD in admin
6. ✅ Public page rendering — SSR + `generateMetadata` + slug routing
7. ✅ TipTap integration
8. ✅ File upload API + sharp processing
9. ✅ Articles system + dynamic sidebar entries
10. ✅ Galleries — upload, reorder, hide, public carousel
11. ✅ Downloads — upload, link to pages/articles
12. ✅ Many-to-many connection UI
13. ✅ Multilingual fields in admin forms
14. ✅ Navbar editor
15. ✅ Public auth — register, verify, login, password reset
16. ✅ Page/article visibility restrictions
17. ✅ Contact template + messages inbox
18. ✅ Email service — MS Graph + Gmail
19. ✅ Sitemap + robots.txt
20. ✅ SEO audit + JSON-LD on article pages

---

## Key Decisions Made

- **Prisma 6** (not 7) — Prisma 7 broke datasource URL handling; pinned to `^6.0.0` (`prev` tag = 6.19.3)
- **nodemailer 7** — next-auth v4 requires it
- **ESLint 9** — Next.js 16 requires it
- **Admin URL structure** — routes live at `/admin/*`. Route groups:
  - `app/admin/layout.jsx` — wraps entire admin in SessionProvider
  - `app/admin/(protected)/layout.jsx` — auth guard + sidebar + topbar (server component)
  - `app/admin/login/page.jsx` — public, not auth-gated
- **Two NextAuth configs** — admin at `/api/auth/[...nextauth]`, public auth at `/api/site-auth/[...nextauth]` (Step 15). Custom cookie names prevent collision: `admin.session-token` vs future `site.session-token`
- **Multilingual** — no transliteration; slugs generated from default locale title only; Greek and any other locale are purely additive fields
- **Default locales** — `en` and `el` seeded by default; fully configurable via Settings

## Pending DB Setup (user handles)

When ready to run the database:
1. Copy `.env.local.example` → `.env.local` and fill in `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
2. `npx prisma migrate dev --name init`
3. `npm run db:seed`

---

## Deployment

- Per-client VM: own Node.js process, own MySQL instance
- Nginx reverse proxies to Next.js port
- `.env.local` is per-client, never in source control
- Run `prisma migrate deploy` on each deployment
- `/public/uploads/` excluded from git, backed up at VM level
