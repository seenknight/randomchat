# AnyMany

**AnyMany introduces two strangers by email.** People sign up with their email, gender, age (and optionally city). The admin presses a button, reviews a proposed pair, and the app emails both people so they can say hello.

Runs on Cloudflare Pages · English + Persian (فارسی) interface · no user accounts or passwords.

<details>
<summary><b>خلاصه به فارسی</b></summary>

<div dir="rtl">

AnyMany دو غریبه را از طریق ایمیل با هم آشنا می‌کند. کاربر ایمیل، جنسیت، سن (و در صورت فعال بودن، شهر) را وارد می‌کند و ایمیلش را با لینک تأیید می‌کند. مدیر در پنل یک جفت تصادفی پیشنهاد می‌گیرد، آن را بررسی می‌کند (در صورت نیاز دوباره انتخاب می‌کند) و بعد از تأیید نهایی، ایمیل آشنایی برای هر دو نفر فرستاده می‌شود. جفت‌ها همیشه غیرهمجنس‌اند، سنشان تا حد ممکن نزدیک است و در صورت برابری، همشهری‌ها اولویت دارند.

</div>

</details>

## Features

- **Signup form** with email, gender (female/male), age and city. Adults only (18+), with a consent checkbox. Language toggle (English / فارسی).
- **Email confirmation**: new users must click a link before they can be matched (can be switched off by the admin).
- **Admin panel** (`/admin.html`), password protected:
  - live counters (users, women, men, introductions sent)
  - **two-step introductions**: pick a random pair → review → *Send email to both*, or *Pick again* (a rejected pair is not proposed again)
  - switch: **City field** on/off
  - switch: **Email confirmation** on/off
  - list of recent introductions
- **Bilingual introduction email** (English + Persian) sent to both people.
- **Spam protection**: honeypot field, per-visitor limit on signups, cooldown on confirmation emails, constant-time admin password check.

## How people are matched

Priorities, strongest first:

1. **Opposite gender** – mandatory. If nobody of the opposite gender is available, nobody is introduced.
2. **Closest possible age.**
3. **Same city** – last priority. It only breaks ties between equally close ages, so a person from another city with a 1-year gap always beats a fellow citizen with an 8-year gap.

The first person is drawn at random, then their best partner is chosen by the rules above. Only **confirmed** users are considered, and the same pair is never introduced twice. Cities are normalized, so `Tehran`, `tehran` and `تهران` count as the same city.

## Tech stack

