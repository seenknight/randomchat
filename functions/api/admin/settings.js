import { json, isAdmin, getCityEnabled, setCityEnabled } from '../../_lib/util.js';

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  return json({ ok: true, city_enabled: await getCityEnabled(env) });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }
  if (typeof body.city_enabled !== 'boolean') return json({ ok: false, error: 'invalid_request' }, 400);

  try {
    await setCityEnabled(env, body.city_enabled);
  } catch {
    return json({ ok: false, error: 'settings_unavailable' }, 500);
  }
  return json({ ok: true, city_enabled: body.city_enabled });
}
