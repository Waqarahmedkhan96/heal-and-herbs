class Page extends View {
  render() {
    var self = this; var s = Object.assign({ name: '', reach: '', msg: '' }, this.state || {});
    var bad = !s.name.trim() || !s.reach.trim() || !s.msg.trim();
    return Object.assign(this._base(), {
      name: s.name, reach: s.reach, msg: s.msg, sent: !!s.sent, notSent: !s.sent, hasErr: !!s.tried && bad,
      firstName: s.name.trim().split(' ')[0],
      onName: function (e) { self.setState({ name: e.target.value }); },
      onReach: function (e) { self.setState({ reach: e.target.value }); },
      onMsg: function (e) { self.setState({ msg: e.target.value }); },
      send: function () { if (bad) { self.setState({ tried: true }); return; } self.setState({ sent: true }); }
    });
  }
}
Object.assign(Page.prototype, HH_MIXIN);
View.mount(Page);
