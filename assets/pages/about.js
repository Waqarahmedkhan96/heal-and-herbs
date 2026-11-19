class Page extends View {
  render() { return this._base(); }
}
Object.assign(Page.prototype, HH_MIXIN);
View.mount(Page);
