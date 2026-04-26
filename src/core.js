// Core engine: queue, flush, lifecycle. Stateful single instance.

import { DEFAULTS, STORAGE_KEYS, SDK_PLATFORM, SDK_VERSION } from './config.js';
import { generateId } from './id.js';
import { sha256Hex } from './sha256.js';
import { Storage } from './storage.js';
import { Transport } from './transport.js';
import { detectPlatform } from './platform.js';
import { deepMerge, isBrowser, makeLogger, nowISO, safeCall } from './utils.js';

const MAX_EVENT_NAME = 256;
const MAX_KEY = 128;
const MAX_STRING_VALUE = 4096;
const MAX_PROPS_PER_EVENT = 50;

function typeProperty(value) {
  if (typeof value === 'string') {
    return { type: 'string', value: value.length > MAX_STRING_VALUE ? value.slice(0, MAX_STRING_VALUE) : value };
  }
  if (typeof value === 'boolean') {
    return { type: 'bool', value };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? { type: 'int', value } : { type: 'float', value };
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { type: 'datetime', value: value.toISOString() };
  }
  return null;
}

function buildProperties(props, logger) {
  if (!props || typeof props !== 'object') return undefined;
  const out = {};
  let count = 0;
  for (const key of Object.keys(props)) {
    if (count >= MAX_PROPS_PER_EVENT) {
      logger?.warn(`event has more than ${MAX_PROPS_PER_EVENT} properties; extras dropped`);
      break;
    }
    if (!key || key.length > MAX_KEY) continue;
    const tv = typeProperty(props[key]);
    if (!tv) {
      logger?.debug(`unsupported property type for key "${key}"`);
      continue;
    }
    out[key] = tv;
    count++;
  }
  return Object.keys(out).length ? out : undefined;
}

export class Core {
  constructor() {
    this._initialized = false;
    this._enabled = true;
    this._consentRequired = false;
    this._consentGiven = false;
    this._queue = [];
    this._sending = false;
    this._timer = null;
    this._userId = null;
    this._deviceId = null;
    this._cleanups = [];
  }

  async init(options) {
    if (this._initialized) {
      throw new Error('OxiMetric is already initialized');
    }
    if (!options || typeof options !== 'object') {
      throw new Error('OxiMetric.init requires an options object');
    }
    if (!options.serverUrl) throw new Error('OxiMetric.init: serverUrl is required');
    if (!options.token) throw new Error('OxiMetric.init: token is required');

    this.config = deepMerge(DEFAULTS, options);
    this.logger = makeLogger(this.config.logLevel);

    if (this.config.respectDoNotTrack && isBrowser()) {
      const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
      if (dnt) {
        this.logger.info('Do Not Track is set; SDK is disabled');
        this._enabled = false;
      }
    }

    this._consentRequired = this.config.consent === 'required';
    this._consentGiven = !this._consentRequired;

    this.storage = new Storage({
      mode: this.config.storage,
      cookieDays: this.config.cookieDays,
      cookieDomain: this.config.cookieDomain,
      cookieSameSite: this.config.cookieSameSite,
      cookieSecure: this.config.cookieSecure,
    });

    this._deviceId = this._loadOrCreateDeviceId();

    this.transport = new Transport({
      baseUrl: this.config.serverUrl,
      apiPath: this.config.apiPath,
      token: this.config.token,
      logger: this.logger,
    });

    const cachedUid = this.storage.get(STORAGE_KEYS.userId);
    if (cachedUid) {
      const n = parseInt(cachedUid, 10);
      if (Number.isFinite(n)) this._userId = n;
    }

    this._initialized = true;

    if (this._enabled && this._consentGiven) {
      await this._registerDeviceSafe();
      this._startTimer();
      this._installUnloadHook();
    }
  }

  _loadOrCreateDeviceId() {
    const existing = this.storage.get(STORAGE_KEYS.deviceId);
    if (existing && existing.length >= 8) return existing;
    const id = generateId();
    this.storage.set(STORAGE_KEYS.deviceId, id);
    return id;
  }

  async _registerDeviceSafe() {
    const info = detectPlatform();
    const body = {
      device_id: this._deviceId,
      platform: SDK_PLATFORM,
      os_version: info.osVersion,
      app_version: info.appVersion || `oximetric-js/${SDK_VERSION}`,
      locale: info.locale,
    };
    try {
      const res = await this.transport.post('/device', body);
      if (!res.ok) this.logger.warn('device register failed:', res.status);
    } catch (e) {
      this.logger.debug('device register error', e);
    }
  }

  _startTimer() {
    if (this._timer) return;
    this._timer = setInterval(() => { this.flush().catch(() => {}); }, this.config.flushInterval);
  }

