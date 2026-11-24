import { json, isAdmin, getCityEnabled } from '../../_lib/util.js';
import { pickPair, pairKey } from '../../_lib/pairing.js';

// Step 1 of an introduction: draws a proposed pair. Nothing is sent or saved here.
// The admin panel may pass `exclude` (pair keys the admin already rejected in this session),
// so "pick again" always gives a different pair.
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    // an empty body is fine
  }

  const useCity = await getCityEnabled(env);
  const { results: users } = await env.DB.prepare(
    'SELECT id, email, gender, age, city, city_key FROM users WHERE verified = 1'
  ).all();
  const { results: pairs } = await env.DB.prepare('SELECT user_a, user_b FROM matches').all();

  const unavailable = new Set(pairs.map((p) => pairKey(p.user_a, p.user_b)));
  if (Array.isArray(body.exclude)) {
    for (const k of body.exclude.slice(0, 1000)) {
      if (typeof k === 'string' && /^\d+-\d+$/.test(k)) unavailable.add(k);
    }
  }

  const pair = pickPair(users, unavailable, { useCity });
  if (!pair) return json({ ok: false, error: 'no_pair_available' }, 409);
  const { a, b } = pair;

  const describe = (u) => ({
    id: u.id,
    email: u.email,
    gender: u.gender,
    age: u.age,
    city: useCity ? u.city : null,
  });

  return json({
    ok: true,
    key: pairKey(a.id, b.id),
    pair: [describe(a), describe(b)],
    age_gap: Math.abs(a.age - b.age),
    same_city: useCity ? Boolean(a.city_key && a.city_key === b.city_key) : null,
  });
}
