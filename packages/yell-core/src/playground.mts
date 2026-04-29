/**
 * Yell Playground — Built-in Component Registry
 * 
 * Uses @yell/core to render playground examples.
 * Exports initPlayground() which returns { registry, renderFn }.
 */

import { createRegistry, registerComponent, renderToString, parseYAML } from './index.js';
import { escapeAttr, escapeText } from './renderer.js';

// Re-export for playground use
export { createRegistry, registerComponent, renderToString, parseYAML };

// ─── Built-in component definitions ──────────────────────────────────────────
// These mirror the playground's built-in types (Text, Button, etc.)
// Registered when initPlayground() is called.
// Components receive nodeId for hydration support.

// ── Text ──────────────────────────────────────────────────────────────────────

function makeTextComponent() {
  return {
    component: ({ content, variant, nodeId }: { content: string; variant?: string; nodeId?: string }) => {
      content = escapeText(String(content || ''));
      variant = variant || 'p';
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      if (variant === 'h1') return `<h1${idAttr}>${content}</h1>`;
      if (variant === 'h2') return `<h2${idAttr}>${content}</h2>`;
      if (variant === 'h3') return `<h3${idAttr}>${content}</h3>`;
      return `<p${idAttr}>${content}</p>`;
    }
  };
}

// ── Button ─────────────────────────────────────────────────────────────────────

function makeButtonComponent() {
  return {
    component: ({ label, variant, disabled, onClick, nodeId }: { 
      label: string; 
      variant?: string; 
      disabled?: boolean;
      onClick?: string;
      nodeId?: string;
    }) => {
      label = escapeText(String(label || ''));
      variant = escapeAttr(String(variant || 'primary'));
      const disabledAttr = disabled ? ' disabled' : '';
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      const eventAttr = onClick ? ` data-yell-event="onClick" data-yell-handler="${escapeAttr(onClick)}"` : '';
      return `<button class="yell-btn yell-btn--${variant}"${idAttr}${eventAttr}${disabledAttr}>${label}</button>`;
    }
  };
}

// ── Container ─────────────────────────────────────────────────────────────────

function makeContainerComponent() {
  return {
    component: ({ layout, gap, children, nodeId }: { 
      layout?: string; 
      gap?: string | number; 
      children?: string;
      nodeId?: string;
    }) => {
      layout = layout || 'stack';
      gap = String(gap || '16');
      let style = '';
      if (layout === 'grid') style = `display:grid;gap:${gap}px`;
      else if (layout === 'stack') style = `display:flex;flex-direction:column;gap:${gap}px`;
      else if (layout === 'row') style = `display:flex;gap:${gap}px`;
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<div style="${style}"${idAttr}>${children || ''}</div>`;
    }
  };
}

// ── Input ─────────────────────────────────────────────────────────────────────

function makeInputComponent() {
  return {
    component: ({ name, type, placeholder, nodeId }: { 
      name?: string; 
      type?: string; 
      placeholder?: string;
      nodeId?: string;
    }) => {
      name = escapeAttr(String(name || ''));
      type = escapeAttr(String(type || 'text'));
      placeholder = escapeAttr(String(placeholder || ''));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<input type="${type}" name="${name}" placeholder="${placeholder}"${idAttr} />`;
    }
  };
}

// ── Card ─────────────────────────────────────────────────────────────────────

