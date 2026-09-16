# EC2 setup and domain cutover

Assumes Ubuntu 22.04/24.04, same box or same recipe as the WebDevClass server (nginx + PM2 + MySQL already present). Skip the install steps that already apply.

## 1. One-time server setup

Instance: Ubuntu 26.04, 1 GB RAM, security group open on 22 (your IP), 80 and 443 (anywhere). The PEM key lives at `D:\ATA202Website.pem` (outside the repo, never committed).

One command does everything (swap, nginx, MySQL, Node 22, pm2, clone, DB + generated secrets, migrations, nginx config, first deploy):

```bash
ssh -i 202.pem ubuntu@<host> 'curl -fsSL https://raw.githubusercontent.com/penpro/Tug202.Com/main/ops/bootstrap.sh | bash'
```

What it leaves behind: repo at `~/Tug202.Com`, `backend/.env` with a random DB password + `ADMIN_TOKEN` (printed at the end — save it), PM2 process `tug202-backend`, static site in `/var/www/tug202`, nginx serving on port 80 for `tug202.com` / `www.tug202.com`.

Sanity check before DNS: `curl -H "Host: tug202.com" http://<EC2-IP>/api/health` → `{"ok":true,"db":true}`.

## 2. DNS + TLS

1. At the registrar, add/replace:
   - `A     @    <EC2 elastic IP>`
   - `A     www  <EC2 elastic IP>`
   Use an **Elastic IP** so the record never has to change. Lower the TTL to 300 a day ahead if the old host allows it.
2. Once `dig +short tug202.com` returns the EC2 IP:
   ```bash
   ssh -i 202.pem ubuntu@<host> 'CERT_EMAIL=you@example.com ~/Tug202.Com/ops/enable-https.sh'
   ```
   It refuses to run until DNS actually points at the box, then issues the cert, adds the HTTP→HTTPS redirect, and dry-runs renewal.

## 3. Email

Two separate things:

- **Inbound `info@tug202.com`** — set up at the DNS provider (Cloudflare Email Routing, ImprovMX, or Google Workspace). Not handled by this server.
- **Outbound notifications** — fill `SMTP_*` and `NOTIFY_EMAIL` in `backend/.env`, then `pm2 restart tug202-backend --update-env`. Amazon SES in the same region is the cheap option; a Gmail app password works for low volume.

Until SMTP is set, form submissions still land in MySQL and are visible via the `/api/admin/*` endpoints.

## 4. Routine deploy

From the local checkout — pushes, then runs the server-side deploy over SSH:

```bash
ops/remote-deploy.sh
```

Or by hand on the server: `cd ~/Tug202.Com && ./deploy_all.sh`.

Pulls, applies any new `db/migrations/*.sql`, `npm install` + PM2 restart for the backend, `npm ci` + `vite build` + rsync for the frontend.

## 5. Backups

Nightly dump of the three form tables + news is enough:

```bash
sudo mysqldump tug202 | gzip > ~/backups/tug202-$(date +%F).sql.gz
```

Put that in a cron with `find ~/backups -mtime +30 -delete`.

## 6. Useful checks

```bash
pm2 logs tug202-backend --lines 100
sudo tail -f /var/log/nginx/error.log
curl -sI https://tug202.com | grep -iE 'strict|x-frame|content-security'
```
