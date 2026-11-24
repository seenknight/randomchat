import { json, getCityEnabled, escapeHtml } from '../_lib/util.js';
import { cityKey } from '../_lib/city.js';
import { sendMail, mailConfigured } from '../_lib/mail.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_SIGNUPS_PER_IP_PER_HOUR = 8; // confirmation emails one visitor may trigger per hour
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // same email: at most one confirmation mail per 2 minutes

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildVerifyEmail(link) {
  const subject = 'anymany: please confirm your email / لطفاً ایمیل خود را تأیید کنید';
  const text = `Hi!

Someone (hopefully you) signed up on anymany with this email address.
Please confirm it with this link (valid for 48 hours):

${link}

If this wasn't you, just ignore this email and nothing will happen.

-----

سلام!

این ایمیل در سایت anymany ثبت‌نام شده است. لطفاً با لینک زیر آن را تأیید کنید (۴۸ ساعت اعتبار دارد):

${link}

اگر این کار را شما نکرده‌اید، این ایمیل را نادیده بگیرید و هیچ اتفاقی نمی‌افتد.
`;
  const safe = escapeHtml(link);
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ff;font-family:Arial,Helvetica,sans-serif;color:#231f3a">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e3dcff">
  <h2 style="margin:0 0 12px;color:#6c4cf1">anymany</h2>
  <p>Hi! Someone (hopefully you) signed up on anymany with this email address. Please confirm it:</p>
  <p><a href="${safe}" style="display:inline-block;background:#6c4cf1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px">Confirm my email</a></p>
  <p style="color:#7a7596;font-size:13px">If this wasn't you, just ignore this email. The link is valid for 48 hours.</p>
  <hr style="border:none;border-top:1px solid #e3dcff;margin:24px 0">
  <div dir="rtl" style="text-align:right">
    <p>سلام! این ایمیل در سایت anymany ثبت‌نام شده است. لطفاً آن را تأیید کنید:</p>
    <p><a href="${safe}" style="display:inline-block;background:#6c4cf1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px">تأیید ایمیل</a></p>
    <p style="color:#7a7596;font-size:13px">اگر این کار را شما نکرده‌اید، این ایمیل را نادیده بگیرید. لینک ۴۸ ساعت اعتبار دارد.</p>
  </div>
</div></div></body></html>`;
  return { subject, text, html };
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  // Honeypot field: real users never fill it in, bots usually do.
  if (body.website) return json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  const gender = body.gender;
  const age = Number(body.age);

  if (!EMAIL_RE.test(email) || email.length > 254) return json({ ok: false, error: 'invalid_email' }, 400);
  if (gender !== 'female' && gender !== 'male') return json({ ok: false, error: 'invalid_gender' }, 400);
  if (!Number.isInteger(age) || age < 18 || age > 100) return json({ ok: false, error: 'invalid_age' }, 400);

  // City is only collected while the admin has it switched on.
  let city = null;
  let key = null;
  if (await getCityEnabled(env)) {
    city = String(body.city || '').trim().replace(/\s+/g, ' ');
    key = cityKey(city);
    if (city.length < 2 || city.length > 60 || !key) return json({ ok: false, error: 'invalid_city' }, 400);
  }

  if (body.consent !== true) return json({ ok: false, error: 'consent_required' }, 400);
  if (!mailConfigured(env)) return json({ ok: false, error: 'mail_failed' }, 500);

  // An already confirmed email is never changed by someone who only knows the address.
  // We answer "ok" either way, so nobody can probe which emails are registered.
  const existing = await env.DB.prepare('SELECT verified, verify_sent_at FROM users WHERE email = ?1')
    .bind(email)
    .first();
  if (existing) {
    if (Number(existing.verified) === 1) return json({ ok: true });
    if (existing.verify_sent_at) {
      const sentAt = Date.parse(existing.verify_sent_at.replace(' ', 'T') + 'Z');
      if (Date.now() - sentAt < RESEND_COOLDOWN_MS) return json({ ok: true });
    }
  }

  // Limit how many confirmation emails one visitor can trigger (protects strangers' inboxes
  // and the daily sending quota).
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  await env.DB.prepare("DELETE FROM signup_attempts WHERE at < datetime('now', '-1 day')").run();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM signup_attempts WHERE ip = ?1 AND at > datetime('now', '-1 hour')"
  )
    .bind(ip)
    .first();
  if (recent && recent.n >= MAX_SIGNUPS_PER_IP_PER_HOUR) return json({ ok: false, error: 'rate_limited' }, 429);
  await env.DB.prepare('INSERT INTO signup_attempts (ip) VALUES (?1)').bind(ip).run();

  // Save (or refresh) the still-unconfirmed registration together with a fresh token.
  const token = randomToken();
  await env.DB.prepare(
    `INSERT INTO users (email, gender, age, city, city_key, verified, verify_token, verify_expires, verify_sent_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, datetime('now', '+2 days'), datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       gender         = excluded.gender,
       age            = excluded.age,
       city           = COALESCE(excluded.city, users.city),
       city_key       = COALESCE(excluded.city_key, users.city_key),
       verify_token   = excluded.verify_token,
       verify_expires = excluded.verify_expires,
       verify_sent_at = excluded.verify_sent_at
     WHERE users.verified = 0`
  )
    .bind(email, gender, age, city, key, token)
    .run();

  const base = (env.SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
  const { subject, text, html } = buildVerifyEmail(`${base}/api/verify?token=${token}`);
  const sent = await sendMail(env, [email], subject, text, html);
  if (!sent.ok) {
    // Allow an immediate retry.
    await env.DB.prepare('UPDATE users SET verify_sent_at = NULL WHERE email = ?1').bind(email).run();
    return json({ ok: false, error: 'mail_failed' }, 502);
  }

  return json({ ok: true });
}
