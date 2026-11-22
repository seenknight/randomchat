import { json } from '../_lib/util.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  if (body.consent !== true) return json({ ok: false, error: 'consent_required' }, 400);

  // Registering the same email again simply updates gender/age.
  await env.DB.prepare(
    `INSERT INTO users (email, gender, age) VALUES (?1, ?2, ?3)
     ON CONFLICT(email) DO UPDATE SET gender = excluded.gender, age = excluded.age`
  )
    .bind(email, gender, age)
    .run();

  return json({ ok: true });
}
