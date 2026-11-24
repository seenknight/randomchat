import {
  json,
  isAdmin,
  getCityEnabled,
  setCityEnabled,
  getVerifyRequired,
  setVerifyRequired,
} from '../../_lib/util.js';

async function current(env) {
  return { city_enabled: await getCityEnabled(env), verify_required: await getVerifyRequired(env) };
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  return json({ ok: true, ...(await current(env)) });
}

// Body may contain either or both: { city_enabled: boolean, verify_required: boolean }
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  const hasCity = typeof body.city_enabled === 'boolean';
  const hasVerify = typeof body.verify_required === 'boolean';
  if (!hasCity && !hasVerify) return json({ ok: false, error: 'invalid_request' }, 400);

  try {
    if (hasCity) await setCityEnabled(env, body.city_enabled);
    if (hasVerify) await setVerifyRequired(env, body.verify_required);
  } catch {
    return json({ ok: false, error: 'settings_unavailable' }, 500);
  }
  return json({ ok: true, ...(await current(env)) });
}
