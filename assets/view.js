/*
 * Heal & Herbs — tiny view layer.
 *
 * Each page ships its markup in <template id="view">. Text and attributes use
 * {{path}} holes, <hh-if value="{{flag}}"> renders conditionally and
 * <hh-for list="{{items}}" as="item"> repeats. Event attributes such as
 * onclick="{{handler}}" bind to functions returned by the page's render().
 *
 * A page script defines `class Page extends View` with a render() method that
 * returns the values for the template. setState() re-renders.
 */
(function () {
  'use strict';

  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var ANY = /\{\{\s*([^}]+?)\s*\}\}/g;
  var BOOL = { disabled: 1, checked: 1, selected: 1, hidden: 1, required: 1, open: 1 };
  var TEXT_INPUTS = { text: 1, email: 1, tel: 1, search: 1, password: 1, number: 1, url: 1 };

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interpolate(str, scope) {
    return str.replace(ANY, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function renderChildren(node, scope, out) {
    for (var c = node.firstChild; c; c = c.nextSibling) renderNode(c, scope, out);
  }

  function renderNode(n, scope, out) {
    if (n.nodeType === 3) {
      var t = n.nodeValue;
      out.appendChild(document.createTextNode(t.indexOf('{{') < 0 ? t : interpolate(t, scope)));
      return;
    }
    if (n.nodeType !== 1) return;
    var tag = n.localName;

    if (tag === 'hh-if') {
      var m = WHOLE.exec(n.getAttribute('value') || '');
      if (m && lookup(scope, m[1])) renderChildren(n, scope, out);
      return;
    }
    if (tag === 'hh-for') {
      var lm = WHOLE.exec(n.getAttribute('list') || '');
      var list = lm ? lookup(scope, lm[1]) : null;
      var as = n.getAttribute('as') || 'item';
      (list || []).forEach(function (item, i) {
        var s = Object.create(scope);
        s[as] = item;
        s.$index = i;
        renderChildren(n, s, out);
      });
      return;
    }

    var el = document.createElementNS(n.namespaceURI, tag);
    var pendingValue;
    var inputType = (n.getAttribute('type') || 'text').toLowerCase();

    for (var i = 0; i < n.attributes.length; i++) {
      var name = n.attributes[i].name;
      var raw = n.attributes[i].value;
      var whole = WHOLE.exec(raw);

      if (name.slice(0, 2) === 'on' && whole) {
        var fn = lookup(scope, whole[1]);
        if (typeof fn === 'function') {
          var ev = name.slice(2);
          if (ev === 'change' && (tag === 'textarea' || (tag === 'input' && TEXT_INPUTS[inputType]))) ev = 'input';
          el.addEventListener(ev, fn);
        }
        continue;
      }

      var value = whole ? lookup(scope, whole[1]) : (raw.indexOf('{{') >= 0 ? interpolate(raw, scope) : raw);

      if (BOOL[name] && whole) {
        if (value) el.setAttribute(name, '');
        if (name in el) el[name] = !!value;
        continue;
      }
      if (name === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
        pendingValue = value == null ? '' : String(value);
        continue;
      }
      if (value === false || value == null) continue;
      el.setAttribute(name, String(value));
    }

    renderChildren(tag === 'template' ? n.content : n, scope, el);
    if (pendingValue !== undefined) el.value = pendingValue;
    out.appendChild(el);
  }

  function View(props) {
    this.props = props || {};
    this.state = {};
  }
  View.prototype.setState = function (patch) {
    if (typeof patch === 'function') patch = patch(this.state);
    this.state = Object.assign({}, this.state, patch);
    this._schedule();
  };
  View.prototype.forceUpdate = function () { this._schedule(); };
  View.prototype._schedule = function () {
    var self = this;
    if (self._queued) return;
    self._queued = true;
    Promise.resolve().then(function () { self._queued = false; self._paint(); });
  };
  View.prototype._paint = function () {
    var active = document.activeElement;
    var id = active && active.id;
    var start = null, end = null;
    try { start = active.selectionStart; end = active.selectionEnd; } catch (e) {}

    var frag = document.createDocumentFragment();
    renderChildren(this._tpl.content, this.render(), frag);
    this._root.replaceChildren(frag);

    if (id) {
      var again = document.getElementById(id);
      if (again && again !== document.activeElement) {
        again.focus({ preventScroll: true });
        try { if (start != null) again.setSelectionRange(start, end); } catch (e) {}
      }
    }
  };
  View.mount = function (PageClass) {
    var tpl = document.getElementById('view');
    var root = document.getElementById('app');
    var page = new PageClass({});
    page._tpl = tpl;
    page._root = root;
    page._paint();
    document.documentElement.classList.add('is-live');
    if (typeof page.componentDidMount === 'function') page.componentDidMount();
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
    return page;
  };

  window.View = View;
})();
