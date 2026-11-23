# randomchat

A tiny site that introduces two random strangers by email.

- **Public page** (`/`): visitors enter email, gender (female/male), age and (optionally) city. Data goes into a Cloudflare D1 database. English + Persian (فارسی) toggle.
- **Admin panel** (`/admin.html`): password-protected. One button picks two users at random and emails both of them (each sees the other's address and details). A switch in the panel turns the city question on/off.

**Matching priorities** (strongest first):
1. Opposite gender - mandatory. If nobody of the opposite gender is available, nobody is introduced.
2. Closest possible age.
3. Same city - last priority, only breaks ties between equally close ages.

The first person is picked at random; their partner is then chosen by the priorities above. A pair is never introduced twice.

Stack: Cloudflare Pages + Pages Functions + D1 + [Resend](https://resend.com) for email.

```
public/                 static site (index.html, admin.html)
functions/api/          register.js, admin/match.js, admin/stats.js
functions/_lib/         pairing logic + helpers
schema.sql              D1 tables
wrangler.toml           Cloudflare config
test/pairing.test.js    unit test of the matching rules (npm test)
```

## Deploy (GitHub + Cloudflare)

### 1. Push to GitHub
```bash
cd randomchat
git init && git add . && git commit -m "randomchat"
git branch -M main
git remote add origin https://github.com/<you>/randomchat.git
git push -u origin main
```

### 2. Create the database
```bash
npm install
npx wrangler login
npx wrangler d1 create randomchat-db
```
Copy the printed `database_id` into `wrangler.toml`, commit, and push. Then create the tables:
```bash
npm run db:init:remote
```

### 3. Email sender (Resend)
1. Create a free account at https://resend.com and add + verify your domain (DNS records in Cloudflare).
2. Create an API key.
3. `FROM_EMAIL` must be an address on that verified domain, e.g. `randomchat <hello@your-domain.com>`.

### 4. Create the Pages project
Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.

- Framework preset: **None**
- Build command: *(empty)*
- Build output directory: `public`

After the first deploy, open the project → **Settings**:

- **Bindings → Add → D1 database**: variable name `DB`, database `randomchat-db`
- **Variables and Secrets** (add as *Secret*):
  - `ADMIN_PASSWORD` — a long random password
  - `RESEND_API_KEY` — from Resend
  - `FROM_EMAIL` — e.g. `randomchat <hello@your-domain.com>`

Redeploy once (Deployments → Retry) so bindings take effect. Optionally add a custom domain under **Custom domains**.

### 5. Use it
- Visitors: `https://<your-site>/`
- You: `https://<your-site>/admin.html` → enter the password → press **Send a random introduction**.

## Upgrading an existing database (adding cities)
Do this **before** deploying the new code. In the Cloudflare D1 console run the four statements of `migration.sql` one by one. Existing users keep working (they just have no city).

## Local development
```bash
cp .dev.vars.example .dev.vars     # fill in values
npm run db:init:local
npm run dev                        # http://localhost:8788
npm test
```

## Notes
- Only adults (18+) can register, and they must tick a consent box that their email is shared with their match.
- Registering the same email again updates its gender/age.
- A pair is saved only after Resend accepted the email, so failed sends don't "use up" a pair.
- Extra protection for the admin page is possible with **Cloudflare Access** (Zero Trust → Access → Applications → protect `/admin.html` and `/api/admin/*`).
- Resend's free tier has daily/monthly limits; each introduction is one email.