  _stopTimer() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
  }

  _installUnloadHook() {
    if (!isBrowser() || !this.config.flushOnUnload) return;
    const handler = () => { this._flushSync(); };
    const onPageHide = (e) => {
      // pagehide fires reliably on bfcache; persisted=true means tab kept alive
      handler();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') handler();
    };
    window.addEventListener('pagehide', onPageHide, { capture: true });
    document.addEventListener('visibilitychange', onVisibility, { capture: true });
    this._cleanups.push(() => {
      window.removeEventListener('pagehide', onPageHide, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility, { capture: true });
    });
  }

  // --- Public-style ops (called from public API) ---

  enqueue(name, properties) {
    if (!this._initialized) {
      // pre-init buffering is intentional: identical to "consent gate"
      // because consent flag also gates flush.
      this._queue.push({ pending: true, name, properties });
      return;
    }
    if (!this._enabled) return;

    if (!name || typeof name !== 'string' || name.length === 0 || name.length > MAX_EVENT_NAME) {
      this.logger.warn('invalid event name; dropping', name);
      return;
    }

    const ev = {
      id: generateId(),
      name,
      timestamp: nowISO(),
      properties: buildProperties(properties, this.logger),
    };
    if (!ev.properties) delete ev.properties;
    this._queue.push(ev);

    if (this._consentGiven && this._queue.length >= this.config.maxQueueSize) {
      this.flush().catch(() => {});
    }
  }

  async identify(rawIdentifier) {
    if (!this._initialized || !this._enabled) return;
    if (!rawIdentifier || typeof rawIdentifier !== 'string') {
      this.logger.warn('identify: identifier must be a non-empty string');
      return;
    }
    try {
      const hash = await sha256Hex(rawIdentifier);
      const res = await this.transport.post('/identify', {
        device_id: this._deviceId,
        anonymous_id: hash,
      });
      if (!res.ok) {
        this.logger.warn('identify failed:', res.status);
        return;
      }
      const data = await res.json();
      if (data && typeof data.user_id === 'number') {
        this._userId = data.user_id;
        this.storage.set(STORAGE_KEYS.userId, String(data.user_id));
      }
    } catch (e) {
      this.logger.debug('identify error', e);
    }
  }

  reset() {
    this._userId = null;
    this.storage.remove(STORAGE_KEYS.userId);
    // Keep device_id by default; resetting identity ≠ losing device.
  }

  async flush() {
    if (!this._initialized || !this._enabled) return;
    if (!this._consentGiven) return;
    if (this._sending) return;
    if (this._queue.length === 0) return;

    this._sending = true;
    try {
      while (this._queue.length > 0) {
        const batch = this._queue.splice(0, Math.min(this._queue.length, this.config.maxBatchSize));
        await this._sendBatch(batch, false);
      }
    } finally {
      this._sending = false;
    }
  }

  _flushSync() {
    if (!this._initialized || !this._enabled || !this._consentGiven) return;
    if (this._queue.length === 0) return;
    const batch = this._queue.splice(0, this.config.maxBatchSize);
    // keepalive:true allows the request to survive page unload
    this._sendBatch(batch, true).catch(() => {});
  }

  async _sendBatch(events, keepalive) {
    const body = {
      device_id: this._deviceId,
      events,
    };
    if (this._userId != null) body.user_id = this._userId;

    let attempt = 0;
    let delay = this.config.retryBaseDelay;
    while (attempt <= this.config.maxRetries) {
      try {
        const res = await this.transport.post('/track', body, { keepalive });
        if (res.ok) return;
        // 4xx (except 429) — drop, do not retry forever
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          this.logger.warn('track rejected:', res.status);
          return;
        }
        this.logger.debug('track retry', res.status);
      } catch (e) {
        this.logger.debug('track error', e);
      }
      attempt++;
      if (attempt > this.config.maxRetries) break;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
    this.logger.warn('track dropped after retries', events.length);
  }

  // --- Consent ---

  optIn() {
    if (!this._initialized) return;
    if (!this._enabled) this._enabled = true;
    if (this._consentGiven) return;
    this._consentGiven = true;
    safeCall(() => this.storage.set(STORAGE_KEYS.consent, '1'));
    // Promote any pre-init buffered entries to real events
    const pending = this._queue.filter(e => e.pending);
    this._queue = this._queue.filter(e => !e.pending);
    for (const p of pending) this.enqueue(p.name, p.properties);

    this._registerDeviceSafe().then(() => {
      this._startTimer();
      this._installUnloadHook();
      this.flush().catch(() => {});
    });
  }

  optOut() {
    if (!this._initialized) return;
    this._enabled = false;
    this._consentGiven = false;
    this._queue.length = 0;
    this._stopTimer();
    safeCall(() => this.storage.set(STORAGE_KEYS.consent, '0'));
  }

  shutdown() {
    if (!this._initialized) return;
    this._flushSync();
    this._stopTimer();
    for (const c of this._cleanups) safeCall(c);
    this._cleanups = [];
    this._initialized = false;
  }

  // --- Read accessors ---
  get deviceId() { return this._deviceId; }
  get userId() { return this._userId; }
  get isInitialized() { return this._initialized; }
  get isEnabled() { return this._enabled; }
  get hasConsent() { return this._consentGiven; }
}
