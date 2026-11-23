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

// Settings live in the `settings` table. City is ON unless the admin switched it off.
export async function getCityEnabled(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'city_enabled'").first();
    return row ? row.value !== '0' : true;
  } catch {
    return true; // settings table missing (migration not run yet)
  }
}

export async function setCityEnabled(env, enabled) {
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('city_enabled', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  )
    .bind(enabled ? '1' : '0')
    .run();
}
