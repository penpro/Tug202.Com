# Email for tug202.org — Amazon SES setup

Outbound mail (portal invites, password resets, form notifications) is sent through **Amazon SES** from `@tug202.org`, authenticated with DKIM/SPF/DMARC. The EC2 box authenticates to SES with an **IAM instance role**, so there are no mail credentials on the server.

Everything below is in the AWS console, region **US East (N. Virginia) us-east-1** — same region as the instance. Check the region selector top-right before starting.

## 1. Verify the domain in SES (~5 min + DNS wait)

1. Console → search **SES** → **Configuration → Identities** → **Create identity**.
2. Identity type **Domain**, domain `tug202.org`.
3. Tick **Use a custom MAIL FROM domain**, subdomain `mail` (so `mail.tug202.org`). Behavior on MX failure: *Use default MAIL FROM domain*.
4. Under **Verifying your domain** leave **Easy DKIM**, key length **RSA_2048_BIT**.
5. Tick **Publish DNS records to Route 53** — this is the shortcut: SES writes the 3 DKIM CNAMEs and the MAIL FROM MX/TXT into the hosted zone for you.
6. **Create identity**. The page shows *Verification pending*. Come back in 5–15 min; it flips to **Verified** on its own.

## 2. Verify your own address (sandbox recipient)

While SES is in the sandbox it only delivers to verified addresses. Verify yours so invites/notifications to you work today:

**Create identity** → **Email address** → `wesleyaweaverjr@gmail.com` → Create. Click the link in the email SES sends you.

## 3. Add SPF and DMARC records (Route 53)

SES doesn't add these two. **Route 53 → Hosted zones → tug202.org → Create record**, twice:

| Record name | Type | Value (paste exactly, including quotes) |
|---|---|---|
| *(blank)* | TXT | `"v=spf1 include:amazonses.com ~all"` |
| `_dmarc` | TXT | `"v=DMARC1; p=none; rua=mailto:wesleyaweaverjr@gmail.com"` |

`p=none` means "monitor only" — mailbox providers send you weekly reports and nothing gets rejected. Tighten to `p=quarantine` after a few clean weeks.

## 4. Give the server permission to send (IAM role)

1. Console → **IAM → Policies → Create policy** → **JSON** tab, paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{ "Effect": "Allow", "Action": ["ses:SendEmail", "ses:SendRawEmail"], "Resource": "*" }]
   }
   ```
   Next → name `tug202-ses-send` → Create policy.
2. **IAM → Roles → Create role** → Trusted entity **AWS service**, use case **EC2** → Next → search and tick `tug202-ses-send` → Next → role name `tug202-ec2` → Create role.
3. **EC2 → Instances** → select the tug202 instance → **Actions → Security → Modify IAM role** → choose `tug202-ec2` → **Update IAM role**.

No restart needed; the SDK picks the role up within a minute.

## 5. Request production access (leave the sandbox)

**SES → Account dashboard** → the yellow *Your account is in the sandbox* box → **Request production access**.

- Mail type: **Transactional**
- Website URL: `https://tug202.org`
- Use case description (paste): *Tug Comanche Historical Rescue Foundation, a Washington 501(c)(3) (EIN 39-5018917). Transactional email only from our website: admin-portal invitations and password resets for board members, and notifications of contact/volunteer form submissions to the board. Low volume (tens per month). Recipients are people who submitted a form on our site or board members we invite. Bounces and complaints are handled by removing the address.*
- Compliance: tick that you'll only send to people who requested it.

Usually approved within 24 hours. Until then, only verified addresses (step 2) receive mail; the portal still shows invite links as a fallback so nothing is blocked.

## 6. Test

Once step 1 shows **Verified** and step 4 is attached:

```bash
ssh -i 202.pem ubuntu@ec2-54-147-143-249.compute-1.amazonaws.com 'cd ~/Tug202.Com/backend && node scripts/test-mail.js wesleyaweaverjr@gmail.com'
```

Expect `backend: ses` then `sent to …`. If it says `not authorized`, the role isn't attached yet; `Email address is not verified` means step 1 or 2 hasn't finished.

## 7. Bounce & complaint tracking (for mail blasts) — automatic

The portal's **Mail** tab marks an address `sent` when SES accepts it, but a bad address bounces *later*. SES reports that to us through an SNS topic and a webhook on the server, which flips the address to `bounced` (or `unsubscribed` on a spam complaint) so it's never mailed again. No manual work after this one-time wiring.

