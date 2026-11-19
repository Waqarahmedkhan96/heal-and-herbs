// POST /api/submit — receives consultation bookings, orders and contact messages.
//
// Delivery (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  + NOTIFY_EMAIL   email each submission to the clinic (resend.com)
//   FROM_EMAIL                       sender, e.g. "Heal & Herbs <bookings@yourdomain.com>"
//   WEBHOOK_URL                      optional: also POST JSON here (Google Sheets script, Zapier, Make…)
//
// Prices are recalculated here from the catalogue, so a changed price in the browser is never trusted.

const CATALOG = require('./_catalog.json');

const MAX = 2000;
const clean = (v, max = MAX) => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? v : '');
const pkr = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-US');
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
const digits = (v) => String(v || '').replace(/\D/g, '');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(JSON.parse(req.body));
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 50000) reject(new Error('too large')); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function booking(d) {
  const duration = Number(d.duration);
  const price = CATALOG.consultations[String(duration)];
  if (!price) return { error: 'Invalid consultation length' };
  if (clean(d.name).length < 2 || digits(d.phone).length < 10) return { error: 'Missing name or phone' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !/^\d{2}:\d{2}$/.test(d.time)) return { error: 'Invalid date or time' };
  const lines = [
    `Consultation request ${clean(d.ref, 20)}`,
    `${duration} minutes · ${pkr(price)} · ${clean(d.platform, 40)}`,
    `${d.date} at ${d.time} (Pakistan time)`,
    '',
    `Name: ${clean(d.name, 120)}`,
    `Phone / WhatsApp: ${clean(d.phone, 40)}`,
    `Email: ${clean(d.email, 160) || '—'}`,
    `Topic: ${clean(d.topic, 80)}`,
    `Payment method: ${clean(d.payment, 40)}`,
    '',
    `Notes: ${clean(d.notes) || '—'}`,
  ];
  return { subject: `New booking ${clean(d.ref, 20)} — ${d.date} ${d.time} PKT`, text: lines.join('\n'), replyTo: d.email, total: price };
}

function order(d) {
  const items = Array.isArray(d.items) ? d.items.slice(0, 20) : [];
  let subtotal = 0;
  const rows = [];
  for (const it of items) {
    const p = CATALOG.products[it && it.id];
    const qty = Math.max(0, Math.min(50, parseInt(it && it.qty, 10) || 0));
    if (!p || !qty) continue;
    subtotal += p.price * qty;
    rows.push(`${qty} × ${p.name} @ ${pkr(p.price)} = ${pkr(p.price * qty)}`);
  }
  if (!rows.length) return { error: 'Empty order' };
  if (clean(d.name).length < 2 || digits(d.phone).length < 10 || clean(d.address).length < 8) return { error: 'Missing delivery details' };
  const shipping = subtotal >= CATALOG.shipping.freeOver ? 0 : CATALOG.shipping.flat;
  const total = subtotal + shipping;
  const lines = [
    `Order ${clean(d.ref, 20)}`,
    ...rows,
    `Subtotal: ${pkr(subtotal)}`,
    `Delivery: ${shipping ? pkr(shipping) : 'Free'}`,
    `TOTAL: ${pkr(total)}`,
    `Payment method: ${clean(d.payment, 40)}`,
    '',
    `Name: ${clean(d.name, 120)}`,
    `Phone: ${clean(d.phone, 40)}`,
    `Email: ${clean(d.email, 160) || '—'}`,
    `Address: ${clean(d.address, 400)}, ${clean(d.city, 60)}`,
  ];
  if (Number(d.total) !== total) lines.push('', `Note: browser showed ${pkr(d.total)}; the correct total is ${pkr(total)}.`);
  return { subject: `New order ${clean(d.ref, 20)} — ${pkr(total)}`, text: lines.join('\n'), replyTo: d.email, total };
}

function message(d) {
  if (clean(d.name).length < 1 || clean(d.reach).length < 3 || clean(d.message).length < 2) return { error: 'Incomplete message' };
  return {
    subject: `Website message — ${clean(d.subject, 60)}`,
    text: [`From: ${clean(d.name, 120)}`, `Reply to: ${clean(d.reach, 160)}`, `Subject: ${clean(d.subject, 60)}`, '', clean(d.message)].join('\n'),
    replyTo: d.reach,
  };
}

async function deliver(kind, mail, data) {
  const results = [];
  const { RESEND_API_KEY, NOTIFY_EMAIL, FROM_EMAIL, WEBHOOK_URL } = process.env;
  if (RESEND_API_KEY && NOTIFY_EMAIL) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL || 'Heal & Herbs <onboarding@resend.dev>',
        to: NOTIFY_EMAIL.split(',').map((x) => x.trim()).filter(Boolean),
        reply_to: isEmail(mail.replyTo) ? mail.replyTo : undefined,
        subject: mail.subject,
        text: mail.text,
      }),
    });
    results.push(r.ok);
  }
  if (WEBHOOK_URL) {
    const r = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, subject: mail.subject, text: mail.text, data, receivedAt: new Date().toISOString() }) });
    results.push(r.ok);
  }
  return results;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  let body;
  try { body = await readBody(req); } catch (e) { return res.status(400).json({ ok: false, error: 'Invalid request' }); }

  const kind = body && body.kind;
  const data = (body && typeof body.data === 'object' && body.data) || {};
  if (data.hp) return res.status(200).json({ ok: true }); // spam trap filled in

  const build = { booking, order, message }[kind];
  if (!build) return res.status(400).json({ ok: false, error: 'Unknown type' });
  const mail = build(data);
  if (mail.error) return res.status(422).json({ ok: false, error: mail.error });

  try {
    const results = await deliver(kind, mail, data);
    if (!results.length) {
      // No delivery channel configured yet: keep the submission in the function logs so nothing is lost.
      console.warn('[submit] no delivery channel configured', JSON.stringify({ kind, subject: mail.subject, text: mail.text }));
    } else {
      console.log('[submit]', kind, mail.subject, results.every(Boolean) ? 'delivered' : 'partial');
    }
    return res.status(200).json({ ok: true, total: mail.total });
  } catch (e) {
    console.error('[submit] delivery failed', kind, mail.subject, e && e.message);
    return res.status(502).json({ ok: false, error: 'Could not send. Please contact us on WhatsApp.' });
  }
};
