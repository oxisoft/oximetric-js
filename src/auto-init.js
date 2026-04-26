// Drop-in <script> bootstrap.
//
// Reads configuration from data-* attributes on the script tag and
// initializes the SDK automatically. This entry exists only in the IIFE
// build (oximetric.min.js) so the ESM build remains side-effect free.
//
// <script defer
//   src="https://cdn.jsdelivr.net/npm/oximetric/dist/oximetric.min.js"
//   data-server="https://analytics.example.com"
//   data-token="pk_xxx..."
//   data-auto-track="pageviews,outbound,downloads,forms"
//   data-consent="granted"
//   data-storage="auto"
//   data-cookie-domain="auto"
//   data-log-level="warn"></script>

import { OxiMetric } from './index.js';
import { isBrowser, parseBool, parseList } from './utils.js';

function findScript() {
  if (!isBrowser()) return null;
  // currentScript only works during initial script execution, not after.
  if (document.currentScript) return document.currentScript;
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const s = scripts[i];
    if (s.dataset && s.dataset.server && s.dataset.token) return s;
  }
  return null;
}

function buildAutoTrack(csv) {
  const all = { pageviews: true, outboundLinks: true, downloads: true, forms: true };
  if (csv == null || csv === '') return all;
  if (csv === 'none' || csv === 'false' || csv === 'off') {
    return { pageviews: false, outboundLinks: false, downloads: false, forms: false };
  }
  const parts = parseList(csv);
  return {
    pageviews:     parts.includes('pageviews') || parts.includes('pageview'),
    outboundLinks: parts.includes('outbound')  || parts.includes('outbound-links'),
    downloads:     parts.includes('downloads'),
    forms:         parts.includes('forms')     || parts.includes('form'),
  };
}

function bootstrap() {
  const script = findScript();
  if (!script) return;
  const ds = script.dataset || {};
  if (!ds.server || !ds.token) return;

  const opts = {
    serverUrl: ds.server,
    token: ds.token,
    consent: ds.consent || 'granted',
    storage: ds.storage || 'auto',
    respectDoNotTrack: parseBool(ds.respectDoNotTrack, false),
    logLevel: ds.logLevel || 'warn',
  };
  if (ds.cookieDomain) opts.cookieDomain = ds.cookieDomain;
  if (ds.flushInterval) {
    const n = parseInt(ds.flushInterval, 10);
    if (Number.isFinite(n) && n > 0) opts.flushInterval = n;
  }
  if (ds.autoTrack != null) {
    opts.autoTrack = buildAutoTrack(ds.autoTrack);
  }

  // Expose API as a global *before* init resolves so callers can queue calls.
  if (typeof window !== 'undefined') {
    window.oximetric = OxiMetric;
    window.OxiMetric = OxiMetric;
  }

  OxiMetric.init(opts).catch(err => {
    if (typeof console !== 'undefined') console.error('[oximetric] init failed', err);
  });
}

if (isBrowser()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
}

export { OxiMetric };
export default OxiMetric;
