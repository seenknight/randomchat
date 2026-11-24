import { json } from '../_lib/util.js';

// The link in the confirmation email opens this page (GET). Confirmation itself happens on the
// button press (POST), so email security scanners that "click" links cannot confirm by accident.

const TOKEN_RE = /^[a-f0-9]{64}$/;

const html = (body, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>anymany</title>
<style>
  :root { --bg1:#f4f1ff; --bg2:#ffeef4; --card:#fff; --ink:#231f3a; --muted:#7a7596; --brand:#6c4cf1; --brand2:#ff5c8a; --line:#e3dcff; }
  @media (prefers-color-scheme: dark) { :root { --bg1:#15122b; --bg2:#26122a; --card:#1f1b3a; --ink:#f1eeff; --muted:#a49fc4; --line:#3a3366; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px; color:var(--ink);
         font-family: system-ui, 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg,var(--bg1),var(--bg2)) fixed; }
  .card { width:100%; max-width:440px; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:28px; text-align:center; }
  .logo { font-weight:700; font-size:22px; margin-bottom:14px; } .logo span { color:var(--brand); }
  .big { font-size:48px; } p { line-height:1.8; margin:10px 0; }
  .fa { direction:rtl; color:var(--muted); border-top:1px solid var(--line); margin-top:16px; padding-top:14px; }
  button, a.btn { display:inline-block; margin-top:14px; padding:13px 22px; border:0; border-radius:12px; cursor:pointer; font:inherit; font-weight:600;
         color:#fff; text-decoration:none; background:linear-gradient(135deg,var(--brand),var(--brand2)); }
</style></head><body><div class="card"><div class="logo">any<span>many</span></div>${body}</div></body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
      },
    }
  );

const invalidPage = () =>
  html(
    `<div class="big">⚠️</div>
     <p>This link is invalid or has expired. Please register again on the site.</p>
     <p class="fa">این لینک نامعتبر است یا منقضی شده. لطفاً دوباره در سایت ثبت‌نام کنید.</p>
     <a class="btn" href="/">anymany</a>`,
    400
  );

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!TOKEN_RE.test(token)) return invalidPage();

  const row = await env.DB.prepare(
    "SELECT id FROM users WHERE verify_token = ?1 AND verified = 0 AND verify_expires > datetime('now')"
  )
    .bind(token)
    .first();
  if (!row) return invalidPage();

  return html(
    `<div class="big">✉️</div>
     <p>One last step: confirm that this is your email address.</p>
     <p class="fa">یک قدم دیگر: تأیید کنید که این ایمیل متعلق به شماست.</p>
     <form method="POST" action="/api/verify">
       <input type="hidden" name="token" value="${token}">
       <button type="submit">Confirm my email / تأیید ایمیل من</button>
     </form>`
  );
}

export async function onRequestPost({ request, env }) {
  let token = '';
  try {
    const form = await request.formData();
    token = String(form.get('token') || '');
  } catch {
    return invalidPage();
  }
  if (!TOKEN_RE.test(token)) return invalidPage();

  const result = await env.DB.prepare(
    `UPDATE users SET verified = 1, verify_token = NULL, verify_expires = NULL
      WHERE verify_token = ?1 AND verified = 0 AND verify_expires > datetime('now')`
  )
    .bind(token)
    .run();

  if (!result.meta || result.meta.changes !== 1) return invalidPage();

  return html(
    `<div class="big">🎉</div>
     <p>Your email is confirmed. Wait for an email from an anonymous user, and have fun!</p>
     <p class="fa">ایمیل شما تأیید شد. منتظر دریافت ایمیل از طرف یک کاربر ناشناس باشید و خوش بگذره!</p>`
  );
}

// Anything else (e.g. PUT) is not supported.
export async function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
