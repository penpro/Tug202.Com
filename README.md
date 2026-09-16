# tug202.com — Tug Comanche Historical Rescue Foundation

Public website for the Foundation and the historic tug **Comanche** (ATA-202 / USS Wampanoag / USCGC WMEC-202).

Same shape as the other EC2 projects: Vite/React frontend served as static files by nginx, Express backend under PM2 behind `/api/`, MySQL for form submissions and news posts. Deployment is **push → pull → run scripts on the server**; nothing runs on the local Windows box except `npm run dev`.

```
frontend/   Vite + React 18 + react-router. Content lives in src/content/, facts in src/site.config.js
backend/    Express on :3202 — /api/contact, /api/volunteer, /api/partner, /api/newsletter, /api/news, /api/admin/*
db/         init.sql (one-time), migrate.sh + migrations/ (rerunnable)
nginx/      site config + security-headers snippet
ops/        EC2 setup + domain cutover runbook
deploy_*.sh Run on the server after git pull (all / nginx / backend / frontend)
```

## Local development

```bash
cd backend && npm install && cp .env.example .env   # DB values can stay bogus; forms will 500 until MySQL exists
node server.js                                       # :3202
cd ../frontend && npm install && npm run dev         # :5173, proxies /api -> :3202
```

`npm run build` in `frontend/` produces `dist/`, which is what `deploy_frontend.sh` rsyncs to `/var/www/tug202`.

## Before the domain cutover

Search `frontend/src/site.config.js` for `TODO`:

- **Contact email** — currently `info@tug202.com`; needs a real mailbox or forwarder.
- **Phone** — the 1‑888 number from the 2025 press release is not published until confirmed active.
- **Facebook URL** — confirm the page slug.
- **Mailing address for checks** — not published until the board picks one (COD still lists the Bremerton address under the old name).
- **Givebutter** — `givebutter.accountId` (Settings → Developers → Widgets) and `givebutter.campaign` (the slug in `givebutter.com/<campaign>`). Until both are set, the Support page shows check + "contact us" only. CSP already allows `*.givebutter.com`.

Framing: Comanche is an **operational** museum ship that gets underway under her own power and cruises through nonprofit partnerships; she is never a charter/for-hire vessel. Keep that distinction in any new copy.

Content flagged `verify: true` in `frontend/src/content/index.js` (1959 Coast Guard transfer, 1980 decommissioning, builder/launch dates) is from secondary sources. It reads as "reported" on the page; reconcile against DANFS / USCG histories when convenient.

## Managing content

- **News posts** — insert rows into `news_posts` (see `db/migrations/002_seed_news.sql` for the shape). `/api/news` serves published rows; the frontend falls back to the bundled seed list if the API is down. Ship a new migration file for anything you want reproducible.
- **Board roster, programs, volunteer roles, wishlist, timeline** — edit `frontend/src/content/index.js`, rebuild.
- **Photos** — drop web-sized `.jpg` + `.webp` pairs into `frontend/public/images/` and reference by basename via `<Photo name="..."/>`. Source drone stills live in `D:\ATA202\Media\DroneVideo`.

## Reading form submissions

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.com/api/admin/volunteers
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.com/api/admin/contacts
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.com/api/admin/partners
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.com/api/admin/subscribers
```

Notification emails go to `NOTIFY_EMAIL` once SMTP is configured in `backend/.env`; rows are saved to MySQL regardless.

## Deploying

On the server, after `git push` from here:

```bash
cd ~/Tug202.Com && ./deploy_all.sh
```

First-time setup and the DNS cutover are in [ops/README.md](ops/README.md).
