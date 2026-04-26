// Optional automatic tracking for browser pages.
// Each tracker is independent and can be toggled via config.autoTrack.

import { isBrowser } from './utils.js';

export class AutoTracker {
  constructor(core) {
    this.core = core;
    this._cleanups = [];
    this._lastPath = '';
    this._extensions = new Set((core.config.downloadExtensions || []).map(s => s.toLowerCase()));
  }

  start() {
    if (!isBrowser()) return;
    const opts = this.core.config.autoTrack || {};
    if (opts.pageviews) this._startPageviews();
    if (opts.outboundLinks || opts.downloads) this._startLinkClicks(!!opts.outboundLinks, !!opts.downloads);
    if (opts.forms) this._startForms();
  }

  stop() {
    while (this._cleanups.length) {
      const c = this._cleanups.pop();
      try { c(); } catch { /* ignore */ }
    }
  }

  _add(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  // --- Pageviews ---

  _startPageviews() {
    this._sendPageview();
    this._lastPath = location.pathname + location.search + location.hash;

    const onChange = () => {
      const cur = location.pathname + location.search + location.hash;
      if (cur === this._lastPath) return;
      this._lastPath = cur;
      this._sendPageview();
    };

    // popstate covers Back/Forward in SPAs
    this._add(window, 'popstate', onChange);
    this._add(window, 'hashchange', onChange);

    // Wrap pushState/replaceState so SPA navigations dispatch a synthetic event
    const wrap = (name) => {
      const orig = history[name];
      if (typeof orig !== 'function' || orig.__oxi_wrapped__) return;
      const wrapped = function (...args) {
        const r = orig.apply(this, args);
        try { window.dispatchEvent(new Event('oxi:locationchange')); } catch { /* ignore */ }
        return r;
      };
      wrapped.__oxi_wrapped__ = true;
      history[name] = wrapped;
      this._cleanups.push(() => { if (history[name] === wrapped) history[name] = orig; });
    };
    wrap.call(this, 'pushState');
    wrap.call(this, 'replaceState');
    this._add(window, 'oxi:locationchange', onChange);
  }

  _sendPageview() {
    const props = {
      url: location.href,
      path: location.pathname,
      title: document.title || '',
    };
    if (document.referrer) props.referrer = document.referrer;
    if (location.search) props.query = location.search;
    if (location.hash) props.hash = location.hash;
    this.core.enqueue('pageview', props);
  }

  // --- Outbound link + download clicks ---

  _startLinkClicks(outbound, downloads) {
    const handler = (e) => {
      // resolve the clicked anchor (handles nested elements inside <a>)
      const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let url;
      try { url = new URL(href, location.href); } catch { return; }
      const isDownload = a.hasAttribute('download') || this._isDownloadExtension(url.pathname);
      const isOutbound = url.host && url.host !== location.host;

      if (isDownload && downloads) {
        this.core.enqueue('download', {
          url: url.href,
          path: url.pathname,
          host: url.host,
          extension: this._extensionOf(url.pathname),
          target: a.getAttribute('target') || '',
        });
      } else if (isOutbound && outbound) {
        this.core.enqueue('outbound_link', {
          url: url.href,
          host: url.host,
          target: a.getAttribute('target') || '',
        });
      }
    };
    this._add(document, 'click', handler, { capture: true });
    // auxclick covers middle-click "open in new tab"
    this._add(document, 'auxclick', handler, { capture: true });
  }

  _extensionOf(path) {
    const m = /\.([a-z0-9]+)(?:$|\?|#)/i.exec(path);
    return m ? m[1].toLowerCase() : '';
  }

  _isDownloadExtension(path) {
    const ext = this._extensionOf(path);
    return ext && this._extensions.has(ext);
  }

  // --- Form submissions ---

  _startForms() {
    const handler = (e) => {
      const f = e.target;
      if (!f || f.tagName !== 'FORM') return;
      this.core.enqueue('form_submit', {
        id: f.id || '',
        name: f.getAttribute('name') || '',
        action: f.getAttribute('action') || '',
        method: (f.getAttribute('method') || 'GET').toUpperCase(),
      });
    };
    this._add(document, 'submit', handler, { capture: true });
  }
}
