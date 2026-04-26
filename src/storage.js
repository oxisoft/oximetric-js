// Persistence layer for the device ID and identified user ID.
//
// Strategy: try localStorage first (most reliable, longest retention).
// Mirror to a first-party cookie so subdomains and ITP-affected browsers
// still see the value. Both stores are best-effort — failures are silent.

import { isBrowser, safeCall } from './utils.js';

export class Storage {
  constructor(opts) {
    this.mode = opts.mode || 'auto';
    this.cookieDays = opts.cookieDays;
    this.cookieDomain = opts.cookieDomain; // 'auto' | 'host' | explicit
    this.cookieSameSite = opts.cookieSameSite;
    this.cookieSecure = opts.cookieSecure;
    this.memory = new Map();
    this._available = this._detect();
  }

  _detect() {
    if (!isBrowser() || this.mode === 'none' || this.mode === 'memory') {
      return { local: false, cookie: false };
    }
    const local = (this.mode === 'auto' || this.mode === 'localStorage') && this._localOK();
    const cookie = (this.mode === 'auto' || this.mode === 'cookie') && this._cookieOK();
    return { local, cookie };
  }

  _localOK() {
    try {
      const k = '__oxi_t__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch { return false; }
  }

  _cookieOK() {
    try { return typeof document !== 'undefined' && navigator.cookieEnabled !== false; }
    catch { return false; }
  }

  _resolveDomain() {
    if (this.cookieDomain === 'host' || !isBrowser()) return '';
    if (this.cookieDomain && this.cookieDomain !== 'auto') return this.cookieDomain;
    // 'auto' — best-effort eTLD+1 (last 2 dot-parts). Avoids a public-suffix list dep.
    const host = location.hostname;
    if (!host || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host === 'localhost' || !host.includes('.')) return '';
    const parts = host.split('.');
    if (parts.length <= 2) return '.' + host;
    return '.' + parts.slice(-2).join('.');
  }

  _isSecure() {
    if (this.cookieSecure === true) return true;
    if (this.cookieSecure === false) return false;
    return isBrowser() ? location.protocol === 'https:' : false;
  }

  get(key) {
    if (this.mode === 'memory' || this.mode === 'none') {
      return this.memory.get(key) ?? null;
    }
    if (this._available.local) {
      const v = safeCall(() => window.localStorage.getItem(key));
      if (v != null) return v;
    }
    if (this._available.cookie) {
      const v = readCookie(key);
      if (v != null) return v;
    }
    return this.memory.get(key) ?? null;
  }

  set(key, value) {
    this.memory.set(key, value);
    if (this.mode === 'memory' || this.mode === 'none') return;
    if (this._available.local) {
      safeCall(() => window.localStorage.setItem(key, value));
    }
    if (this._available.cookie) {
      writeCookie(key, value, {
        days: this.cookieDays,
        domain: this._resolveDomain(),
        sameSite: this.cookieSameSite,
        secure: this._isSecure(),
      });
    }
  }

  remove(key) {
    this.memory.delete(key);
    if (this._available.local) safeCall(() => window.localStorage.removeItem(key));
    if (this._available.cookie) {
      writeCookie(key, '', {
        days: -1,
        domain: this._resolveDomain(),
        sameSite: this.cookieSameSite,
        secure: this._isSecure(),
      });
    }
  }
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const target = encodeURIComponent(name) + '=';
  for (const part of document.cookie.split(';')) {
    const c = part.trim();
    if (c.indexOf(target) === 0) {
      try { return decodeURIComponent(c.substring(target.length)); }
      catch { return c.substring(target.length); }
    }
  }
  return null;
}

function writeCookie(name, value, { days, domain, sameSite, secure }) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
  let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=${sameSite || 'Lax'}`;
  if (domain) s += `; domain=${domain}`;
  if (secure) s += '; Secure';
  try { document.cookie = s; } catch { /* ignore */ }
}
