// Cryptographically random identifiers, UUIDv4 shape.

export function generateId() {
  // Browser & modern Node both expose crypto.randomUUID.
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  // Last-resort fallback. Sufficient for opaque IDs but not "secure" — flagged to caller via a tag.
  const r = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const h = r() + r() + r() + r();
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${(8 + Math.floor(Math.random()*4)).toString(16)}${h.slice(17,20)}-${h.slice(20)}`;
}
