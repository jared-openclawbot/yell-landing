/**
 * Bundle script — generates self-contained minified index.html
 * 
 * Usage: node scripts/bundle.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { minify } from 'terser';

const input = 'index.html';
const output = 'index.min.html';

async function minifyJS(code) {
  try {
    const result = await minify(code, {
      toplevel: true,
      compress: { dead_code: true, drop_console: false, passes: 2 },
      mangle: { toplevel: true },
      format: { quote_style: 1, wrap_iife: false },
    });
    return result.code;
  } catch (e) {
    console.error('Terser error:', e.message);
    return code;
  }
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function bundle() {
  let html = readFileSync(input, 'utf8');

  // Remove Google Fonts
  html = html.replace(/<link[^>]*googleapis\.com[^>]*>/g, '');
  html = html.replace(/<link[^>]*gstatic\.com[^>]*>/g, '');

  // Collect and minify all <style> blocks
  const styleBlocks = [];
  html = html.replace(/<style>([\s\S]*?)<\/style>/gi, (match, css) => {
    styleBlocks.push(minifyCSS(css));
    return `__STYLE_${styleBlocks.length - 1}__`;
  });

  // Collect all inline <script> matches first, then minify
  const scriptMatches = [];
  const scriptRegex = /<script(?![^>]*type="module")(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    scriptMatches.push(scriptMatch);
  }

  // Minify scripts and replace with placeholders
  const scriptBlocks = [];
  let htmlCopy = html;
  let offset = 0;
  for (const m of scriptMatches) {
    const [full, attrs, content] = m;
    if (!content || !content.trim()) continue;
    const minified = await minifyJS(content);
    const placeholder = `__SCRIPT_${scriptBlocks.length}__`;
    scriptBlocks.push(`<script${attrs || ''}>${minified}</script>`);
    const start = m.index - offset;
    htmlCopy = htmlCopy.slice(0, start) + placeholder + htmlCopy.slice(start + full.length);
    offset += full.length - placeholder.length;
  }
  html = htmlCopy;

  // Replace style placeholders
  for (let i = 0; i < styleBlocks.length; i++) {
    html = html.replace(`__STYLE_${i}__`, `<style>${styleBlocks[i]}</style>`);
  }
  // Replace script placeholders
  for (let i = 0; i < scriptBlocks.length; i++) {
    html = html.replace(`__SCRIPT_${i}__`, scriptBlocks[i]);
  }

  // Collapse whitespace between tags
  html = html.replace(/>\s+</g, '><');
  html = html.replace(/\s{2,}/g, ' ');

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Remove unnecessary attributes
  html = html.replace(/\s+data-(\w+)=""/g, '');
  html = html.replace(/\s*type="text\/javascript"\s*/g, ' ');

  writeFileSync(output, html.trim());
  const origSize = readFileSync(input).length;
  console.log(`Bundled: ${output}`);
  console.log(`  Original: ${(origSize / 1024).toFixed(1)}KB`);
  console.log(`  Minified: ${(html.length / 1024).toFixed(1)}KB`);
}

bundle();
