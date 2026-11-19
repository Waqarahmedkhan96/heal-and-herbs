class Page extends View {
  render() {
    var self = this; var s = this.state || {}; var qty = s.qty || 1; var ID = 'meher'; var P = HH_PRODUCTS[ID];
    return Object.assign(this._base(), {
      products: this._products('all').filter(function (x) { return x.id !== ID; }).slice(0, 3),
      qty: qty, lineTotal: hhPkr(P.price * qty), added: !!s.added, addedQty: s.addedQty || 0,
      inc: function () { self.setState({ qty: Math.min(qty + 1, 20) }); },
      dec: function () { self.setState({ qty: Math.max(qty - 1, 1) }); },
      add: function () { self._addToCart(ID, qty); self.setState({ added: true, addedQty: qty, qty: 1 }); }
    });
  }
}
Object.assign(Page.prototype, HH_MIXIN);
View.mount(Page);
