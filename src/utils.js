// Small shared helpers. No DOM-only logic here.

export function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function deepMerge(target, source) {
  const out = Array.isArray(target) ? target.slice() : { ...target };
  if (!isObject(source)) return out;
  for (const k of Object.keys(source)) {
    const sv = source[k];
    if (isObject(sv) && isObject(out[k])) {
      out[k] = deepMerge(out[k], sv);
    } else {
      out[k] = sv;
    }
  }
  return out;
}

export function safeCall(fn, ...args) {
  try { return fn(...args); } catch { return undefined; }
}

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
export function makeLogger(level) {
  const lvl = LEVELS[level] ?? LEVELS.warn;
  const c = typeof console !== 'undefined' ? console : null;
  const at = (target, fn) => (...a) => { if (c && lvl >= target) fn.apply(c, ['[oximetric]', ...a]); };
  return {
    error: at(LEVELS.error, c?.error || (() => {})),
    warn:  at(LEVELS.warn,  c?.warn  || (() => {})),
    info:  at(LEVELS.info,  c?.log   || (() => {})),
    debug: at(LEVELS.debug, c?.debug || c?.log || (() => {})),
  };
}

export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function nowISO() {
  return new Date().toISOString();
}

export function trimUrl(u) {
  if (!u) return '';
  try {
    const p = new URL(u, isBrowser() ? location.href : 'http://localhost');
    return p.origin + p.pathname; // strip query+hash for default tracking
  } catch {
    return u;
  }
}

export function parseBool(v, fallback = false) {
  if (v === true || v === false) return v;
  if (typeof v !== 'string') return fallback;
  const s = v.toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return fallback;
}

export function parseList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}
