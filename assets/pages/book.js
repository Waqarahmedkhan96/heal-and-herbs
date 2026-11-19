// ---- Booking configuration -------------------------------------------
var PKT_OFFSET_H = 5;                       // Pakistan Standard Time, UTC+5 (no DST)
var HOURS = [[10, 0, 13, 0], [15, 0, 19, 0]]; // consulting blocks in PKT [startH, startM, endH, endM]
var CLOSED = [0];                           // 0 = Sunday
var DAYS_AHEAD = 14;                        // bookable days shown
var SLOT_STEP = 30;                         // minutes between start times
var PLANS = {
  30: { label: '30 minutes', price: 4999, blurb: 'One concern, or a follow-up to an earlier visit.' },
  60: { label: '60 minutes', price: 9999, blurb: 'Full first consultation with a written plan.' }
};
var PLATFORMS = [
  { id: 'meet', name: 'Google Meet', desc: 'Video call · link emailed to you', needsEmail: true },
  { id: 'zoom', name: 'Zoom', desc: 'Video call · link emailed to you', needsEmail: true },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Voice or video call to your number', needsEmail: false }
];
var PAYMENTS = [
  { id: 'card', name: 'Debit / credit card', desc: 'Visa, Mastercard, UnionPay' },
  { id: 'jazzcash', name: 'JazzCash', desc: 'Mobile wallet' },
  { id: 'easypaisa', name: 'Easypaisa', desc: 'Mobile wallet' },
  { id: 'bank', name: 'Bank transfer', desc: 'Slot confirmed once payment clears' }
];
var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var STEPS = ['Call type', 'Date & time', 'Your details', 'Payment'];

