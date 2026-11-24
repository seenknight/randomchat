import { json, getCityEnabled, getVerifyRequired } from '../_lib/util.js';

// Public: tells the signup form which optional parts to show.
export async function onRequestGet({ env }) {
  return json({
    ok: true,
    city_enabled: await getCityEnabled(env),
    verify_required: await getVerifyRequired(env),
  });
}
