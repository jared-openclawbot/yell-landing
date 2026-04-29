/**
 * Playground Bundle Builder — esbuild
 * 
 * Concatenates dist files with IIFE wrapping per file to avoid duplicate declarations.
 * Injects shared helpers (escapeText, escapeAttr) into every IIFE.
 * 
 * Usage: bun run bundle:playground
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const DIST = resolve('packages/yell-core/dist');
const OUTFILE = resolve('playground.bundle.js');

const FILES = ['parser.js', 'registry.js', 'renderer.js', 'tokens.js', 'minify.js', 'playground.mjs'];

// Shared helpers injected into every IIFE
const HELPERS = `
function escapeAttr(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function escapeText(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
`;

// ── Pre-process each file ─────────────────────────────────────────────────────

function preprocess(content, file) {
  // Remove import/export lines
  content = content
    .replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?\n?/gm, '')
    .replace(/^import\s+\w+\s+from\s+['"][^'"]+['"];?\n?/gm, '')
    .replace(/^export\s+/gm, '');
  
  if (file === 'parser.js') {
    content = content
      .replace(/parseDocument\(yaml\)/g, 'jsyaml.load(yaml)')
      .replace(/\.toJS\(\)/g, '');
  }
  
  if (file === 'playground.mjs') {
    content = content.replace(/href="#"/g, 'href="javascript:void(0)"');
  }
  
  return content;
}

// ── Build ─────────────────────────────────────────────────────────────────────

async function build() {
  let src = '';
  
  for (const file of FILES) {
    const content = readFileSync(resolve(DIST, file), 'utf8');
    const patched = preprocess(content, file);
    // Wrap each file in IIFE, injecting shared helpers
    src += `/* ${file} */\n(function(global){${HELPERS}${patched}})(this);\n\n`;
  }
  
  const tmp = resolve('.playground-src.mjs');
  writeFileSync(tmp, src, 'utf8');
  
  await esbuild.build({
    entryPoints: [tmp],
    outfile: OUTFILE,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    bundle: true,
    minify: true,
    banner: { js: '/* Yell Core — playground bundle (esbuild) */' },
    logLevel: 'warning',
    define: { 'crypto': 'undefined', 'fs': 'undefined' },
  });
  
  unlinkSync(tmp);
  
  // Ensure window.initPlayground is set
  let bundle = readFileSync(OUTFILE, 'utf8');
  if (!bundle.includes('window.initPlayground')) {
    bundle += '\nif(typeof window!=="undefined")window.initPlayground=initPlayground;';
    writeFileSync(OUTFILE, bundle, 'utf8');
  }
  
  console.log(`✓ playground.bundle.js — ${bundle.length} bytes (esbuild)`);
}

build().catch(err => { console.error('Build failed:', err); process.exit(1); });
