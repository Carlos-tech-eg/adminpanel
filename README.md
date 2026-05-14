# Embassy Admin Panel

Full **admin dashboard** (React + Tailwind) + **Express + MongoDB API** for the Equatorial Guinea embassy stack. Lives in `admin-panel/` next to the Next.js public site.

## What you get

- **Dashboard** — KPIs: visa applications, consular registrations, appointments, news, media, notices.
- **Visados** — Track visa requests, statuses, references (Admin/Consul edit).
- **Registros consulares** — Track consular registration pipeline.
- **Citas** — Create and manage appointments (Admin/Consul).
- **Noticias** — CRUD news cards (title, excerpt, HTML content, image URL, badge) — *wire the public Next site to this API when you are ready*.
- **Medios** — Upload images to `/media-files/...` for use in news.
- **Avisos oficiales** — Existing notice categories (Visa, Travel Advisory, etc.).
- **Auditoría** — Admin-only action log.
- **Private PDFs & messages** — Existing `/admin/documents` and `/admin/messages` routes.

UI uses the same **green / blue / red** palette as `app/globals.css` on the public site.

## Quick start

1. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set `JWT_SECRET`. For local dev without installing MongoDB, use `USE_MEMORY_MONGO=true`. For **real** passwords and data, set `MOCK_AUTH=false`, leave `SEED_DEMO_CONTENT` unset (or `false`), and use **MongoDB** + `INITIAL_ADMIN_*` or `npm run create-admin` (see below).

2. **Install API + build dashboard UI**

   ```bash
   npm install
   npm run build:ui
   ```

3. **Run API** (serves API + static dashboard from `frontend/dist`; default **port 4010** in `.env` — change if that port is busy)

   ```bash
   npm run dev
   ```

   Open **http://localhost:4010/** — login screen, then full panel (or whatever `PORT` is in `.env`).

4. **Dev mode (hot reload for React)** — two terminals:

   ```bash
   # Terminal A — API
   npm run dev

   # Terminal B — Vite (proxies `/api` to `http://127.0.0.1:${PORT}` using `PORT` from `admin-panel/.env`)
   npm run dev:ui
   ```

   Open **http://localhost:5173/**

## Real deployment (no demo passwords, no sample news/visas)

1. **MongoDB** — set `USE_MEMORY_MONGO=false` and `MONGODB_URI` to your server (local or Atlas). For **Atlas**: in **Network Access**, allow your current IP or `0.0.0.0/0` (dev only). If the DB password contains `@`, `#`, etc., **URL-encode** it in the URI (e.g. `@` → `%40`).
2. **Turn off mock auth** — `MOCK_AUTH=false` in `.env`. Logins require a **bcrypt** password stored on each user.
3. **Skip fake content** — do **not** set `SEED_DEMO_CONTENT` (or set it to `false`). Sample news, visas, registrations and appointments are only inserted when `SEED_DEMO_CONTENT=true`.
4. **First admin** — either:
   - **A.** On an **empty** user collection, set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (min 8 characters), and optional `INITIAL_ADMIN_DISPLAY_NAME`, then start the API once. Remove `INITIAL_ADMIN_PASSWORD` from `.env` after the first successful login.
   - **B.** With Mongo running:  
     `npm run create-admin -- you@embassy.gov securePass123 "Your Name" Admin`  
     Use quotes on Windows if the password or name contains spaces. Roles: `Admin`, `Consul`, `Press Attaché`.
5. **More staff** — run `create-admin` again with another email, or the same email to **rotate the password**.
6. **Optional sample rows** (news, visas, registrations, appointments) when those collections are all empty: `npm run seed:demo` (same data as `SEED_DEMO_CONTENT=true` on server boot).

**Migrating from old demo users** (no `passwordHash` in the database): either run `create-admin` for each email to set a real password, or delete those users in MongoDB and use `INITIAL_ADMIN_*` / `create-admin` again.

## Optional local demo (`MOCK_AUTH=true`)

If `MOCK_AUTH=true` and the user collection is empty, the API seeds three demo accounts:

| Email | Role |
|-------|------|
| `admin@embassy.demo` | Admin |
| `consul@embassy.demo` | Consul |
| `press@embassy.demo` | Press Attaché |

