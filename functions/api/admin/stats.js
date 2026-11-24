import { json, isAdmin, getCityEnabled } from '../../_lib/util.js';

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const counts = await env.DB.prepare(
    `SELECT
       COUNT(*)                                         AS total,
       COALESCE(SUM(gender = 'female'), 0)              AS females,
       COALESCE(SUM(gender = 'male'), 0)                AS males,
       (SELECT COUNT(*) FROM matches)                   AS matches,
       (SELECT COUNT(*) FROM users WHERE verified = 0)  AS unverified
     FROM users WHERE verified = 1`
  ).first();

  const { results: recent } = await env.DB.prepare(
    `SELECT m.created_at AS created_at,
            a.email AS email_a, a.age AS age_a, a.city AS city_a,
            b.email AS email_b, b.age AS age_b, b.city AS city_b
       FROM matches m
       JOIN users a ON a.id = m.user_a
       JOIN users b ON b.id = m.user_b
      ORDER BY m.id DESC
      LIMIT 10`
  ).all();

  return json({ ok: true, counts, recent, city_enabled: await getCityEnabled(env) });
}
