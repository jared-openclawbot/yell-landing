import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const DIST = resolve('packages/yell-core/dist');
const OUTFILE = resolve('.playground-debug.js');

const FILES = ['parser.js', 'registry.js', 'renderer.js', 'tokens.js', 'minify.js', 'playground.mjs'];

const HELPERS = `
function escapeAttr(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function escapeText(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
`;

function preprocess(content, file) {
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

let src = '';
for (const file of FILES) {
  const content = readFileSync(resolve(DIST, file), 'utf8');
  const patched = preprocess(content, file);
  src += `/* ${file} */\n(function(global){${HELPERS}${patched}})(this);\n\n`;
}

writeFileSync('.playground-src.mjs', src, 'utf8');
console.log('Source written, length:', src.length);

await esbuild.build({
  entryPoints: ['.playground-src.mjs'],
  outfile: OUTFILE,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  bundle: true,
  minify: false,
  logLevel: 'warning',
  define: { 'crypto': 'undefined', 'fs': 'undefined' },
});

unlinkSync('.playground-src.mjs');
const bundle = readFileSync(OUTFILE, 'utf8');
console.log('Bundle written, length:', bundle.length);
// Write to /tmp for easy inspection
require('fs').writeFileSync('/tmp/playground-debug.txt', bundle.slice(0, 3000));
console.log('First 3000 chars written to /tmp/playground-debug.txt');
