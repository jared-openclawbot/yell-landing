/**
 * Playground Bundle Builder — esbuild
 * 
 * Each dist file wrapped in IIFE to avoid duplicate declarations.
 * esbuild then concatenates with minification.
 * 
 * Usage: bun run bundle:playground
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const DIST = resolve('packages/yell-core/dist');
const OUTFILE = resolve('playground.bundle.js');

const FILES = ['parser.js', 'registry.js', 'renderer.js', 'tokens.js', 'minify.js', 'playground.mjs'];

function preprocess(content, file) {
  // Remove import/export lines
  content = content
    .replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?\n?/gm, '')
    .replace(/^import\s+\w+\s+from\s+['"][^'"]+['"];?\n?/gm, '')
    .replace(/^export\s+/gm, '');
  
  // Fix jsyaml in parser
  if (file === 'parser.js') {
    content = content
      .replace(/parseDocument\(yaml\)/g, 'jsyaml.load(yaml)')
      .replace(/\.toJS\(\)/g, '');
  }
  
  // Fix href="#" in playground components  
  if (file === 'playground.mjs') {
    content = content.replace(/href="#"/g, 'href="javascript:void(0)"');
  }
  
  // Wrap each file in IIFE to isolate function declarations
  return `(function(){\n${content}\n})();\n`;
}

async function build() {
  let src = '';
  for (const file of FILES) {
    const content = readFileSync(resolve(DIST, file), 'utf8');
    src += `/* ${file} */\n` + preprocess(content, file) + '\n';
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
