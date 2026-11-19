var HH_FAQS = [["How do online consultations work?", "Choose 30 or 60 minutes, pick Google Meet, Zoom or WhatsApp, then a time. After payment you get a confirmation; for Meet and Zoom the link is emailed to you, and for WhatsApp Haroon calls your number at the booked time."], ["What do consultations cost?", "30 minutes is PKR 4,999 and 60 minutes is PKR 9,999. A first visit is usually best as 60 minutes, so there is time for a full history."], ["Can couples book together?", "Yes. For fertility consultations Haroon often prefers to speak with both partners. Book one 60-minute call and join from the same device."], ["How can I pay?", "Consultations: debit or credit card, JazzCash, Easypaisa or bank transfer. Orders: the same, plus cash on delivery."], ["Do you deliver across Pakistan?", "Yes, to all major cities and most towns, usually in 2–4 working days. Delivery is free on orders over PKR 5,000."], ["Are the formulations a replacement for my medicine?", "No. They draw on traditional Unani practice and are not intended to diagnose, treat, cure or prevent any disease. Keep taking anything your doctor has prescribed, and ask first if you are pregnant, breastfeeding or on regular medication."]];
var HH_FILTERS = [{ id: 'all', label: 'All' }, { id: 'blends', label: 'Daily blends' }, { id: 'sets', label: 'Sets' }, { id: 'teas', label: 'Teas & powders' }];
class Page extends View {
  render() {
    var self = this; var s = this.state || {}; var filter = s.filter || 'all'; var open = s.faq == null ? 0 : s.faq;
    return Object.assign(this._base(), {
      products: this._products(filter),
      filters: HH_FILTERS.map(function (f) { var on = f.id === filter; return { label: f.label, sel: on ? 'true' : 'false', cls: on ? 'fchip on' : 'fchip', pick: function () { self.setState({ filter: f.id }); } }; }),
      faqs: HH_FAQS.map(function (x, i) { var on = open === i; return { q: x[0], a: x[1], open: on, exp: on ? 'true' : 'false', sign: on ? '−' : '+', toggle: function () { self.setState({ faq: on ? -1 : i }); } }; }),
      pick30: function () { self._put('hh_pref', 30); },
      pick60: function () { self._put('hh_pref', 60); }
    });
  }
}
Object.assign(Page.prototype, HH_MIXIN);
View.mount(Page);
