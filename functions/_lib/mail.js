// Sends email. Used for both the confirmation link and the introductions.
// Option 1 (no domain needed): a Google Apps Script web app that sends from your own Gmail.
// Option 2: Resend with a verified domain.

export function mailConfigured(env) {
  return Boolean(
    (env.APPS_SCRIPT_URL && env.APPS_SCRIPT_SECRET) || (env.RESEND_API_KEY && env.FROM_EMAIL)
  );
}

export async function sendMail(env, to, subject, text, html) {
  try {
    if (env.APPS_SCRIPT_URL && env.APPS_SCRIPT_SECRET) {
      const res = await fetch(env.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'content-type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret: env.APPS_SCRIPT_SECRET, to, subject, text, html }),
        redirect: 'follow',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.ok) return { ok: true };
      return { ok: false, detail: String((data && data.error) || `HTTP ${res.status}`).slice(0, 300) };
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL, to, subject, text, html }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, detail: (await res.text().catch(() => '')).slice(0, 300) };
  } catch {
    return { ok: false, detail: 'could not reach the email provider' };
  }
}