function hhHash(str) { var h = 0; for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; } return Math.abs(h); }
// Demo availability: replace with the clinic's calendar API (busy = true).
// Connect the clinic calendar here: return true when dayKey (YYYY-MM-DD) at minute-of-day (PKT) is taken.
var HH_BUSY = {};
function hhBusy(dayKey, minute) { return !!HH_BUSY[dayKey + '@' + minute]; }
function hhTime(min) { return hhPad(Math.floor(min / 60)) + ':' + hhPad(min % 60); }
function hhDays() {
  var out = []; var nowPk = new Date(Date.now() + PKT_OFFSET_H * 3600e3);
  var t = Date.UTC(nowPk.getUTCFullYear(), nowPk.getUTCMonth(), nowPk.getUTCDate());
  for (var i = 1; out.length < DAYS_AHEAD && i < 40; i++) {
    var d = new Date(t + i * 86400e3);
    if (CLOSED.indexOf(d.getUTCDay()) >= 0) continue;
    out.push({ key: d.getUTCFullYear() + '-' + hhPad(d.getUTCMonth() + 1) + '-' + hhPad(d.getUTCDate()), y: d.getUTCFullYear(), m: d.getUTCMonth(), dd: d.getUTCDate(), dow: DOW[d.getUTCDay()], mon: MON[d.getUTCMonth()] });
  }
  return out;
}
function hhSlots(day, dur) {
  var res = [];
  HOURS.forEach(function (b) {
    var end = b[2] * 60 + b[3];
    for (var t = b[0] * 60 + b[1]; t + dur <= end; t += SLOT_STEP) {
      var free = true;
      for (var u = t; u < t + dur; u += 30) { if (hhBusy(day.key, u)) free = false; }
      res.push({ min: t, free: free });
    }
  });
  return res;
}
function hhUtc(day, min) { return Date.UTC(day.y, day.m, day.dd, 0, min) - PKT_OFFSET_H * 3600e3; }
function hhLocalNote(day, min) {
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === 'Asia/Karachi') return '';
    var f = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz });
    return 'That is ' + f.format(new Date(hhUtc(day, min))) + ' your time (' + tz.replace(/_/g, ' ') + ').';
  } catch (e) { return ''; }
}
function hhGcal(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

class Page extends View {
  componentDidMount() {
    var pref = this._store('hh_pref', null);
    if (pref === 30 || pref === 60) this.setState({ duration: pref });
  }
  _set(patch) { this.setState(patch); }
  _errors(st, s) {
    var e = {};
    if (st === 1) { if (!s.duration || !s.platform) e.e1 = 'Choose a call length and an app to continue.'; }
    if (st === 2) { if (!s.dayKey) e.e2 = 'Choose a day.'; else if (s.slot == null) e.e2 = 'Choose a start time.'; }
    if (st === 3) {
      var plat = PLATFORMS.filter(function (p) { return p.id === s.platform; })[0] || {};
      if (!s.name || s.name.trim().length < 2) e.eName = 'Please enter your name.';
      var digits = (s.phone || '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) e.ePhone = plat.id === 'whatsapp' ? 'Enter the WhatsApp number Haroon should call, e.g. +92 300 1234567.' : 'Enter a valid phone number.';
      var em = (s.email || '').trim();
      if (plat.needsEmail && !em) e.eEmail = 'We need your email to send the ' + plat.name + ' link.';
      else if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.eEmail = 'That email doesn’t look right.';
      if (!s.consent) e.eConsent = 'Please confirm to continue.';
    }
    if (st === 4) { if (!s.pay) e.e4 = 'Choose how you’d like to pay.'; }
    return e;
  }
  render() {
    var self = this; var s = Object.assign({ step: 1, topic: 'Fertility', name: '', phone: '', email: '', notes: '', consent: false }, this.state || {});
    var step = s.step; var dur = s.duration || null; var plan = dur ? PLANS[dur] : null;
    var plat = PLATFORMS.filter(function (p) { return p.id === s.platform; })[0] || null;
    var days = hhDays(); var day = days.filter(function (d) { return d.key === s.dayKey; })[0] || null;
    var slots = (day && dur) ? hhSlots(day, dur) : [];
    var err = s.tried && s.tried[step] ? this._errors(step, s) : {};
    var tried = function () { var t = Object.assign({}, s.tried || {}); t[step] = true; return t; };
    var go = function (n) { self._set({ step: n }); };
    var when = (day && s.slot != null) ? day.dow + ' ' + day.dd + ' ' + day.mon + ', ' + hhTime(s.slot) + '–' + hhTime(s.slot + (dur || 0)) : '—';
    var total = plan ? hhPkr(plan.price) : 'PKR 0';
    var payObj = PAYMENTS.filter(function (p) { return p.id === s.pay; })[0];

    var calUrl = '#';
    if (day && s.slot != null && dur) {
      var st0 = new Date(hhUtc(day, s.slot)), en0 = new Date(hhUtc(day, s.slot) + dur * 60e3);
      calUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Consultation with Haroon Ur Rasheed (' + (plat ? plat.name : '') + ')') + '&dates=' + hhGcal(st0) + '/' + hhGcal(en0) + '&details=' + encodeURIComponent('Heal & Herbs booking ' + (s.ref || '') + '. ' + (plat && plat.id === 'whatsapp' ? 'Haroon will call your WhatsApp number.' : 'Join with the link in your confirmation email.'));
    }
    var nextSteps = !plat ? '' : !HH_CONFIG.paymentsLive ? 'Next: we confirm your time and share payment details. ' + (plat.id === 'whatsapp' ? 'At the booked time Haroon calls you on WhatsApp at ' + s.phone + '.' : 'Once paid, your ' + plat.name + ' link is emailed to ' + s.email + '.') : plat.id === 'whatsapp'
      ? 'Keep WhatsApp open at the booked time — Haroon will call you on ' + s.phone + '. If you miss the call, he will message you to reconnect.'
      : 'Your ' + plat.name + ' link will be emailed to ' + s.email + ' and sent on WhatsApp 1 hour before the call. Test your camera and microphone beforehand.';

    var vals = {
      notDone: !s.done, done: !!s.done,
      s1: step === 1, s2: step === 2, s3: step === 3, s4: step === 4,
      stepNo: step, stepLabel: STEPS[step - 1],
      steps: STEPS.map(function (l, i) { return { n: i + 1, label: l, cls: i + 1 <= step ? 'on' : '', current: i + 1 === step ? 'step' : 'false' }; }),
      plans: [30, 60].map(function (k) { var p = PLANS[k]; var on = dur === k; return { label: p.label, price: hhPkr(p.price), blurb: p.blurb, cls: on ? 'opt on' : 'opt', checked: on ? 'true' : 'false', pick: function () { self._set({ duration: k, slot: null }); } }; }),
      platforms: PLATFORMS.map(function (p) { var on = s.platform === p.id; return { name: p.name, desc: p.desc, isMeet: p.id === 'meet', isZoom: p.id === 'zoom', isWa: p.id === 'whatsapp', cls: on ? 'opt on' : 'opt', checked: on ? 'true' : 'false', pick: function () { self._set({ platform: p.id }); } }; }),
      days: days.map(function (d) { var on = s.dayKey === d.key; return { dow: d.dow, dnum: d.dd, mon: d.mon, cls: on ? 'day on' : 'day', checked: on ? 'true' : 'false', pick: function () { self._set({ dayKey: d.key, slot: null }); } }; }),
      slots: slots.map(function (x) { var on = s.slot === x.min; return { label: hhTime(x.min), disabled: !x.free, aria: hhTime(x.min) + (x.free ? '' : ', unavailable'), cls: on ? 'slot on' : 'slot', checked: on ? 'true' : 'false', pick: function () { if (x.free) self._set({ slot: x.min }); } }; }),
      noDay: !day, hasDay: !!day, noSlots: !!day && slots.filter(function (x) { return x.free; }).length === 0, durLabel: plan ? plan.label : '',
      localNote: (day && s.slot != null) ? hhLocalNote(day, s.slot) : '', hasLocal: false,
      name: s.name, phone: s.phone, email: s.email, notes: s.notes, topic: s.topic, consent: !!s.consent,
      phoneLabel: plat && plat.id === 'whatsapp' ? 'WhatsApp number' : 'Phone / WhatsApp',
      emailLabel: plat && plat.needsEmail ? 'Email (for your ' + plat.name + ' link)' : 'Email (optional)',
      onName: function (e) { self._set({ name: e.target.value }); },
      onPhone: function (e) { self._set({ phone: e.target.value }); },
      onEmail: function (e) { self._set({ email: e.target.value }); },
      onNotes: function (e) { self._set({ notes: e.target.value }); },
      onTopic: function (e) { self._set({ topic: e.target.value }); },
      onConsent: function (e) { self._set({ consent: e.target.checked }); },
      payments: PAYMENTS.map(function (p) { var on = s.pay === p.id; return { name: p.name, desc: p.desc, cls: on ? 'opt on' : 'opt', checked: on ? 'true' : 'false', pick: function () { self._set({ pay: p.id }); } }; }),
      sumPlan: plan ? plan.label : '—', sumPlatform: plat ? plat.name : '—', sumWhen: when, total: total,
      payName: payObj ? payObj.name : '', ref: s.ref || '', firstName: (s.name || '').trim().split(' ')[0],
      hp: s.hp || '', onHp: function (e) { self._set({ hp: e.target.value }); }, sending: !!s.sending,
      payTitle: HH_CONFIG.paymentsLive ? 'Payment' : 'How would you like to pay?',
      payNote: HH_CONFIG.paymentsLive ? 'Your slot is held for 10 minutes while you pay.' : 'Nothing is charged now. Once your time is confirmed, we send payment details for the method you choose. Your booking is final when payment is received.',
      confirmLabel: s.sending ? 'Sending…' : (HH_CONFIG.paymentsLive ? 'Pay ' + total + ' & confirm' : 'Request booking · ' + total),
      doneTitle: HH_CONFIG.paymentsLive ? 'You’re booked, ' + (s.name || '').trim().split(' ')[0] + '.' : 'Request received, ' + (s.name || '').trim().split(' ')[0] + '.',
      doneNote: s.delivered === false ? 'We couldn’t send your request automatically. Please ' + (HH_CONFIG.whatsapp ? 'send it on WhatsApp below' : 'call or WhatsApp the clinic') + ' with this reference.' : HH_CONFIG.paymentsLive ? 'A confirmation is on its way' + (plat && plat.needsEmail ? ' to ' + s.email : ' on WhatsApp') + '.'
        : 'We’ll confirm your time and send payment details within ' + HH_CONFIG.responseTime + (HH_CONFIG.whatsapp ? '. For a faster reply, send your request on WhatsApp too.' : '.'),
      paidLabel: HH_CONFIG.paymentsLive ? 'Paid' : 'To pay',
      hasWa: !!HH_CONFIG.whatsapp && !!s.done,
      waUrl: self._waUrl('Booking request ' + (s.ref || '') + '\n' + (plan ? plan.label : '') + ' on ' + (plat ? plat.name : '') + '\n' + when + ' (PKT)\nName: ' + (s.name || '') + '\nPhone: ' + (s.phone || '') + '\nPayment: ' + (payObj ? payObj.name : '')),
      sentTo: plat && plat.needsEmail ? ' to ' + s.email : ' on WhatsApp', nextSteps: nextSteps, calUrl: calUrl,
      next: function () {
        var e = self._errors(step, s);
        if (Object.keys(e).length) { self._set({ tried: tried() }); return; }
        go(Math.min(step + 1, 4));
      },
      back: function () { go(Math.max(step - 1, 1)); },
      confirm: function () {
        var e = self._errors(4, s);
        if (Object.keys(e).length) { self._set({ tried: tried() }); return; }
        var ref = 'HH-' + Date.now().toString(36).toUpperCase().slice(-6);
        var payload = { ref: ref, duration: dur, price: plan.price, platform: plat.name, date: day.key, time: hhTime(s.slot), timezone: 'Asia/Karachi',
          name: s.name.trim(), phone: s.phone.trim(), email: (s.email || '').trim(), topic: s.topic, notes: s.notes, payment: payObj ? payObj.name : '', hp: s.hp || '' };
        self._set({ sending: true });
        // With a gateway connected (HH_CONFIG.paymentsLive), redirect to it here and confirm on its callback.
        self._submit('booking', payload).then(function (ok) {
          self._set({ sending: false, done: true, ref: ref, delivered: ok });
          self._put('hh_pref', null);
          try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
        });
      },
      restart: function () { self.setState({ step: 1, done: false, slot: null, dayKey: null, ref: null, tried: {} }); }
    };
    vals.hasLocal = !!vals.localNote;
    ['e1', 'e2', 'eName', 'ePhone', 'eEmail', 'eConsent', 'e4'].forEach(function (k) { vals[k] = err[k] || ''; vals['has' + k.charAt(0).toUpperCase() + k.slice(1)] = !!err[k]; });
    return Object.assign(this._base(), vals);
  }
}

Object.assign(Page.prototype, HH_MIXIN);
View.mount(Page);
