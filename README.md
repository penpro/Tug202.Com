# tug202.org — Tug Comanche Historical Rescue Foundation

Public website for the Foundation and the historic tug **Comanche** (ATA-202 / USS Wampanoag / USCGC WMEC-202).

Same shape as the other EC2 projects: Vite/React frontend served as static files by nginx, Express backend under PM2 behind `/api/`, MySQL for form submissions and news posts. Deployment is **push → pull → run scripts on the server**; nothing runs on the local Windows box except `npm run dev`.

```
frontend/   Vite + React 18 + react-router. Content lives in src/content/, facts in src/site.config.js
backend/    Express on :3202 — /api/contact, /api/volunteer, /api/partner, /api/newsletter, /api/news, /api/admin/*
db/         migrate.sh + migrations/ (rerunnable; DB + user are created by ops/bootstrap.sh)
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

- **Contact email** — currently `info@tug202.org`; needs a real mailbox or forwarder.
- **Phone** — the 1‑888 number from the 2025 press release is not published until confirmed active.
- **Mailing address for checks** — not published until the board picks one (COD still lists the Bremerton address under the old name).
- **Givebutter account ID** — `givebutter.accountId`: Settings → Developers → Widgets → "I use another platform" → the value after `?acct=` in the script line. Campaign code and widget IDs are already set. Until the account ID is in, the Support page links to the campaign page instead of embedding the form. CSP already allows `*.givebutter.com`.

Framing: Comanche is an **operational** museum ship that gets underway under her own power and cruises through nonprofit partnerships; she is never a charter/for-hire vessel. Keep that distinction in any new copy.

Content flagged `verify: true` in `frontend/src/content/index.js` (1959 Coast Guard transfer, 1980 decommissioning, builder/launch dates) is from secondary sources. It reads as "reported" on the page; reconcile against DANFS / USCG histories when convenient.

## Managing content

- **Ship's current location** — `location` in `frontend/src/site.config.js` (`status`, `updated`, optional `note`). Shows on the home hero, Visit page, footer and partner form. Edit, then `ops/remote-deploy.sh`.

- **News posts** — insert rows into `news_posts` (see `db/migrations/002_seed_news.sql` for the shape). `/api/news` serves published rows; the frontend falls back to the bundled seed list if the API is down. Ship a new migration file for anything you want reproducible.
- **Board roster, programs, volunteer roles, wishlist, timeline** — edit `frontend/src/content/index.js`, rebuild.
- **Funding proposals** — `frontend/src/content/grants.js` is the single source: the `/grants` pages render it and the build script renders one PDF per proposal into `frontend/public/grants/`. Budgets are computed from line items + PM% + contingency% and rounded up to $10k. Edit, re-run `node scripts/build-print-assets.cjs`, commit the PDFs.
- **Public documents** — `frontend/public/documents/` (bylaws PDF, donation receipt). The receipt is generated from `frontend/print/donation-receipt.html` by the same script.
- **Donation print kit** — templates in `frontend/print/` (flyer, 4×6 card, QR). Edit, then `cd frontend && node scripts/build-print-assets.cjs` (needs a local puppeteer; see the script header) and commit the regenerated files in `frontend/public/donate/`. The Support page lists whatever `donateAssets` in `site.config.js` points at.
- **Photos** — drop web-sized `.jpg` + `.webp` pairs into `frontend/public/images/` and reference by basename via `<Photo name="..."/>`. Source drone stills live in `D:\ATA202\Media\DroneVideo`.

## Reading form submissions

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.org/api/admin/volunteers
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.org/api/admin/contacts
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.org/api/admin/partners
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.org/api/admin/subscribers
```

## Board portal (`/admin`)

Session-based logins (bcrypt + MySQL sessions). Roles: **admin** (everything, incl. Users) and **editor** (inbox, contacts, news). Access is by invite link — an admin adds an email on the Users tab and gets a one-time setup link to hand over (auto-emailed once SMTP is configured). Lost password → admin clicks "reset link" on that user.

First admin, on the server:

```bash
cd ~/Tug202.Com/backend && node scripts/create-admin.js you@example.com "Your Name"
```

It prints a setup link; open it, set a password, done. The old `ADMIN_TOKEN` bearer still works for curl scripts.

## Contact list (CRM seed)

The 2026-09 scan of old sign-in sheets was transcribed to `D:\ATA202\Scans\extracted\contacts.csv` (159 people, ~550 candidate addresses incl. permutations). **That file is PII and stays out of git.** Load it on the server:

```bash
scp -i 202.pem D:/ATA202/Scans/extracted/contacts.csv ubuntu@<host>:~/contacts.csv
ssh -i 202.pem ubuntu@<host> 'cd ~/Tug202.Com/backend && node scripts/import-contacts.js ~/contacts.csv'
```

Then, with `$T` = admin token:

```bash
curl -H "Authorization: Bearer $T" "https://tug202.org/api/admin/contacts-list?status=unverified" | jq .
curl -H "Authorization: Bearer $T" "https://tug202.org/api/admin/contacts-list/export.csv?status=unverified" -o send.csv
curl -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"emails":["a@b.com","c@d.com"]}' https://tug202.org/api/admin/contacts-list/bounces
```

Workflow for the first blast: export unverified → send from the mail tool → `mark-sent` the list → paste bounce addresses into `bounces` → the next export contains only survivors. Confirmed replies get `status=confirmed`.

Notification emails go to `NOTIFY_EMAIL` once SMTP is configured in `backend/.env`; rows are saved to MySQL regardless.

## Deploying

On the server, after `git push` from here:

```bash
cd ~/Tug202.Com && ./deploy_all.sh
```

First-time setup and the DNS cutover are in [ops/README.md](ops/README.md).
