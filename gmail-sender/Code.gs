// Google Apps Script: sends the introduction emails from YOUR Gmail account. No domain needed.
// Free Gmail limit: about 100 recipients per day (each introduction uses 2).

const SECRET = 'PUT-A-LONG-RANDOM-SECRET-HERE'; // must match APPS_SCRIPT_SECRET in Cloudflare

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET) return out({ ok: false, error: 'bad_secret' });

    const to = Array.isArray(data.to) ? data.to : [];
    if (to.length < 1 || to.length > 2) return out({ ok: false, error: 'bad_recipients' });

    MailApp.sendEmail({
      to: to.join(','),
      subject: String(data.subject || ''),
      body: String(data.text || ''),
      htmlBody: String(data.html || ''),
      name: 'randomchat',
    });
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
