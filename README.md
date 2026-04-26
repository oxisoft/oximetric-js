# Oximetric JS

**Lightweight, privacy-friendly visitor analytics for any website.** Drop-in script tag or ESM module. Zero runtime dependencies. ~18 KB minified.

[![npm](https://img.shields.io/npm/v/oximetric?color=blue)](https://www.npmjs.com/package/oximetric)
[![size](https://img.shields.io/bundlephobia/minzip/oximetric)](https://www.npmjs.com/package/oximetric)
[![license](https://img.shields.io/badge/license-MIT-green)](https://github.com/oxisoft/oximetric-js/blob/main/LICENSE)
[![ci](https://github.com/oxisoft/oximetric-js/actions/workflows/ci.yml/badge.svg)](https://github.com/oxisoft/oximetric-js/actions/workflows/ci.yml)

---

**Oximetric JS** is the official JavaScript SDK for [Oximetric](https://github.com/oxisoft/oximetric), a self-hosted visitor analytics server. Track pageviews, events, downloads, outbound link clicks, and form submissions on any website — without third-party cookies, fingerprinting, or megabyte bundles.

- **Self-hosted** — your data never leaves your infrastructure.
- **Privacy-friendly** — no third-party cookies, no fingerprinting, optional consent gate, opt-out of DNT respected.
- **Tiny** — ~18 KB minified, zero runtime dependencies.
- **Universal** — works as a `<script>` tag, ESM module, CJS, or UMD.
- **Auto-tracks** pageviews (incl. SPAs), outbound links, downloads, and form submissions out of the box.
- **CDN ready** — load directly from jsDelivr or unpkg.
- **Origin-pinned tokens** — server validates `Origin` header per token, so a leaked token cannot be replayed from another site.

## Table of contents

- [Quick start](#quick-start)
  - [Drop-in script tag](#drop-in-script-tag)
  - [ESM / bundlers](#esm--bundlers)
- [Installation](#installation)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Auto-tracking](#auto-tracking)
- [Consent mode](#consent-mode)
- [Identifying users](#identifying-users)
- [Single-page applications](#single-page-applications)
- [Storage and persistence](#storage-and-persistence)
- [Security](#security)
- [Examples](#examples)
- [FAQ](#faq)
- [License](#license)

---

## Quick start

### Drop-in script tag

Add this near the closing `</body>` tag (or in `<head>` with `defer`):

```html
<script defer
  src="https://cdn.jsdelivr.net/npm/oximetric/dist/oximetric.min.js"
  data-server="https://analytics.example.com"
  data-token="YOUR_PROJECT_TOKEN"></script>
```

That's it. Pageviews, outbound clicks, downloads, and form submits are tracked automatically.

To send a custom event:

```html
<script>
  oximetric.track('signup_clicked', { plan: 'pro', amount: 29.99 });
</script>
```

### ESM / bundlers

```bash
npm install oximetric
```

```js
import { OxiMetric } from 'oximetric';

await OxiMetric.init({
  serverUrl: 'https://analytics.example.com',
  token: 'YOUR_PROJECT_TOKEN',
});

OxiMetric.track('signup_clicked', { plan: 'pro' });
```

---

## Installation

| Method | Snippet |
| --- | --- |
| **npm**     | `npm install oximetric` |
| **yarn**    | `yarn add oximetric` |
| **pnpm**    | `pnpm add oximetric` |
| **CDN (jsDelivr)** | `https://cdn.jsdelivr.net/npm/oximetric@latest/dist/oximetric.min.js` |
| **CDN (unpkg)**    | `https://unpkg.com/oximetric@latest/dist/oximetric.min.js` |
| **GitHub release** | Download `oximetric.min.js` from a [release](https://github.com/oxisoft/oximetric-js/releases) |

Pin a specific version in production:
`https://cdn.jsdelivr.net/npm/oximetric@0.1.0/dist/oximetric.min.js`.

### Bundle outputs

| File | Format | Use case |
| --- | --- | --- |
| `dist/oximetric.min.js` | IIFE | `<script>` tag — auto-init from `data-*` attrs |
| `dist/oximetric.esm.js` | ESM | Modern bundlers (Vite, webpack 5, Rollup) |
| `dist/oximetric.esm.min.js` | ESM (min) | Production ESM |
| `dist/oximetric.cjs` | CJS | Legacy Node tooling |
| `dist/oximetric.umd.min.js` | UMD | AMD / global / CJS interop |

---

## Configuration

### Script-tag attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `data-server` | _(required)_ | Base URL of your Oximetric server. |
| `data-token` | _(required)_ | Project token. The token's allowed-origins must include this site. |
| `data-auto-track` | `pageviews,outbound,downloads,forms` | Comma-separated list. Use `none` to disable everything. |
| `data-consent` | `granted` | `granted` or `required`. With `required`, the SDK waits for `optIn()`. |
| `data-storage` | `auto` | `auto` \| `localStorage` \| `cookie` \| `memory` \| `none`. |
| `data-cookie-domain` | `auto` | `auto` (eTLD+1) \| `host` \| explicit `.example.com`. |
| `data-flush-interval` | `5000` | Milliseconds between automatic flushes. |
| `data-respect-do-not-track` | `false` | Disable tracking when DNT header is set. |
| `data-log-level` | `warn` | `silent` \| `error` \| `warn` \| `info` \| `debug`. |

### `OxiMetric.init(options)`

```js
await OxiMetric.init({
  serverUrl: 'https://analytics.example.com',
  token: 'pk_xxx',                  // required

  consent: 'granted',               // or 'required'
  respectDoNotTrack: false,

  autoTrack: {
    pageviews: true,
    outboundLinks: true,
    downloads: true,
    forms: true,
  },

  storage: 'auto',                  // 'auto'|'localStorage'|'cookie'|'memory'|'none'
  cookieDomain: 'auto',             // 'auto'|'host'|'.example.com'
  cookieDays: 730,
  cookieSameSite: 'Lax',
  cookieSecure: 'auto',

  flushInterval: 5000,
  flushOnUnload: true,
  maxQueueSize: 50,
  maxBatchSize: 100,
  maxRetries: 3,

  logLevel: 'warn',
});
```

---

## API reference

| Method | Description |
| --- | --- |
| `OxiMetric.init(options)` | Initializes the SDK. Returns a promise. |
| `OxiMetric.track(name, props?)` | Tracks a custom event. `props` values are auto-typed. |
| `OxiMetric.pageview(props?)` | Manually tracks a pageview. |
| `OxiMetric.identify(identifier)` | SHA-256 hashes the identifier and links the device to a user. |
| `OxiMetric.reset()` | Forgets the identified user. Keeps the device id. |
| `OxiMetric.flush()` | Immediately sends queued events. |
| `OxiMetric.optIn()` | Grants consent and starts tracking. |
| `OxiMetric.optOut()` | Revokes consent, drops queue, stops timers. |
| `OxiMetric.shutdown()` | Stops everything. `init()` may be called again afterwards. |
| `OxiMetric.deviceId` | Read-only device id. |
| `OxiMetric.userId` | Read-only identified user id (or null). |
| `OxiMetric.isInitialized` | Boolean. |
| `OxiMetric.isEnabled` | Boolean. |
| `OxiMetric.hasConsent` | Boolean. |
| `OxiMetric.version` | SDK version string. |

### Property types

| JS value | Server type |
| --- | --- |
| `string` | `string` (truncated at 4096 chars) |
| `number` (int) | `int` |
| `number` (fraction) | `float` |
| `boolean` | `bool` |
| `Date` | `datetime` (ISO-8601) |

Up to 50 properties per event. Up to 100 events per batch (server-enforced).

---

## Auto-tracking

Out of the box the SDK records four event types:

| Event | When | Useful properties |
| --- | --- | --- |
| `pageview` | Page load + every SPA route change (history API + hashchange). | `url`, `path`, `title`, `referrer`, `query`, `hash` |
| `outbound_link` | Click on `<a>` whose host differs from the current site. | `url`, `host`, `target` |
| `download` | Click on `<a>` ending in a known file extension or with a `download` attribute. | `url`, `path`, `host`, `extension` |
| `form_submit` | Any `<form>` submit event bubbles to document. | `id`, `name`, `action`, `method` |

Disable a single tracker:

```js
await OxiMetric.init({
  /* ... */
  autoTrack: { forms: false },   // disable forms only
});
```

Or via the script tag:

```html
<script defer src="..." data-auto-track="pageviews,outbound"></script>
```

Disable everything (manual mode):

```html
<script defer src="..." data-auto-track="none"></script>
```

---

## Consent mode

Two modes are supported:

### `granted` (default)

The SDK starts immediately on `init()`. Use this on sites where prior legal basis is established (e.g. legitimate interest under GDPR for first-party analytics) or outside the EU.

### `required`

The SDK initializes, generates a device id (only in memory if `storage: 'none'`), and **buffers events without sending them**. Once the user accepts your cookie banner, call `OxiMetric.optIn()` — buffered events flush, the device is registered, and auto-tracking starts.

```html
<script defer src="..." data-consent="required" data-storage="none"></script>
<script>
  document.querySelector('#accept').addEventListener('click', () => {
    oximetric.optIn();
  });
  document.querySelector('#decline').addEventListener('click', () => {
    oximetric.optOut();
  });
</script>
```

`OxiMetric.optOut()` revokes consent at any time and drops the in-memory queue.

---

## Identifying users

Use `identify()` after a successful sign-in or any time you know who the visitor is:

```js
await OxiMetric.identify('user@example.com');
// or any opaque identifier — user id, hash, etc.
```

The identifier is **hashed with SHA-256 in the browser** before transport. The raw value never leaves the device. The server returns a stable user id, which is included in subsequent event batches and persisted across sessions.

On logout:

```js
OxiMetric.reset();
```

This forgets the user id but keeps the device id, so anonymous activity afterwards isn't counted as a brand-new visitor.

---

## Single-page applications

Pageviews are tracked automatically across:

- Initial document load
- `history.pushState` (e.g. React Router, Vue Router)
- `history.replaceState`
- `popstate` (browser back/forward)
- `hashchange`

If your router does something exotic, you can always call:

```js
OxiMetric.pageview({ path: '/custom', title: 'Custom title' });
```

To turn off auto-pageviews and call them manually only:

```js
await OxiMetric.init({
  /* ... */
  autoTrack: { pageviews: false },
});
```

---

## Storage and persistence

The SDK persists the **device id** so the same visitor is counted as one over time. Storage strategy:

1. **localStorage** (default) — most reliable, survives browser restarts.
2. **First-party cookie** — mirrored alongside localStorage. Enables cross-subdomain tracking when `cookieDomain` resolves to your apex domain.
3. **Memory** — opt-in via `storage: 'memory'` for fully session-scoped analytics.
4. **Disabled** — `storage: 'none'` does not persist anything.

Set a cross-subdomain cookie automatically:

```js
await OxiMetric.init({ /* ... */ cookieDomain: 'auto' });   // .example.com
```

Pin to current host:

```js
await OxiMetric.init({ /* ... */ cookieDomain: 'host' });
```

Explicit:

```js
await OxiMetric.init({ /* ... */ cookieDomain: '.shop.example.com' });
```

---

## Security

### Token exposure

Any analytics SDK that runs in the browser must ship a token in JS. Anyone can read it via DevTools — that's a property of the web platform, not a flaw of this SDK.

The Oximetric server mitigates token theft with **per-token allowed origins**: each project token has a list of permitted origins (`https://example.com`, `https://*.example.com`, or `*`). On every tracking request, the server validates the `Origin` header against that list and rejects mismatches with `403 FORBIDDEN`. Browser CORS rules also prevent the response from being read by attacker pages.

**Rotate tokens** in the Oximetric console if a token leaks. Disabling a token takes effect immediately.

### What the SDK collects

The SDK sends:

- A device id (UUID) you generated
- An event id (UUID) per event
- The event name and your custom properties
- For pageviews: URL, path, title, referrer, query, hash
- For outbound clicks/downloads: target URL
- For forms: id/name/action/method

It does **not** send: cookies of your site (transport uses `credentials: 'omit'`), the user's email or any PII, browser fingerprints, mouse movements, scroll positions, or any heatmap-style data.

The server independently records the visitor IP for GeoIP lookup and discards it after geo resolution.

### CSP

If your site has a strict Content Security Policy, allow your analytics origin:

```http
Content-Security-Policy: ...; connect-src 'self' https://analytics.example.com
```

---

## Examples

A full HTML examples page is included in the repository at [`examples/index.html`](./examples/index.html). Open it in a browser after building the library to see all tracking scenarios in action.

Highlights:

- Manual `track()` with typed properties (string, int, float, bool, Date)
- `identify()` and `reset()`
- `optIn()` / `optOut()` driven by a cookie banner
- Manual SPA pageview routing
- Outbound, download, and form auto-tracking
- Custom event with nested route + UTM properties

---

## FAQ

**Does this SDK use cookies?**
By default it sets one first-party cookie (`_oxi_did`) for cross-subdomain device persistence. Switch to `storage: 'localStorage'` for cookieless operation, or `storage: 'memory'` for fully session-scoped tracking with no persistence.

**Is the SDK GDPR-compliant?**
The SDK supports `consent: 'required'` mode for explicit-consent flows. Combined with the self-hosted server (your data, your control), it is well-suited for GDPR setups. Compliance is ultimately determined by your overall data-handling practices, retention policy, and DPA.

**Do you respect Do Not Track?**
Yes, when `respectDoNotTrack: true` is set. Off by default because DNT is rarely a legally binding signal; you should make a deliberate choice.

**How does this differ from Plausible / Umami / PostHog?**
Oximetric is a smaller, single-binary, self-hosted analytics server with first-class support for both web (this SDK) and native (Flutter) clients sharing the same project tokens. Token-pinned origins prevent unauthorized reuse without you needing to host an additional auth proxy.

**Can I use it with React / Vue / Svelte / Angular?**
Yes — use the ESM build via `npm install oximetric`. Pageviews are tracked on history changes automatically.

---

## License

[MIT](./LICENSE) © OxiSoft.
