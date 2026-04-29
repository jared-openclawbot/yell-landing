/**
 * Playground Bundle Builder
 *
 * Inlines @yell/core modules into a single IIFE for use in playground.html.
 * Replaces the ES module dynamic import with a static script tag.
 *
 * Usage: node scripts/build-playground.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = resolve('packages/yell-core/dist');

const MODULES = [
  'parser.js',
  'registry.js',
  'renderer.js',
  'tokens.js',
  'minify.js',
  'playground.mjs',
];

function comment(text) {
  return `/* ── ${text} ── */\n`;
}

const out = ['(function(global) {\n'];
out.push(comment('Yell Core — playground bundle (inline build)'));
out.push('"use strict";\n');

for (const mod of MODULES) {
  let code = readFileSync(resolve(BASE, mod), 'utf8');

  // ── Remove imports ──────────────────────────────────────────────────────────
  // Only remove import statements, NOT the function usages
  code = code.replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  code = code.replace(/^export\s+/gm, '');
  code = code.replace(/^export\s+{\s*[^}]*}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');

  // ── Fix parser.js: use jsyaml.load instead of yaml.parseDocument ──────────
  if (mod === 'parser.js') {
    code = code
      .replace(/const\s+doc\s*=\s*parseDocument\(yaml\)/g, 'const doc = jsyaml.load(yaml)')
      .replace(/return\s+doc\.toJS\(\)/g, 'return doc');
  }

  // ── Fix href="#" in playground components ─────────────────────────────────
  if (mod === 'playground.mjs') {
    code = code.replace(/href="#"/g, 'href="javascript:void(0)"');
  }

  // ── Resolve cross-module references ───────────────────────────────────────
  // renderer.js imports { getComponent, getFunction } from './registry.js'
  // and { buildTokenManifest } from './tokens.js'
  // Since all modules are inlined, these are already in scope.
  // The import statements above were stripped, so the function references
  // now correctly resolve to the definitions in earlier modules.

  out.push(comment(mod));
  out.push(code.trim() + '\n\n');
}

out.push(comment('Bundle export — initPlayground available globally'));
out.push('global.initPlayground = initPlayground;\n');
out.push('})(this);\n');

const content = out.join('');
writeFileSync('playground.bundle.js', content, 'utf8');
console.log('✓ playground.bundle.js written (' + content.length + ' bytes)');