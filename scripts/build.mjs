#!/usr/bin/env node
// Production-grade builder for oximetric-js.
//
//   node scripts/build.mjs                 — dev build (sourcemaps, no banner version pin)
//   OXIMETRIC_BUILD=production node ...    — release build (minified, banner with version)
//
// Outputs:
//   dist/oximetric.min.js       IIFE for <script> tags. Auto-init from data-attrs.
//   dist/oximetric.esm.js       ESM module for bundlers. No side effects.
//   dist/oximetric.esm.min.js   Minified ESM.
//   dist/oximetric.cjs          CommonJS for legacy Node tooling.
//   dist/oximetric.umd.min.js   UMD wrapper for AMD/global/CommonJS interop.
//   dist/*.map                  Source maps for every output.

import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const isProduction = process.env.OXIMETRIC_BUILD === 'production';

const banner = `/*! Oximetric ${pkg.version} | MIT License | https://github.com/oxisoft/oximetric-js */`;

console.log(`build: oximetric@${pkg.version} (${isProduction ? 'production' : 'dev'})`);

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const common = {
  bundle: true,
  target: ['es2018'],
  legalComments: 'none',
  sourcemap: true,
  banner: { js: banner },
};

const tasks = [
  // IIFE — drop-in <script> tag with auto-init from data-* attrs.
  {
    name: 'iife',
    entry: resolve(root, 'src/auto-init.js'),
    out: resolve(distDir, 'oximetric.min.js'),
    format: 'iife',
    globalName: 'OxiMetric',
    minify: true,
    footer: { js: 'window.OxiMetric = OxiMetric.OxiMetric || OxiMetric.default || OxiMetric;' },
  },
  // ESM — for bundlers / SPA frameworks. No auto-init.
  {
    name: 'esm',
    entry: resolve(root, 'src/index.js'),
    out: resolve(distDir, 'oximetric.esm.js'),
    format: 'esm',
    minify: false,
  },
  {
    name: 'esm-min',
    entry: resolve(root, 'src/index.js'),
    out: resolve(distDir, 'oximetric.esm.min.js'),
    format: 'esm',
    minify: true,
  },
  // CommonJS — legacy Node.
  {
    name: 'cjs',
    entry: resolve(root, 'src/index.js'),
    out: resolve(distDir, 'oximetric.cjs'),
    format: 'cjs',
    minify: false,
  },
  // UMD — wrapped manually (esbuild has no native UMD).
  {
    name: 'umd-min',
    entry: resolve(root, 'src/index.js'),
    out: resolve(distDir, 'oximetric.umd.min.js'),
    format: 'iife',
    globalName: '__oximetric__',
    minify: true,
    umd: true,
  },
];

for (const t of tasks) {
  const result = await build({
    ...common,
    entryPoints: [t.entry],
    outfile: t.out,
    format: t.format,
    minify: t.minify,
    globalName: t.globalName,
    footer: t.footer,
  });
  if (result.errors.length) {
    console.error(result.errors);
    process.exit(1);
  }
  if (t.umd) wrapUMD(t.out, t.globalName, 'OxiMetric');
  reportSize(t.name, t.out);
}

console.log('build: ok');

// ----------------------------------------------------------

function reportSize(name, file) {
  const stat = statSync(file);
  const kb = (stat.size / 1024).toFixed(2);
  console.log(`  ${name.padEnd(8)} ${file.replace(root + '/', '')} (${kb} KB)`);
}

function wrapUMD(file, internalName, globalName) {
  const src = readFileSync(file, 'utf8');
  const wrapped =
`${banner}
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.${globalName} = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  ${src}
  var lib = ${internalName};
  return (lib && (lib.OxiMetric || lib.default)) || lib;
}));
`;
  writeFileSync(file, wrapped);
}
