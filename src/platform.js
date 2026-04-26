// Light platform detection from User-Agent + navigator hints.
// We only use information the server can also see from headers — no fingerprinting.

import { isBrowser } from './utils.js';

export function detectPlatform() {
  if (!isBrowser()) {
    return { platform: 'web', osVersion: '', appVersion: '', locale: '' };
  }
  const nav = window.navigator;
  const ua = nav.userAgent || '';

  let os = '';
  if (/Windows NT ([\d.]+)/.test(ua)) os = 'Windows ' + RegExp.$1;
  else if (/Mac OS X ([\d_\.]+)/.test(ua)) os = 'macOS ' + RegExp.$1.replace(/_/g, '.');
  else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + RegExp.$1;
  else if (/iPhone OS ([\d_]+)/.test(ua) || /iPad.*CPU OS ([\d_]+)/.test(ua) || /CPU OS ([\d_]+)/.test(ua)) os = 'iOS ' + RegExp.$1.replace(/_/g, '.');
  else if (/CrOS [^ ]+ ([\d.]+)/.test(ua)) os = 'ChromeOS ' + RegExp.$1;
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = '';
  if (/Edg\/([\d.]+)/.test(ua)) browser = 'Edge ' + RegExp.$1;
  else if (/OPR\/([\d.]+)/.test(ua)) browser = 'Opera ' + RegExp.$1;
  else if (/Chrome\/([\d.]+)/.test(ua) && !/Edg|OPR/.test(ua)) browser = 'Chrome ' + RegExp.$1;
  else if (/Firefox\/([\d.]+)/.test(ua)) browser = 'Firefox ' + RegExp.$1;
  else if (/Version\/([\d.]+).*Safari/.test(ua)) browser = 'Safari ' + RegExp.$1;
  else if (/Safari\/([\d.]+)/.test(ua)) browser = 'Safari ' + RegExp.$1;

  return {
    platform: 'web',
    osVersion: os,
    appVersion: browser,
    locale: nav.language || '',
  };
}
