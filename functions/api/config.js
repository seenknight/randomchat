import { json, getCityEnabled } from '../_lib/util.js';

// Public: tells the signup form which optional fields to show.
export async function onRequestGet({ env }) {
  return json({ ok: true, city_enabled: await getCityEnabled(env) });
}