| Part | Service |
| --- | --- |
| Hosting + API | [Cloudflare Pages](https://pages.cloudflare.com/) + Pages Functions |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| Email | **Option A:** your own Gmail through a Google Apps Script (free, no domain needed) · **Option B:** [Resend](https://resend.com) (needs your own domain) |

No build step: the site is plain HTML/JS and the API is a handful of small functions.

## Project structure

```
public/                   static site: index.html (signup), admin.html, _headers, logo + favicons
functions/api/
  register.js             POST  signup (+ sends the confirmation email)
  verify.js               GET/POST  confirmation link
  config.js               GET   public settings for the form
  admin/preview.js        POST  propose a random pair (sends nothing)
  admin/match.js          POST  send the introduction for an approved pair
  admin/stats.js          GET   counters + recent introductions
  admin/settings.js       GET/POST  admin switches
functions/_lib/
  pairing.js              matching rules
  city.js                 city normalization
  mail.js                 email sending (Gmail script or Resend)
  util.js                 helpers, admin auth, settings
gmail-sender/Code.gs      Google Apps Script that sends email from your Gmail
schema.sql                database tables (fresh install)
migration.sql             upgrade from the first version (adds cities)
test/pairing.test.js      tests for matching and city normalization  (npm test)
wrangler.toml             Cloudflare config (D1 binding)
```

## Deploy

### 1. Database
```bash
npm install
npx wrangler login
npx wrangler d1 create randomchat-db
```
Copy the printed `database_id` into `wrangler.toml`, then create the tables:
```bash
npm run db:init:remote
```
(Or paste the statements of `schema.sql` into the D1 console, one at a time.)

### 2. Cloudflare Pages
Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.

- Framework preset: **None**
- Build command: *(empty)*
- Build output directory: `public`

> Make sure you create a **Pages** project, not a Workers project (Workers asks for a *Deploy command*).

### 3. Secrets
Project → **Settings → Variables and Secrets** (type *Secret*), then **Retry deployment** once:

| Name | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | password for `/admin.html` – use a long random one |
| `APPS_SCRIPT_URL` + `APPS_SCRIPT_SECRET` | Option A | Gmail sender (see below) |
| `RESEND_API_KEY` + `FROM_EMAIL` | Option B | Resend, e.g. `AnyMany <hello@your-domain.com>` |
| `SITE_URL` | optional | base URL used in confirmation links, e.g. `https://www.example.com` |

If both options are set, the Gmail sender is used.

### 4. Email – Option A: Gmail (free, no domain)
1. Use a dedicated Gmail account and open [script.google.com](https://script.google.com) → **New project**.
2. Paste `gmail-sender/Code.gs` and replace `PUT-A-LONG-RANDOM-SECRET-HERE` with a long random string.
3. **Deploy → New deployment → Web app** · Execute as **Me** · Who has access **Anyone** · authorize.
4. Copy the `/exec` URL into `APPS_SCRIPT_URL`, and the random string into `APPS_SCRIPT_SECRET`.

Limits: a free Gmail account may send to about **100 recipients per day**. Each signup confirmation uses 1, each introduction uses 2. Recipients see your Gmail address as the sender. After editing the script you must create a **new version** in *Manage deployments*.

### 4. Email – Option B: Resend
Add and verify **your own domain** in Resend and create an API key. Resend rejects free public domains (e.g. `*.work.gd`), and its `onboarding@resend.dev` test address can only send to your own account email.

### 5. Custom domain (optional)
Pages project → **Custom domains**. For a domain whose DNS is not on Cloudflare, add the `CNAME` record it shows. Many free DNS panels do not allow a `CNAME` on the bare domain – use `www.your-domain` instead.

## Using the admin panel

1. Open `https://<your-site>/admin.html` and sign in.
2. Press **Pick a random pair**. Nothing is sent yet.
3. Check the proposal (emails, gender, age, city, age gap, same city?).
4. **Send email to both** – or **Pick again** to draw a different pair.

Switches: **City field** (show/hide the question and use it for matching) and **Email confirmation** (when off, new users are accepted immediately and no confirmation email is sent – mistyped or fake addresses can then receive introductions).

## Upgrading an existing database

Run these in the D1 console **before** deploying newer code, one statement at a time.

**Version 1 → cities** (`migration.sql`):
```sql
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN city_key TEXT;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings (key, value) VALUES ('city_enabled', '1');
```

**Cities → email confirmation:**
```sql
ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN verify_token TEXT;
ALTER TABLE users ADD COLUMN verify_expires TEXT;
ALTER TABLE users ADD COLUMN verify_sent_at TEXT;
CREATE INDEX IF NOT EXISTS idx_users_token ON users(verify_token);
CREATE TABLE IF NOT EXISTS signup_attempts (ip TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));
-- optional: treat every existing user as already confirmed
UPDATE users SET verified = 1;
```

## Local development

```bash
cp .dev.vars.example .dev.vars     # fill in the values
npm run db:init:local
npm run dev                        # http://localhost:8788
npm test
```

## Privacy and safety notes

- Users must be 18+ and agree that their email, age and city are shown to the person they are matched with.
- Only confirmed emails are matched; confirmation links expire after 48 hours and need a button press, so link scanners cannot confirm by accident.
- A confirmed email cannot be changed by someone who only knows the address.
- The admin API uses a bearer password. For stronger protection put `/admin.html` and `/api/admin/*` behind **Cloudflare Access**.
- To limit abuse, visitor IP addresses are stored for signup rate limiting and removed after about a day.
- The pages load fonts from Google Fonts.
- Never commit `.dev.vars`, API keys or the Apps Script secret.

## Free-tier limits (check the providers for current numbers)

- Cloudflare D1 free: millions of reads and 100k writes per day – far more than this app needs.
- Gmail: about 100 recipients per day. Resend free: 100 emails per day / 3,000 per month.
