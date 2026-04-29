/**
 * Yell Playground — Built-in Component Registry
 * 
 * Uses @yell/core to render playground examples.
 * Exports initPlayground() which returns { registry, renderFn, validateComponentProps }.
 * 
 * Built-in schema validation for playground components (self-contained, no external dep).
 */

import { createRegistry, registerComponent, renderToString, parseYAML } from './index.js';
import { escapeAttr, escapeText } from './renderer.js';

export { createRegistry, registerComponent, renderToString, parseYAML };

// ─── Schema types (self-contained for playground) ─────────────────────────────

export interface PropSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'node' | 'array';
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ComponentSchema {
  name: string;
  props: PropSchema[];
}

export interface ValidationError {
  type: string;
  path: string;
  message: string;
  suggestion?: string;
}

// ─── Built-in component schemas ─────────────────────────────────────────────

const builtinSchemas: Map<string, ComponentSchema> = new Map([
  ['Text', { name: 'Text', props: [
    { name: 'content', type: 'string', required: true },
    { name: 'variant', type: 'enum', enum: ['h1', 'h2', 'h3', 'p'], default: 'p' },
  ]}],
  ['Button', { name: 'Button', props: [
    { name: 'label', type: 'string', required: true },
    { name: 'variant', type: 'enum', enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
    { name: 'disabled', type: 'boolean', default: false },
    { name: 'onClick', type: 'string' },
  ]}],
  ['Container', { name: 'Container', props: [
    { name: 'layout', type: 'enum', enum: ['stack', 'row', 'grid'], default: 'stack' },
    { name: 'gap', type: 'number', default: 16 },
  ]}],
  ['Input', { name: 'Input', props: [
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'enum', enum: ['text', 'email', 'password', 'number'], default: 'text' },
    { name: 'placeholder', type: 'string', default: '' },
  ]}],
  ['Card', { name: 'Card', props: [
    { name: 'title', type: 'string', required: true },
    { name: 'description', type: 'string', default: '' },
    { name: 'badge', type: 'string' },
    { name: 'price', type: 'string' },
  ]}],
  ['Modal', { name: 'Modal', props: [
    { name: 'label', type: 'string', default: 'Confirm' },
    { name: 'body', type: 'string', default: '' },
  ]}],
  ['Header', { name: 'Header', props: [
    { name: 'logo', type: 'string', required: true },
  ]}],
  ['Sidebar', { name: 'Sidebar', props: [
    { name: 'items', type: 'string' },
  ]}],
  ['StatCard', { name: 'StatCard', props: [
    { name: 'label', type: 'string', required: true },
    { name: 'value', type: 'string', default: '0' },
  ]}],
  ['PricingCard', { name: 'PricingCard', props: [
    { name: 'tier', type: 'string', required: true },
    { name: 'price', type: 'string', required: true },
    { name: 'features', type: 'string' },
    { name: 'variant', type: 'enum', enum: ['ghost', 'solid'], default: 'ghost' },
    { name: 'featured', type: 'boolean', default: false },
  ]}],
  ['Form', { name: 'Form', props: [] }],
  ['Field', { name: 'Field', props: [
    { name: 'label', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'enum', enum: ['text', 'email', 'password', 'number'], default: 'text' },
    { name: 'default', type: 'string' },
  ]}],
  ['RepoCard', { name: 'RepoCard', props: [
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string', default: '' },
    { name: 'url', type: 'string' },
    { name: 'stars', type: 'string' },
    { name: 'language', type: 'string' },
  ]}],
  ['Counter', { name: 'Counter', props: [
    { name: 'count', type: 'number', default: 0 },
    { name: 'onIncrement', type: 'string' },
    { name: 'onDecrement', type: 'string' },
  ]}],
]);

/**
 * Validate props against built-in component schemas.
 * Returns array of ValidationError (empty = valid).
 */
export function validateComponentProps(componentName: string, props: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  const schema = builtinSchemas.get(componentName);

  if (!schema) {
    return [{ type: 'unknown_component', path: componentName, message: `Unknown component "${componentName}"` }];
  }

  for (const prop of schema.props) {
    if (prop.required && (props[prop.name] === undefined || props[prop.name] === null)) {
      errors.push({
        type: 'missing_required',
        path: `${componentName}.${prop.name}`,
        message: `Missing required prop "${prop.name}" on <${componentName}>`,
        suggestion: `Add "${prop.name}" to your component props`,
      });
    }
  }

  for (const [key, value] of Object.entries(props)) {
    const propDef = schema.props.find(p => p.name === key);
    if (!propDef) {
      errors.push({
        type: 'invalid_prop',
        path: `${componentName}.${key}`,
        message: `Unknown prop "${key}" on <${componentName}>`,
        suggestion: `Valid props: ${schema.props.map(p => p.name).join(', ')}`,
      });
      continue;
    }
    if (propDef.type === 'enum' && propDef.enum && !propDef.enum.includes(String(value))) {
      errors.push({
        type: 'invalid_enum',
        path: `${componentName}.${key}`,
        message: `Invalid value "${value}" for "${key}". Allowed: ${propDef.enum.join(', ')}`,
        suggestion: `Choose one of: ${propDef.enum.join(', ')}`,
      });
    }
  }

  return errors;
}

