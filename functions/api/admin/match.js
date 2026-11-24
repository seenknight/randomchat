import { json, isAdmin, escapeHtml, getCityEnabled } from '../../_lib/util.js';
import { sendMail, mailConfigured } from '../../_lib/mail.js';

function buildEmail(a, b, useCity) {
  const detail = (u, fa) => {
    const age = fa ? `سن ${u.age}` : `age ${u.age}`;
    return useCity && u.city ? `${age}, ${u.city}` : age;
  };
  const detailHtml = (u, fa) => escapeHtml(detail(u, fa));

  const subject = 'anymany: someone wants you to meet! / یک آشنایی تصادفی برای شما';

  const text = `Hi!

anymany just introduced the two of you. You were matched at random - we only made sure you are of opposite gender and close in age.

  ${a.email} (${detail(a, false)})
  ${b.email} (${detail(b, false)})

Just hit "reply all" and say hello. Be kind, be yourself, and have fun!

If you'd rather not chat, simply ignore this email.

-----

سلام!

anymany به‌صورت تصادفی شما دو نفر را با هم آشنا کرد. فقط مطمئن شدیم که غیرهمجنس باشید و سنتان به هم نزدیک باشد.

  ${a.email} (${detail(a, true)})
  ${b.email} (${detail(b, true)})

کافیه روی «پاسخ به همه» بزنید و سلام کنید. مهربان باشید، خودتان باشید و خوش بگذرد!

اگر تمایلی به گفتگو ندارید، این ایمیل را نادیده بگیرید.
`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ff;font-family:Arial,Helvetica,sans-serif;color:#231f3a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e3dcff">
    <h2 style="margin:0 0 12px;color:#6c4cf1">anymany 💬</h2>
    <p>Hi! We just introduced the two of you. You were matched at random &mdash; we only made sure you are of opposite gender and close in age.</p>
    <p style="background:#f4f1ff;border-radius:10px;padding:14px;line-height:1.8">
      <b>${escapeHtml(a.email)}</b> (${detailHtml(a, false)})<br>
      <b>${escapeHtml(b.email)}</b> (${detailHtml(b, false)})
    </p>
    <p>Just hit <b>reply all</b> and say hello. Be kind, be yourself, and have fun!</p>
    <p style="color:#7a7596;font-size:13px">If you'd rather not chat, simply ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e3dcff;margin:24px 0">
    <div dir="rtl" style="text-align:right">
      <p>سلام! anymany به‌صورت تصادفی شما دو نفر را با هم آشنا کرد. فقط مطمئن شدیم که غیرهمجنس باشید و سنتان به هم نزدیک باشد.</p>
      <p style="background:#f4f1ff;border-radius:10px;padding:14px;line-height:1.8" dir="ltr">
        <b>${escapeHtml(a.email)}</b> (${detailHtml(a, true)})<br>
        <b>${escapeHtml(b.email)}</b> (${detailHtml(b, true)})
      </p>
      <p>کافیه روی «پاسخ به همه» بزنید و سلام کنید. مهربان باشید، خودتان باشید و خوش بگذرد!</p>
      <p style="color:#7a7596;font-size:13px">اگر تمایلی به گفتگو ندارید، این ایمیل را نادیده بگیرید.</p>
    </div>
  </div>
</div></body></html>`;

  return { subject, text, html };
}

// Step 2 of an introduction: the admin approved a pair from /api/admin/preview.
// The pair is checked again here, so nothing is trusted from the browser.
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!mailConfigured(env)) return json({ ok: false, error: 'email_not_configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }
  const idA = Number(body.a);
  const idB = Number(body.b);
  if (!Number.isInteger(idA) || !Number.isInteger(idB) || idA < 1 || idB < 1 || idA === idB) {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  const { results } = await env.DB.prepare(
    'SELECT id, email, gender, age, city, city_key FROM users WHERE id IN (?1, ?2) AND verified = 1'
  )
    .bind(idA, idB)
    .all();
  if (results.length !== 2 || results[0].gender === results[1].gender) {
    return json({ ok: false, error: 'pair_invalid' }, 409);
  }
  const a = results.find((u) => u.id === idA);
  const b = results.find((u) => u.id === idB);
  const useCity = await getCityEnabled(env);

  // Reserve the pair BEFORE sending, so a double click can never send two emails.
  const [lo, hi] = idA < idB ? [idA, idB] : [idB, idA];
  const reserved = await env.DB.prepare('INSERT OR IGNORE INTO matches (user_a, user_b) VALUES (?1, ?2)')
    .bind(lo, hi)
    .run();
  if (!reserved.meta || reserved.meta.changes !== 1) return json({ ok: false, error: 'already_matched' }, 409);

  const { subject, text, html } = buildEmail(a, b, useCity);
  const sent = await sendMail(env, [a.email, b.email], subject, text, html);
  if (!sent.ok) {
    // Release the pair so it can be tried again.
    await env.DB.prepare('DELETE FROM matches WHERE user_a = ?1 AND user_b = ?2').bind(lo, hi).run();
    return json({ ok: false, error: 'email_failed', detail: sent.detail }, 502);
  }

  return json({
    ok: true,
    pair: [
      { email: a.email, gender: a.gender, age: a.age, city: useCity ? a.city : null },
      { email: b.email, gender: b.gender, age: b.age, city: useCity ? b.city : null },
    ],
  });
}
