/**
 * Playground Bundle Builder
 *
 * Concatenates preprocessed dist files into a single IIFE, then minifies
 * with terser. This approach works because all files share the same
 * top-level scope inside the IIFE, so `function createRegistry` (defined
 * in registry.js) is hoisted and visible to playground.mjs.
 *
 * Using terser instead of esbuild for minification to avoid the duplicate
 * `resolveValue` declaration error (exists in both renderer.js and tokens.js).
 *
 * Usage: bun run bundle:playground
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { minify } from 'terser';

const DIST = resolve('packages/yell-core/dist');
const OUTFILE = resolve('playground.bundle.js');
const MODULES = ['parser.js', 'registry.js', 'renderer.js', 'tokens.js', 'minify.js', 'playground.mjs'];

function preprocess(content, file) {
  content = content
    .replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '')
    .replace(/^import\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '')
    .replace(/^export\s+/gm, '');
  if (file === 'parser.js') {
    content = content
      .replace(/const\s+doc\s*=\s*parseDocument\(yaml\)/g, 'const doc = jsyaml.load(yaml)')
      .replace(/return\s+doc\.toJS\(\)/g, 'return doc');
  }
  if (file === 'playground.mjs') {
    content = content.replace(/href="#"/g, 'href="javascript:void(0)"');
  }
  return content;
}

async function build() {
  let code = '';
  for (const mod of MODULES) {
    const content = readFileSync(resolve(DIST, mod), 'utf8');
    const patched = preprocess(content, mod);
    code += `/* ${mod} */\n${patched.trim()}\n\n`;
  }

  const bundle = `(function(global) {\n/* Yell Core — playground bundle */\n"use strict";\n${code}/* Bundle export */\nglobal.initPlayground = initPlayground;\n})(this);\n`;

  const result = await minify(bundle, {
    toplevel: false,
    compress: { passes: 2, drop_console: false },
    mangle: { toplevel: false, properties: false },
    format: { comments: false },
  });

  writeFileSync(OUTFILE, result.code, 'utf8');
  const orig = bundle.length;
  const min = result.code.length;
  const pct = ((orig - min) / orig * 100).toFixed(1);
  console.log(`✓ playground.bundle.js — ${orig}→${min} bytes (${pct}% smaller)`);
}

build().catch(err => { console.error('Build failed:', err); process.exit(1); });