**Mock login:** any non-empty password (development only).

## Main API routes (Bearer JWT)

| Area | Path |
|------|------|
| Auth | `POST /api/auth/login` |
| Dashboard stats | `GET /api/dashboard/stats` |
| Visas | `GET/POST /api/visa-applications`, `PATCH/DELETE /api/visa-applications/:id` |
| Registrations | `GET/POST /api/consular-registrations`, `PATCH/DELETE /api/consular-registrations/:id` |
| News | `GET/POST /api/news`, `PATCH/DELETE /api/news/:id` |
| Media | `GET /api/media`, `POST /api/media/upload` (multipart `file`), `PATCH/DELETE /api/media/:id` |
| Appointments | `GET/POST /api/appointments`, `PATCH/DELETE /api/appointments/:id` |
| Notices | `GET/POST/PUT/DELETE /api/notices` … |
| Audit | `GET /api/audit-logs` (Admin) |
| Private PDFs | `POST /admin/documents/upload`, `GET /admin/documents/:fileId` |
| Messages | `GET/POST /admin/messages`, `GET /admin/messages/:id` |

Public image URLs after upload: **`http://localhost:4010/media-files/<filename>`** (match your `PORT`; use in news `imageUrl` or from the Media library).

## Project layout

```
admin-panel/
  server.js
  frontend/           # Vite + React + Tailwind dashboard
  models/
  routes/
  middleware/
  lib/
  uploads/private/    # Private PDFs
  uploads/public-media/  # Public images (served at /media-files)
```

## Troubleshooting

### `EADDRINUSE` / “Failed running server.js” (Node `--watch`)

Something is already listening on the **PORT** in `.env`. Common cause: an older **`npm run dev`** (`node --watch`) still running in another terminal.

1. Close that terminal or end the **Node** process in Task Manager, **or**
2. Pick another free port in `admin-panel/.env` (e.g. `PORT=4020`). The Vite dev server reads `PORT` from `admin-panel/.env` for the API proxy — restart **`npm run dev:ui`** after changing it.

On **Windows**, find the PID (replace with your port):

```text
netstat -ano | findstr :4010
```

Then end that PID in Task Manager or: `taskkill /PID <pid> /F`

### Login: “Invalid credentials” but the password is correct

Usually the **API process** is using a **different MongoDB** than the one where you ran `npm run create-admin` (e.g. `USE_MEMORY_MONGO=true` in that terminal, or an old server still on the port).

1. In the API terminal, check **`[mongo] backing store:`** after start — it must show **Atlas** or **from MONGODB_URI (direct)**, not **in-memory**.
2. Stop every old **`node`** for this project, then from **`admin-panel/`** run **`npm run dev`** again so it loads **`admin-panel/.env`** with **`USE_MEMORY_MONGO=false`** and your Atlas URI.
3. Run **`npm run create-admin`** again if you had been using in-memory Mongo before (that user never existed in Atlas).

### `npm fund`

After `npm install`, npm may print *“packages are looking for funding — run `npm fund`”*. That is **optional** (links to sponsor pages). It is **not** an error and you can ignore it.

## Public website (Next.js) integration

Unauthenticated routes for the embassy **public** site (e.g. `EG-TR-main`):

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/api/public/news` | Published news (`?limit=`) |
| GET | `/api/public/news/:id` | One article by Mongo `_id` |
| POST | `/api/public/contact` | Contact form → `ContactInquiry` collection |
| POST | `/api/public/registro` | Summary after web registro (creates `ConsularRegistration`) |

Staff: **GET `/api/contact-inquiries`** (JWT, Admin or Consul) lists contact form submissions.

**Env (optional):** `PUBLIC_FORM_SECRET` — if set, POST contact/registro must send header **`x-embassy-public-key`** with the same value (your Next.js server adds it server-side). `PUBLIC_ADMIN_BASE_URL` — public base URL for resolving `/media-files/...` image links in news JSON.

On the Next site set **`ADMIN_API_URL`** (and the same **`PUBLIC_FORM_SECRET`** if you use it) — see that repo’s `.env.example`.

## Next steps (public site)

- Keep **JWT** out of the browser for production staff (httpOnly cookie + same-site proxy is ideal).