**Fastest way — one script in CloudShell** (console → the `>_` terminal icon top-right, region us-east-1). It creates the topic, the HTTPS subscription (the server confirms it itself), the `tug202` configuration set, the bounce/complaint event destination, and — if the account is still in the sandbox — files the production-access request from step 5 with the full use-case text:

```bash
curl -fsSL https://raw.githubusercontent.com/penpro/Tug202.Com/main/ops/ses-bounce-setup.sh | bash
```

It's idempotent; re-run it any time to see the account status (production flag, daily quota, review status). Then on the EC2 box:

```bash
ssh -i 202.pem ubuntu@ec2-54-147-143-249.compute-1.amazonaws.com 'grep -q SES_CONFIG_SET ~/Tug202.Com/backend/.env || echo "SES_CONFIG_SET=tug202" >> ~/Tug202.Com/backend/.env; pm2 restart tug202-backend --update-env'
```

(Setting `SES_CONFIG_SET` before the set exists is safe — the mailer logs one warning and sends without it.)

<details><summary>Same thing by hand in the console</summary>

1. **SNS → Topics → Create topic** → Standard → name `tug202-ses-events` → Create.
2. On that topic → **Create subscription** → Protocol **HTTPS** → Endpoint `https://tug202.org/api/ses/events` → Create subscription. The server confirms it automatically within a few seconds (Status shows *Confirmed*; if it stays *Pending*, check `pm2 logs tug202-backend`).
3. **SES → Configuration sets → Create set** → name `tug202` → Create. Open it → **Event destinations → Add destination** → tick **Hard bounces** and **Complaints** → Next → destination **Amazon SNS**, topic `tug202-ses-events` → name `sns` → Add destination.
4. `SES_CONFIG_SET=tug202` in `backend/.env` as above.

</details>

SES also emails bounce notices to the From address by default; that's harmless noise (nothing receives at no-reply@) and can be turned off under Identities → tug202.org → Notifications → *Email feedback forwarding*.

**Where it shows up:** Contacts tab → the address's status becomes `bounced` with a timestamp, and the blast's detail page counts it under *bounced*. `buildAudience` excludes bounced/unsubscribed addresses from every future blast automatically.

## 8. Inbound mail — `info@tug202.org`

SES only handles *sending* above. Receiving mail at the domain is a separate choice:

- **Google Workspace for Nonprofits** — free for 501(c)(3)s (apply through TechSoup, takes a few days). Real mailboxes, shared calendar, drive, and the board can each have `name@tug202.org`. Recommended long-term; the only DNS work is 5 MX records in Route 53 that Google gives you.
- **SES receiving + forwarding** — all-AWS: an SES receipt rule stores incoming mail in S3 and a small Lambda forwards it to a Gmail address. Works, free at this volume, but ~30 min of console setup and every new alias is a code change. Reasonable stopgap if Workspace approval is slow.

Until one of those exists, `info@tug202.org` on the website bounces. The contact form doesn't depend on it.

## 9. Sending blasts without hitting limits

Every blast has a **pace** (messages per minute, default 30 = one every 2 s) and an optional **daily cap** counted across all blasts (SES sandbox: 200/day and 1/s; production: 50,000/day, 14/s). If SES throttles, the server leaves the address queued and backs off a minute; if the cap is hit it sleeps and resumes after midnight. Blasts survive a restart — state lives in MySQL.

Three ways to start one:

- **Portal → Mail → Send now**, or pick a date/time and **Schedule** (a minute ticker on the server starts it).
- **Server shell**, useful over a slow connection:
  ```bash
  ssh -i 202.pem ubuntu@ec2-54-147-143-249.compute-1.amazonaws.com 'cd ~/Tug202.Com/backend && node scripts/blast.js list'
  ```
  `send <id>`, `send <id> --at "2026-09-22 09:00" --rate 20 --cap 180`, `pause|resume|unschedule <id>`, `status <id>`, `test <id> you@example.com`.
- **API** with the bearer token: `POST /api/admin/blasts/:id/send` with `{"scheduled_at": "<ISO>"}` or an empty body.

## Config reference (`backend/.env`)

```
SES_REGION=us-east-1
SES_CONFIG_SET=tug202          # after step 7
SMTP_FROM="Tug Comanche Foundation" <no-reply@tug202.org>
NOTIFY_EMAIL=wesleyaweaverjr@gmail.com
```

Remove `SES_REGION` to fall back to SMTP (`SMTP_HOST` etc.) or to log-only.
