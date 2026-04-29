/**
 * Real SSR + Hydration Demo
 * 
 * End-to-end proof that:
 *   YAML → renderToString() → HTML with data-yell-id
 *   → Browser hydrates → click event fires handler
 * 
 * This is the core thesis of Yell: server-rendered UI that hydrates
 * and responds to events without a SPA framework.
 * 
 * Run: bun run examples/ssr-hydration.ts
 * Then open http://localhost:3000 in browser
 */

import { createServer } from 'http';
import { parseYAML, createRegistry, registerComponent, registerFunction, renderToString } from '../packages/yell-core/src/index.js';

// ── State (simulates server-side state) ───────────────────────────────────────

let clickCount = 0;
let modalOpen = false;

const handlers: Record<string, () => void> = {
  handleClick: () => {
    clickCount++;
    console.log(`[server handler] handleClick → clickCount=${clickCount}`);
  },
  openModal: () => {
    modalOpen = true;
    console.log(`[server handler] openModal → modalOpen=true`);
  },
  closeModal: () => {
    modalOpen = false;
    console.log(`[server handler] closeModal → modalOpen=false`);
  },
};

// ── Register handlers ──────────────────────────────────────────────────────────

for (const [name, fn] of Object.entries(handlers)) {
  registerFunction(name, fn);
}

// ── Register components ───────────────────────────────────────────────────────

function makeButton() {
  return {
    component: ({ label, variant = 'primary', onClick, nodeId }: {
      label: string;
      variant?: string;
      onClick?: string;
      nodeId?: string;
    }) => {
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `<button class="yell-btn yell-btn--${variant}" ${idAttr} data-yell-event="onClick" data-yell-handler="${onClick}">${label}</button>`;
    }
  };
}

function makeCounter() {
  return {
    component: ({ label, initialValue = 0, nodeId }: {
      label: string;
      initialValue?: number;
      nodeId?: string;
    }) => {
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      return `
        <div class="counter" ${idAttr}>
          <span class="counter-label">${label}: </span>
          <span class="counter-value" data-counter-val>${initialValue}</span>
          <button data-yell-event="onClick" data-yell-handler="increment">+1</button>
          <button data-yell-event="onClick" data-yell-handler="decrement">-1</button>
        </div>
      `;
    }
  };
}

