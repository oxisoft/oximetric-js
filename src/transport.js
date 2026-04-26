// HTTP transport for tracking endpoints.
//
// Uses fetch() with credentials:'omit' to avoid carrying any cookies
// to the analytics origin. Custom X-Token header is sent on every request,
// which causes a CORS preflight (handled by the server's CORS middleware).
//
// On page unload we set keepalive:true so the request survives navigation.
// keepalive is supported in every evergreen browser. We do not use
// navigator.sendBeacon because it cannot set the X-Token header.

import { isBrowser } from './utils.js';

export class Transport {
  constructor({ baseUrl, apiPath, token, logger }) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.apiPath = apiPath;
    this.token = token;
    this.logger = logger;
  }

  url(path) {
    return this.baseUrl + this.apiPath + path;
  }

  async post(path, body, { keepalive = false, signal } = {}) {
    if (!isBrowser() && typeof fetch !== 'function') {
      throw new Error('fetch is not available');
    }
    const init = {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': this.token,
      },
      body: JSON.stringify(body),
    };
    if (keepalive) init.keepalive = true;
    if (signal) init.signal = signal;
    return fetch(this.url(path), init);
  }
}
