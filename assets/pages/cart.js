var SHIP_FLAT = 250;       // sample delivery fee, PKR
var FREE_SHIP_OVER = 5000; // sample free-delivery threshold, PKR
var COD_FEE = 0;           // sample cash-on-delivery fee, PKR
var DEMO_CART = { fennel: 1, golden: 1 };
var PAYMENTS = [
  { id: 'cod', name: 'Cash on delivery', desc: 'Pay the rider in cash' },
  { id: 'card', name: 'Debit / credit card', desc: 'Visa, Mastercard, UnionPay' },
  { id: 'jazzcash', name: 'JazzCash', desc: 'Mobile wallet' },
  { id: 'easypaisa', name: 'Easypaisa', desc: 'Mobile wallet' }
];
class Page extends View {
  _cart() { var c = this._store('hh_cart', null); return c === null ? Object.assign({}, DEMO_CART) : c; }
  _setQty(id, q) { var c = this._cart(); if (q <= 0) delete c[id]; else c[id] = Math.min(q, 50); this._put('hh_cart', c); this.forceUpdate(); }
  _errors(s) {
    var e = {};
    if (!s.name || s.name.trim().length < 2) e.eName = 'Please enter your name.';
    var digits = (s.phone || '').replace(/\D/g, ''); if (digits.length < 10 || digits.length > 13) e.ePhone = 'Enter a valid mobile number.';
    if (!s.address || s.address.trim().length < 8) e.eAddr = 'Please enter your full address.';
    return e;
  }
  render() {
    var self = this; var s = Object.assign({ name: '', phone: '', email: '', city: 'Karachi', address: '', pay: 'cod' }, this.state || {});
    var cart = this._cart(); var count = 0; var subtotal = 0;
    var items = Object.keys(cart).filter(function (k) { return HH_PRODUCTS[k] && cart[k] > 0; }).map(function (k) {
      var p = HH_PRODUCTS[k]; var q = Number(cart[k]); count += q; subtotal += p.price * q;
      return { name: p.name, tileCls: 'tile t-' + k, img: p.img, href: p.href, qty: q, unit: hhPkr(p.price), line: hhPkr(p.price * q),
        inc: function () { self._setQty(k, q + 1); }, dec: function () { self._setQty(k, q - 1); }, remove: function () { self._setQty(k, 0); } };
    });
    var shipping = subtotal === 0 || subtotal >= FREE_SHIP_OVER ? 0 : SHIP_FLAT;
    var cod = s.pay === 'cod' ? COD_FEE : 0;
    var total = subtotal + shipping + cod;
    var err = s.tried ? this._errors(s) : {};
    var payObj = PAYMENTS.filter(function (p) { return p.id === s.pay; })[0];
    var base = this._base(); base.cartCount = count; base.hasCart = count > 0;
    return Object.assign(base, {
      placed: !!s.placed, notPlaced: !s.placed, empty: items.length === 0, hasItems: items.length > 0,
      items: items, count: count, subtotal: hhPkr(subtotal), shipping: shipping === 0 ? 'Free' : hhPkr(shipping), total: hhPkr(total),
      isCod: s.pay === 'cod' && COD_FEE > 0, codFee: hhPkr(COD_FEE),
      showFreeShip: subtotal > 0, shipNote: subtotal >= FREE_SHIP_OVER ? 'You’ve unlocked free delivery.' : 'Add ' + hhPkr(FREE_SHIP_OVER - subtotal) + ' more for free delivery.',
      name: s.name, phone: s.phone, email: s.email, city: s.city, address: s.address,
      onName: function (e) { self.setState({ name: e.target.value }); }, onPhone: function (e) { self.setState({ phone: e.target.value }); },
      onEmail: function (e) { self.setState({ email: e.target.value }); }, onCity: function (e) { self.setState({ city: e.target.value }); },
      onAddr: function (e) { self.setState({ address: e.target.value }); },
      eName: err.eName || '', hasEName: !!err.eName, ePhone: err.ePhone || '', hasEPhone: !!err.ePhone, eAddr: err.eAddr || '', hasEAddr: !!err.eAddr,
      hasErrors: Object.keys(err).length > 0,
      payments: PAYMENTS.map(function (p) { var on = s.pay === p.id; return { name: p.name, desc: p.desc, cls: on ? 'opt on' : 'opt', checked: on ? 'true' : 'false', pick: function () { self.setState({ pay: p.id }); } }; }),
      placeLabel: s.pay === 'cod' ? 'Place order · ' + hhPkr(total) : 'Pay ' + hhPkr(total) + ' with ' + (payObj ? payObj.name : ''),
      place: function () {
        if (Object.keys(self._errors(s)).length) { self.setState({ tried: true }); return; }
        // Production: POST the order, then redirect to the payment gateway for non-COD methods.
        var ref = 'HHO-' + Date.now().toString(36).toUpperCase().slice(-6);
        var t = hhPkr(total);
        self._put('hh_cart', {});
        self.setState({ placed: true, ref: ref, orderTotal: t });
      },
      ref: s.ref || '', orderTotal: s.orderTotal || '', receiptTo: s.email ? ' and email ' + s.email : ''
    });
  }
}

Object.assign(Page.prototype, HH_MIXIN);
View.mount(Page);