// ─── Component definitions ────────────────────────────────────────────────────
// Components receive nodeId for hydration support.

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

function makeButtonComponent() {
  return {
    component: ({ label, variant, disabled, onClick, nodeId }: {
      label: string; variant?: string; disabled?: boolean; onClick?: string; nodeId?: string;
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

function makeContainerComponent() {
  return {
    component: ({ layout, gap, children, nodeId }: {
      layout?: string; gap?: string | number; children?: string; nodeId?: string;
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

function makeInputComponent() {
  return {
    component: ({ name, type, placeholder, nodeId }: {
      name?: string; type?: string; placeholder?: string; nodeId?: string;
    }) => {
      name = escapeAttr(String(name || ''));
      type = escapeAttr(String(type || 'text'));
      placeholder = escapeAttr(String(placeholder || ''));
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<input type="${type}" name="${name}" placeholder="${placeholder}"${idAttr} />`;
    }
  };
}

function makeCardComponent() {
  return {
    component: ({ title, description, badge, price, nodeId }: {
      title?: string; description?: string; badge?: string; price?: string; nodeId?: string;
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

function makeModalComponent() {
  return {
    component: ({ label, body, nodeId }: { label?: string; body?: string; nodeId?: string }) => {
      label = escapeText(String(label || 'Confirm'));
      body = escapeText(String(body || ''));
      return `<div class="yell-modal-overlay" id="mOverlay"><div class="yell-modal"><h3>${label}</h3><p>${body}</p><div class="yell-modal-actions"><button class="yell-btn yell-btn--ghost" onclick="document.getElementById('mOverlay').style.display='none'">Cancel</button><button class="yell-btn yell-btn--primary" onclick="confirmAction()">Confirm</button></div></div></div><button class="yell-btn yell-btn--primary" onclick="document.getElementById('mOverlay').style.display='flex'">${label}</button>`;
    }
  };
}

function makeHeaderComponent() {
  return {
    component: ({ logo, nodeId }: { logo?: string; nodeId?: string }) => {
      logo = escapeText(String(logo || ''));
      return `<header style="display:flex;gap:24px;align-items:center;padding:16px 24px;border-bottom:1px solid #30363d"><a href="javascript:void(0)" style="font-weight:bold;font-size:18px;color:#58a6ff;text-decoration:none">${logo}</a></header>`;
    }
  };
}

function makeSidebarComponent() {
  return {
    component: ({ items, nodeId }: { items?: string; nodeId?: string }) => {
      let itemsArr: string[] = [];
      try { itemsArr = JSON.parse(items || '[]'); } catch {}
      const ul = itemsArr.map(item => `<li><a href="javascript:void(0)">${escapeText(item)}</a></li>`).join('');
      return `<aside style="padding:16px;background:#161b22;border-radius:8px;border:1px solid #30363d"><ul>${ul}</ul></aside>`;
    }
  };
}

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

function makePricingCardComponent() {
  return {
    component: ({ tier, price, features, variant, featured, nodeId }: {
      tier?: string; price?: string; features?: string; variant?: string; featured?: boolean; nodeId?: string;
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

function makeFormComponent() {
  return {
    component: ({ children, nodeId }: { children?: string; nodeId?: string }) => {
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<form class="yell-form" onsubmit="return false"${idAttr}>${children || ''}</form>`;
    }
  };
}

function makeFieldComponent() {
  return {
    component: ({ label, name, type, default: defaultVal, nodeId }: {
      label?: string; name?: string; type?: string; default?: string; nodeId?: string;
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

function makeRepoCardComponent() {
  return {
    component: ({ name, description, url, stars, language, nodeId }: {
      name?: string; description?: string; url?: string; stars?: string; language?: string; nodeId?: string;
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

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Initialize playground with @yell/core and register built-in components.
 * Returns { registry, renderFn, validateComponentProps }.
 */
function makeCounterComponent() {
  return {
    component: ({ count, onIncrement, onDecrement, nodeId }: {
      count?: number; onIncrement?: string; onDecrement?: string; nodeId?: string;
    }) => {
      const n = typeof count === 'number' ? count : 0;
      const incAttr = onIncrement ? ` data-yell-event="onClick" data-yell-handler="${escapeAttr(onIncrement)}"` : '';
      const decAttr = onDecrement ? ` data-yell-event="onClick" data-yell-handler="${escapeAttr(onDecrement)}"` : '';
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<div class="yell-counter"${idAttr} style="display:inline-flex;align-items:center;gap:12px;padding:16px 24px;border:1px solid #30363d;border-radius:12px;background:#161b22">` +
        `<button class="yell-btn yell-btn--ghost"${decAttr} style="width:36px;height:36px;font-size:1.2rem">−</button>` +
        `<span id="counter-${nodeId}" style="font-size:1.6rem;font-weight:700;min-width:40px;text-align:center">${n}</span>` +
        `<button class="yell-btn yell-btn--primary"${incAttr} style="width:36px;height:36px;font-size:1.2rem">+</button>` +
        `</div>`;
    }
  };
}

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
  registerComponent(registry, 'Counter', makeCounterComponent());

  function renderFn(yaml: string): string {
    const config = parseYAML(yaml);
    const { html } = renderToString(config, registry);
    return html;
  }

  return { registry, renderFn, validateComponentProps };
}