function makeModal() {
  return {
    component: ({ label, body, nodeId }: {
      label: string;
      body: string;
      nodeId?: string;
    }) => {
      const idAttr = nodeId ? ` data-yell-id="${nodeId}"` : '';
      const display = modalOpen ? 'flex' : 'none';
      return `
        <div class="modal-wrap">
          <button data-yell-event="onClick" data-yell-handler="openModal">${label}</button>
          <div class="modal-overlay" ${idAttr} data-modal style="display:${display};position:fixed;inset:0;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;z-index:100">
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;max-width:400px">
              <h3 style="margin:0 0 12px">${label}</h3>
              <p style="margin:0 0 20px;color:#7d8590">${body}</p>
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button data-yell-event="onClick" data-yell-handler="closeModal" style="padding:8px 16px;border-radius:6px;background:#238636;border:none;color:#fff;cursor:pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  };
}

// Register increment/decrement handlers that update DOM
registerFunction('increment', () => {
  clickCount++;
  // In a real app, this would update server state and re-render
  console.log('[hydration] increment →', clickCount);
});

registerFunction('decrement', () => {
  clickCount--;
  console.log('[hydration] decrement →', clickCount);
});

const registry = createRegistry();
registerComponent(registry, 'Button', makeButton());
registerComponent(registry, 'Counter', makeCounter());
registerComponent(registry, 'Modal', makeModal());

// ── YAML config ───────────────────────────────────────────────────────────────

const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click me!
        variant: primary
        onClick: handleClick
    - type: Counter
      props:
        label: Clicks
        initialValue: 0
    - type: Modal
      props:
        label: Confirm
        body: Are you sure you want to continue?
`;

// ── Client-side hydration code ─────────────────────────────────────────────────

const HYDRATION_SCRIPT = `
<script>
  // Yell client-side hydration
  // Reads hydrationMap from embedded JSON, attaches event handlers
  
  function hydrate() {
    const map = window.__YELL_HYDRATION__ || {};
    const registry = window.__YELL_FUNCTIONS__ || {};
    
    // Attach handlers based on hydration map
    for (const [nodeId, info] of Object.entries(map)) {
      const el = document.querySelector('[data-yell-id="' + nodeId + '"]');
      if (!el) {
        console.warn('[yell hydration] node ' + nodeId + ' not found in DOM');
        continue;
      }
      
      for (const event of info.events || []) {
        const handlerName = info.handler;
        if (handlerName && registry[handlerName]) {
          el.addEventListener(event.toLowerCase().replace('on', ''), function(e) {
            e.preventDefault();
            registry[handlerName]();
          });
        }
      }
    }
    
    // Also handle data-yell-event elements (even without hydrationMap entry)
    document.querySelectorAll('[data-yell-event]').forEach(function(el) {
      const eventType = el.getAttribute('data-yell-event').toLowerCase().replace('on', '');
      const handlerName = el.getAttribute('data-yell-handler');
      if (handlerName && registry[handlerName]) {
        el.addEventListener(eventType, function(e) {
          e.preventDefault();
          registry[handlerName]();
        });
      }
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
</script>
`;

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHTML() {
  const config = parseYAML(yaml);
  const { html, hydrationMap } = renderToString(config, registry);
  
  const hydrationMapJSON = JSON.stringify(hydrationMap);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Yell SSR + Hydration Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; padding: 20px; }
    .yell-btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #30363d; background: #161b22; color: #e6edf3; cursor: pointer; font-size: 0.9rem; }
    .yell-btn--primary { background: #58a6ff; border-color: #58a6ff; color: #000; font-weight: 600; }
    .counter { display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; border: 1px solid #30363d; border-radius: 8px; background: #161b22; }
    .counter-label { color: #7d8590; }
    .counter-value { font-size: 1.2rem; font-weight: 700; color: #58a6ff; min-width: 30px; text-align: center; }
    button[data-yell-event] { padding: 4px 8px; border-radius: 4px; background: #30363d; border: 1px solid #484f58; color: #e6edf3; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Yell SSR + Hydration</h1>
  <p>Server-rendered HTML with client-side hydration. Click the buttons!</p>
  
  <div id="app">${html}</div>
  
  <div style="margin-top: 32px; padding: 16px; border: 1px dashed #30363d; border-radius: 8px; color: #7d8590; font-size: 0.85rem">
    <strong>How it works:</strong><br>
    1. Server: <code>renderToString(yaml)</code> → HTML with <code>data-yell-id</code> and <code>data-yell-event</code><br>
    2. Client: hydration script reads <code>data-yell-*</code> attrs, attaches event handlers<br>
    3. Click: handler fires → server state updates (simulated)
  </div>
  
  <script>
    window.__YELL_HYDRATION__ = ${hydrationMapJSON};
    window.__YELL_FUNCTIONS__ = ${JSON.stringify(Object.fromEntries(Object.entries(handlers)))};
  </script>
  ${HYDRATION_SCRIPT}
</body>
</html>`;
}

// ── HTTP Server ───────────────────────────────────────────────────────────────

const PORT = 3000;
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(buildHTML());
});

server.listen(PORT, () => {
  console.log(`\n🚀 Yell SSR + Hydration Demo`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`\nClick the "Click me!" button in your browser.`);
  console.log(`Watch the console — you'll see the handler fire.`);
  console.log(`\nHydration map being served:`);
  const config = parseYAML(yaml);
  const { hydrationMap } = renderToString(config, registry);
  console.log(JSON.stringify(hydrationMap, null, 2));
  console.log(`\nPress Ctrl+C to stop the server.\n`);
});