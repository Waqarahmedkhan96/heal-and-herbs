/* Heal & Herbs — shared data and helpers */
// Site settings — edit these before launch.
var HH_CONFIG = {
  paymentsLive: false,        // true once a payment gateway is connected
  whatsapp: '',               // clinic WhatsApp in international format, digits only, e.g. '923001234567'
  submitUrl: '/api/submit',   // receives bookings, orders and messages
  responseTime: '24 hours'
};
var HH_PRODUCTS = {"cedar": {"name": "Cedar", "sub": "Men’s blend · 60 capsules", "price": 3499, "img": "/images/products/cedar.webp", "href": "/cedar", "urdu": "دیودار", "tile": "#DCE4D4", "tag": "For men", "cat": "blends", "ticks": ["Formulated by Haroon", "Daily capsule routine", "Full ingredients on pack"]}, "meher": {"name": "Meher", "sub": "Women’s blend · 60 capsules", "price": 3499, "img": "/images/products/meher.webp", "href": "/meher", "urdu": "مہر", "tile": "#F2E2D6", "tag": "For women", "cat": "blends", "ticks": ["Formulated by Haroon", "Daily capsule routine", "Full ingredients on pack"]}, "saath": {"name": "Saath Duo Set", "sub": "Cedar + Meher gift box", "price": 6499, "was": 6998, "img": "/images/products/saath.webp", "href": "/saath", "urdu": "ساتھ", "tile": "#EFE7D8", "tag": "Best value", "cat": "sets", "ticks": ["One Cedar + one Meher", "For couples, side by side", "Gift-ready box"]}, "fennel": {"name": "Fennel & Rose", "sub": "Herbal infusion · 100 g tin", "price": 1450, "img": "/images/products/fennel.webp", "href": "/fennel-rose", "urdu": "سونف، گلاب", "tile": "#F0E8DA", "tag": "Caffeine-free", "cat": "teas", "ticks": ["Fennel seed & Damask rose", "After-meal infusion", "Loose blend tin"]}, "golden": {"name": "Golden Root", "sub": "Turmeric & ginger · 150 g jar", "price": 1850, "img": "/images/products/golden.webp", "href": "/golden-root", "urdu": "ہلدی، ادرک", "tile": "#F4E5D2", "tag": "Kitchen staple", "cat": "teas", "ticks": ["Turmeric & ginger root", "For warm milk or cooking", "Fine powder"]}, "mint": {"name": "Mint Garden", "sub": "Peppermint tea · 20 sachets", "price": 1250, "img": "/images/products/mint.webp", "href": "/mint-garden", "urdu": "پودینہ", "tile": "#E3EADC", "tag": "Sachets", "cat": "teas", "ticks": ["Whole-leaf peppermint", "Caffeine-free", "Easy single sachets"]}};
function hhPkr(n) { return 'PKR ' + Number(n || 0).toLocaleString('en-US'); }
function hhPad(n) { return (n < 10 ? '0' : '') + n; }
var HH_MIXIN = {
  _store: function (k, d) {
    try { var v = window.localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
    catch (e) { return (this._mem && Object.prototype.hasOwnProperty.call(this._mem, k)) ? this._mem[k] : d; }
  },
  _put: function (k, v) {
    this._mem = this._mem || {}; this._mem[k] = v;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  },
  _base: function () {
    var s = this.state || {}; var open = !!s.menuOpen; var self = this;
    var cart = this._store('hh_cart', {}) || {}; var count = 0;
    Object.keys(cart).forEach(function (k) { count += Number(cart[k]) || 0; });
    var nl = s.nlEmail || ''; var nlOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nl.trim());
    return { menuOpen: open, menuState: open ? 'true' : 'false', toggleMenu: function () { self.setState({ menuOpen: !open }); }, cartCount: count, hasCart: count > 0,
      nlEmail: nl, nlDone: !!s.nlDone, nlOpen: !s.nlDone, nlBad: !!s.nlTried && !nlOk,
      onNl: function (e) { self.setState({ nlEmail: e.target.value }); },
      nlSubmit: function () { if (!nlOk) { self.setState({ nlTried: true }); return; } self.setState({ nlDone: true }); } };
  },
  _submit: function (kind, data) {
    try {
      return fetch(HH_CONFIG.submitUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: kind, data: data }), keepalive: true })
        .then(function (r) { return r.ok; }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  },
  _waUrl: function (text) {
    return HH_CONFIG.whatsapp ? 'https://wa.me/' + HH_CONFIG.whatsapp + '?text=' + encodeURIComponent(text) : '';
  },
  _addToCart: function (id, q) {
    var c = this._store('hh_cart', {}) || {};
    c[id] = Math.min((Number(c[id]) || 0) + (q || 1), 50);
    this._put('hh_cart', c);
  },
  _products: function (filter) {
    var self = this; var s = this.state || {};
    return Object.keys(HH_PRODUCTS).filter(function (k) { return !filter || filter === 'all' || HH_PRODUCTS[k].cat === filter; }).map(function (k) {
      var p = HH_PRODUCTS[k]; var just = s.justAdded === k;
      return { id: k, name: p.name, sub: p.sub.split(' · ')[0], img: p.img, href: p.href, tag: p.tag, tileCls: 'tile t-' + k,
        ticks: p.ticks.map(function (t) { return { t: t }; }), price: hhPkr(p.price), hasWas: !!p.was, was: p.was ? hhPkr(p.was) : '',
        saveLbl: p.was ? 'Save ' + hhPkr(p.was - p.price) : '', addLbl: just ? 'Added ✓' : 'Add to basket', addCls: just ? 'add done' : 'add',
        addAria: 'Add ' + p.name + ' to basket',
        add: function () { self._addToCart(k, 1); self.setState({ justAdded: k }); clearTimeout(self._t); self._t = setTimeout(function () { self.setState({ justAdded: null }); }, 1800); } };
    });
  }
};
