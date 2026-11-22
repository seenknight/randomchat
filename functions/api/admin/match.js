import { json, isAdmin, escapeHtml } from '../../_lib/util.js';
import { pickPair, pairKey } from '../../_lib/pairing.js';

function buildEmail(a, b) {
  const subject = 'randomchat: someone wants you to meet! / یک آشنایی تصادفی برای شما';

  const text = `Hi!

randomchat just introduced the two of you. You were matched at random - we only made sure you are of opposite gender and close in age.

  ${a.email} (age ${a.age})
  ${b.email} (age ${b.age})

Just hit "reply all" and say hello. Be kind, be yourself, and have fun!

If you'd rather not chat, simply ignore this email.

-----

سلام!

randomchat به‌صورت تصادفی شما دو نفر را با هم آشنا کرد. فقط مطمئن شدیم که غیرهمجنس باشید و سنتان به هم نزدیک باشد.

  ${a.email} (سن ${a.age})
  ${b.email} (سن ${b.age})

کافیه روی «پاسخ به همه» بزنید و سلام کنید. مهربان باشید، خودتان باشید و خوش بگذرد!

اگر تمایلی به گفتگو ندارید، این ایمیل را نادیده بگیرید.
`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ff;font-family:Arial,Helvetica,sans-serif;color:#231f3a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e3dcff">
    <h2 style="margin:0 0 12px;color:#6c4cf1">randomchat 💬</h2>
    <p>Hi! We just introduced the two of you. You were matched at random &mdash; we only made sure you are of opposite gender and close in age.</p>
    <p style="background:#f4f1ff;border-radius:10px;padding:14px;line-height:1.8">
      <b>${escapeHtml(a.email)}</b> (age ${a.age})<br>
      <b>${escapeHtml(b.email)}</b> (age ${b.age})
    </p>
    <p>Just hit <b>reply all</b> and say hello. Be kind, be yourself, and have fun!</p>
    <p style="color:#7a7596;font-size:13px">If you'd rather not chat, simply ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e3dcff;margin:24px 0">
    <div dir="rtl" style="text-align:right">
      <p>سلام! randomchat به‌صورت تصادفی شما دو نفر را با هم آشنا کرد. فقط مطمئن شدیم که غیرهمجنس باشید و سنتان به هم نزدیک باشد.</p>
      <p style="background:#f4f1ff;border-radius:10px;padding:14px;line-height:1.8" dir="ltr">
        <b>${escapeHtml(a.email)}</b> (${a.age})<br>
        <b>${escapeHtml(b.email)}</b> (${b.age})
      </p>
      <p>کافیه روی «پاسخ به همه» بزنید و سلام کنید. مهربان باشید، خودتان باشید و خوش بگذرد!</p>
      <p style="color:#7a7596;font-size:13px">اگر تمایلی به گفتگو ندارید، این ایمیل را نادیده بگیرید.</p>
    </div>
  </div>
</div></body></html>`;

  return { subject, text, html };
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) return json({ ok: false, error: 'email_not_configured' }, 500);

  const { results: users } = await env.DB.prepare('SELECT id, email, gender, age FROM users').all();
  const { results: pairs } = await env.DB.prepare('SELECT user_a, user_b FROM matches').all();
  const used = new Set(pairs.map((p) => pairKey(p.user_a, p.user_b)));

  const pair = pickPair(users, used);
  if (!pair) return json({ ok: false, error: 'no_pair_available' }, 409);
  const { a, b } = pair;

  const { subject, text, html } = buildEmail(a, b);
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: [a.email, b.email], subject, text, html }),
    });
  } catch {
    return json({ ok: false, error: 'email_failed', detail: 'could not reach the email provider' }, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return json({ ok: false, error: 'email_failed', detail: detail.slice(0, 300) }, 502);
  }

  // Only record the pair once the email was accepted for delivery.
  const [lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  await env.DB.prepare('INSERT INTO matches (user_a, user_b) VALUES (?1, ?2)').bind(lo, hi).run();

  return json({
    ok: true,
    pair: [
      { email: a.email, gender: a.gender, age: a.age },
      { email: b.email, gender: b.gender, age: b.age },
    ],
  });
}
