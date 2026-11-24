export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Constant-time string comparison (avoids leaking the password through timing).
export function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token.length > 0 && safeEqual(token, env.ADMIN_PASSWORD);
}

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Admin switches live in the `settings` table. Every switch is ON unless the admin turned it off
// (also when the table or row does not exist yet).
async function getFlag(env, key) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first();
    return row ? row.value !== '0' : true;
  } catch {
    return true;
  }
}

async function setFlag(env, key, enabled) {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
    .bind(key, enabled ? '1' : '0')
    .run();
}

export const getCityEnabled = (env) => getFlag(env, 'city_enabled');
export const setCityEnabled = (env, enabled) => setFlag(env, 'city_enabled', enabled);

// Whether new users must confirm their email by link before they can be matched.
export const getVerifyRequired = (env) => getFlag(env, 'verify_required');
export const setVerifyRequired = (env, enabled) => setFlag(env, 'verify_required', enabled);
