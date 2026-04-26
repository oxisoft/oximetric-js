// Public API for Oximetric — the lightweight visitor analytics SDK
// for the self-hosted Oximetric server.
//
// ESM entry. Import { OxiMetric } and call OxiMetric.init({ ... }).
// For drop-in script-tag usage, see auto-init.js.

import { Core } from './core.js';
import { AutoTracker } from './auto-track.js';
import { SDK_VERSION } from './config.js';
import { isBrowser } from './utils.js';

// Single shared instance — analytics SDKs are singletons by convention.
const _core = new Core();
let _auto = null;

export const OxiMetric = {
  /**
   * Initialize the SDK.
   *
   * @param {object} options
   * @param {string} options.serverUrl    e.g. "https://analytics.example.com"
   * @param {string} options.token        Project token from your Oximetric console.
   *                                      The token's allowed_origins must include
   *                                      this site's origin for browser use.
   * @param {string} [options.consent]    'granted' (default) or 'required'.
   *                                      'required' = SDK waits for optIn().
   * @param {boolean} [options.respectDoNotTrack]  Honour the DNT header.
   * @param {object}  [options.autoTrack] Per-feature toggles, see DEFAULTS.
   * @param {string}  [options.storage]   'auto' | 'localStorage' | 'cookie' | 'memory' | 'none'
   * @param {string}  [options.cookieDomain] 'auto' | 'host' | explicit '.example.com'
   * @param {number}  [options.flushInterval] ms; default 5000.
   * @param {string}  [options.logLevel] 'silent' | 'error' | 'warn' | 'info' | 'debug'
   */
  async init(options) {
    await _core.init(options);
    if (isBrowser()) {
      _auto = new AutoTracker(_core);
      if (_core.hasConsent && _core.isEnabled) _auto.start();
    }
    return this;
  },

  /**
   * Track a custom event.
   * @param {string} name
   * @param {object} [properties]  string|number|boolean|Date values are auto-typed.
   */
  track(name, properties) {
    _core.enqueue(name, properties);
  },

  /**
   * Convenience: track a manual pageview.
   * Useful when you disable auto pageviews and call this from your router.
   */
  pageview(properties) {
    const base = isBrowser()
      ? { url: location.href, path: location.pathname, title: document.title || '' }
      : {};
    _core.enqueue('pageview', { ...base, ...(properties || {}) });
  },

  /**
   * Identify the current visitor by an opaque identifier (email, user id, ...).
   * The value is SHA-256 hashed before transport — the raw value never leaves
   * the device.
   */
  identify(identifier) {
    return _core.identify(identifier);
  },

  /**
   * Forget the identified user without dropping the device id.
   * Call this on logout.
   */
  reset() {
    _core.reset();
  },

  /**
   * Send any queued events immediately.
   * Returns when the flush completes.
   */
  flush() {
    return _core.flush();
  },

  /**
   * Grant tracking consent. If init was called with consent:'required'
   * this starts the timers, registers the device, and starts auto-tracking.
   */
  optIn() {
    _core.optIn();
    if (isBrowser() && _auto && _core.hasConsent && _core.isEnabled) _auto.start();
  },

  /**
   * Revoke tracking consent. Stops timers, drops queued events, halts auto-tracking.
   */
  optOut() {
    if (_auto) _auto.stop();
    _core.optOut();
  },

  /** Stop everything. After shutdown(), init() can be called again. */
  shutdown() {
    if (_auto) { _auto.stop(); _auto = null; }
    _core.shutdown();
  },

  /** Read accessors. */
  get deviceId()      { return _core.deviceId; },
  get userId()        { return _core.userId; },
  get isInitialized() { return _core.isInitialized; },
  get isEnabled()     { return _core.isEnabled; },
  get hasConsent()    { return _core.hasConsent; },
  get version()       { return SDK_VERSION; },
};

export default OxiMetric;