function makeCardComponent() {
  return {
    component: ({ title, description, badge, price, nodeId }: { 
      title?: string; 
      description?: string; 
      badge?: string;
      price?: string;
      nodeId?: string;
    }) => {
      title = escapeText(String(title || ''));
      description = escapeText(String(description || ''));
      badge = escapeText(String(badge || ''));
      price = escapeText(String(price || ''));
      const badgeHtml = badge && badge !== 'none' ? `<span class="badge badge--${escapeAttr(badge)}">${badge}</span>` : '';
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<div class="yell-card"${idAttr}>${badgeHtml}<h3>${title}</h3><p>${description}</p><div class="price">${price}</div></div>`;
    }
  };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function makeModalComponent() {
  return {
    component: ({ label, body, nodeId }: { label?: string; body?: string; nodeId?: string }) => {
      label = escapeText(String(label || 'Confirm'));
      body = escapeText(String(body || ''));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      // Uses global confirmAction from playground.html
      return `<div class="yell-modal-overlay" id="mOverlay"><div class="yell-modal"><h3>${label}</h3><p>${body}</p><div class="yell-modal-actions"><button class="yell-btn yell-btn--ghost" onclick="document.getElementById('mOverlay').style.display='none'">Cancel</button><button class="yell-btn yell-btn--primary" onclick="confirmAction()">Confirm</button></div></div></div><button class="yell-btn yell-btn--primary" onclick="document.getElementById('mOverlay').style.display='flex'">${label}</button>`;
    }
  };
}

// ── Header ─────────────────────────────────────────────────────────────────────

function makeHeaderComponent() {
  return {
    component: ({ logo, nodeId }: { logo?: string; nodeId?: string }) => {
      logo = escapeText(String(logo || ''));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<header style="display:flex;gap:24px;align-items:center;padding:16px 24px;border-bottom:1px solid #30363d"${idAttr}><a href="javascript:void(0)" style="font-weight:bold;font-size:18px;color:#58a6ff;text-decoration:none">${logo}</a></header>`;
    }
  };
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function makeSidebarComponent() {
  return {
    component: ({ items, nodeId }: { items?: string; nodeId?: string }) => {
      let itemsArr: string[] = [];
      try { itemsArr = JSON.parse(items || '[]'); } catch {}
      const ul = itemsArr.map(item => `<li><a href="javascript:void(0)">${escapeText(item)}</a></li>`).join('');
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<aside style="padding:16px;background:#161b22;border-radius:8px;border:1px solid #30363d"${idAttr}><ul>${ul}</ul></aside>`;
    }
  };
}

// ── StatCard ───────────────────────────────────────────────────────────────────

function makeStatCardComponent() {
  return {
    component: ({ label, value, nodeId }: { label?: string; value?: string; nodeId?: string }) => {
      label = escapeText(String(label || ''));
      value = escapeText(String(value || '0'));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<div class="stat-card"${idAttr}><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
    }
  };
}

// ── PricingCard ───────────────────────────────────────────────────────────────

function makePricingCardComponent() {
  return {
    component: ({ tier, price, features, variant, featured, nodeId }: { 
      tier?: string; 
      price?: string; 
      features?: string;
      variant?: string;
      featured?: boolean;
      nodeId?: string;
    }) => {
      tier = escapeText(String(tier || ''));
      price = escapeText(String(price || ''));
      variant = escapeAttr(String(variant || 'ghost'));
      let items: string[] = [];
      try { items = JSON.parse(features || '[]'); } catch {}
      const featuredClass = featured ? ' featured' : '';
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<div class="pricing-card${featuredClass}"${idAttr}><h3>${tier}</h3><div class="price">${price}</div><ul>${items.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul></div>`;
    }
  };
}

// ── Form ──────────────────────────────────────────────────────────────────────

function makeFormComponent() {
  return {
    component: ({ children, nodeId }: { children?: string; nodeId?: string }) => {
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<form class="yell-form" onsubmit="return false"${idAttr}>${children || ''}</form>`;
    }
  };
}

// ── Field ─────────────────────────────────────────────────────────────────────

function makeFieldComponent() {
  return {
    component: ({ label, name, type, default: defaultVal, nodeId }: { 
      label?: string; 
      name?: string; 
      type?: string;
      default?: string;
      nodeId?: string;
    }) => {
      label = escapeText(String(label || ''));
      name = escapeAttr(String(name || ''));
      type = escapeAttr(String(type || 'text'));
      defaultVal = escapeAttr(String(defaultVal || ''));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<div class="field"${idAttr}><label>${label}</label><input type="${type}" name="${name}" value="${defaultVal}" /></div>`;
    }
  };
}

// ── RepoCard ───────────────────────────────────────────────────────────────────

function makeRepoCardComponent() {
  return {
    component: ({ name, description, url, stars, language, nodeId }: { 
      name?: string; 
      description?: string; 
      url?: string;
      stars?: string;
      language?: string;
      nodeId?: string;
    }) => {
      name = escapeText(String(name || ''));
      description = escapeText(String(description || ''));
      url = escapeAttr(String(url || '#'));
      stars = escapeText(String(stars || '0'));
      language = escapeText(String(language || ''));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<a class="repo-card" href="${url}" target="_blank"${idAttr}><div class="repo-name">${name}</div><div class="repo-desc">${description}</div><div class="repo-meta"><span class="repo-stars">${stars} stars</span> ${language}</div></a>`;
    }
  };
}

// ── Init ───────────────────────────────────────────────────────────────────────

/**
 * Initialize playground with @yell/core and register built-in components.
 * Returns { registry, renderFn }.
 */
export function initPlayground() {
  const registry = createRegistry();
  
  registerComponent(registry, 'Text', makeTextComponent());
  registerComponent(registry, 'Button', makeButtonComponent());
  registerComponent(registry, 'Container', makeContainerComponent());
  registerComponent(registry, 'Input', makeInputComponent());
  registerComponent(registry, 'Card', makeCardComponent());
  registerComponent(registry, 'Modal', makeModalComponent());
  registerComponent(registry, 'Header', makeHeaderComponent());
  registerComponent(registry, 'Sidebar', makeSidebarComponent());
  registerComponent(registry, 'StatCard', makeStatCardComponent());
  registerComponent(registry, 'PricingCard', makePricingCardComponent());
  registerComponent(registry, 'Form', makeFormComponent());
  registerComponent(registry, 'Field', makeFieldComponent());
  registerComponent(registry, 'RepoCard', makeRepoCardComponent());
  
  function renderFn(yaml: string): string {
    const config = parseYAML(yaml);
    const { html } = renderToString(config, registry);
    return html;
  }
  
  return { registry, renderFn };
}