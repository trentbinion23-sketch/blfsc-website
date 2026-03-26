# blfsc-website

A Node.js/Express website for BLFSC with a secure admin panel featuring role-based access control.

## Features

- **Admin Authentication** — Secure login with bcrypt password hashing, session fixation prevention, and rate limiting (5 attempts / 15 min per IP)
- **Role-Based Access Control** — Three roles: `admin`, `editor`, `member`
  - `admin` — Full access: user management, audit log, dashboard
  - `editor` — Dashboard access
  - `member` — Dashboard access
- **User Management** — Admins can create, edit, activate/deactivate, and delete users
- **Audit Log** — Every login attempt, user change, and logout is recorded with timestamp and IP
- **Change Password** — All users can change their own password
- **Public Website** — Home, About, and Contact pages

## Getting Started

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`.

**Default admin credentials:**
- Username: `admin`
- Password: `Admin@1234!`

> Change the default password immediately after first login.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `SESSION_SECRET` | dev secret | Session signing secret — **must be changed in production** |
| `NODE_ENV` | — | Set to `production` to enable secure cookies |

## Project Structure

```
src/
  server.js           — Express app entry point
  db/database.js      — SQLite setup and seeding
  middleware/
    auth.js           — requireLogin, requireRole, alreadyLoggedIn
    audit.js          — Audit logging helpers
  routes/
    auth.js           — /admin/login, /admin/logout
    admin.js          — /admin/dashboard, /admin/users, /admin/audit-log
    public.js         — /, /about, /contact
  views/
    layouts/          — Handlebars layout templates
    admin/            — Admin panel views
    public/           — Public website views
public/
  css/admin.css       — Admin panel stylesheet
  css/public.css      — Public site stylesheet
```
