/**
 * Playground Bundle Builder
 *
 * Inlines @yell/core modules into a single IIFE for use in playground.html.
 * Minifies output with terser and supports bun for faster builds.
 *
 * Usage:
 *   node scripts/build-playground.mjs
 *   bun run scripts/build-playground.mjs
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
  'playground.mjs',  // was playground.mjs from src, now from dist
];

function comment(text) {
  return `/* ── ${text} ── */\n`;
}

// ── Read and process all modules ──────────────────────────────────────────────

let code = '';

for (const mod of MODULES) {
  let content = readFileSync(resolve(BASE, mod), 'utf8');

  // Remove imports and exports
  content = content
    .replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/^export\s+{\s*[^}]*}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');

  // Fix parser.js: use jsyaml.load instead of yaml.parseDocument
  if (mod === 'parser.js') {
    content = content
      .replace(/const\s+doc\s*=\s*parseDocument\(yaml\)/g, 'const doc = jsyaml.load(yaml)')
      .replace(/return\s+doc\.toJS\(\)/g, 'return doc');
  }

  // Fix href="#" links in playground components
  if (mod === 'playground.mjs') {
    content = content.replace(/href="#"/g, 'href="javascript:void(0)"');
  }

  code += comment(mod) + content.trim() + '\n\n';
}

// Bundle header and footer
const bundle = '(function(global) {\n'
  + comment('Yell Core — playground bundle (inline build)')
  + '"use strict";\n'
  + code
  + comment('Bundle export')
  + 'global.initPlayground = initPlayground;\n'
  + '})(this);\n';

// ── Minify with terser ────────────────────────────────────────────────────────

async function minify(code) {
  const { minify } = await import('terser');
  const result = await minify(code, {
    toplevel: false,
    compress: {
      passes: 2,
      drop_console: false,
      pure_funcs: ['comment'],
    },
    mangle: {
      toplevel: false,
      properties: false,
    },
    format: {
      comments: false,
    },
  });
  return result.code;
}

const minified = await minify(bundle);
writeFileSync('playground.bundle.js', minified, 'utf8');

const orig = bundle.length;
const min = minified.length;
const pct = ((orig - min) / orig * 100).toFixed(1);

console.log(`✓ playground.bundle.js — ${orig}→${min} bytes (${pct}% smaller)`);