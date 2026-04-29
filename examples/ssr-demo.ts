/**
 * SSR + Hydration Pattern
 * 
 * Shows how Yell SSR works:
 * 1. Server: renderToString(yaml) → HTML string + hydrationMap
 * 2. Client: hydrationMap tells browser which nodes need event handlers
 * 
 * The key insight: HTML has data-yell-id attributes, hydrationMap maps
 * id → { type, events[] }. Client queries DOM by id and attaches handlers.
 * 
 * Run: bun run examples/ssr-demo.ts
 */

import { parseYAML, createRegistry, registerComponent, registerFunction, renderToString } from '../packages/yell-core/src/index.js';

// ── Component: Button with click handler ────────────────────────────────────
// NOTE: For SSR hydration to work, components MUST include data-yell-id in output.
// The server-side renderer does NOT auto-inject this — components self-identify.

function makeButton() {
  return {
    component: ({ label, variant = 'primary', onClick }: { label: string; variant?: string; onClick?: string }) => {
      const attrs = [
        'data-yell-component="Button"',
        'data-yell-props="' + encodeURIComponent(JSON.stringify({ label, variant })) + '"',
      ].join(' ');
      return `<button class="yell-btn yell-btn--${variant}" ${attrs}>${label}</button>`;
    }
  };
}

function makeCounter() {
  return {
    component: ({ label, initialValue = 0 }: { label: string; initialValue?: number }) => {
      return `
        <div class="counter" data-yell-component="Counter" data-yell-props="${encodeURIComponent(JSON.stringify({ label, initialValue }))}">
          <span class="counter-label">${label}: </span>
          <span class="counter-value">${initialValue}</span>
          <button class="counter-btn" data-yell-event="onClick" data-yell-handler="increment">+1</button>
        </div>
      `;
    }
  };
}

function makeModal() {
  return {
    component: ({ label, body }: { label: string; body: string }) => {
      return `
        <div class="modal-wrap">
          <button class="modal-trigger" data-yell-event="onClick" data-yell-handler="openModal">${label}</button>
          <div class="modal-overlay" data-yell-component="Modal" data-yell-props="${encodeURIComponent(JSON.stringify({ label, body }))}" style="display:none">
            <div class="modal-box">
              <h3>${label}</h3>
              <p>${body}</p>
              <button data-yell-event="onClick" data-yell-handler="closeModal">Close</button>
            </div>
          </div>
        </div>
      `;
    }
  };
}

// ── Register event handlers (global function registry) ────────────────────────

registerFunction('increment', () => {
  console.log('[handler] increment called');
});

registerFunction('openModal', () => {
  console.log('[handler] openModal called');
  // In real app: document.querySelector('.modal-overlay').style.display = 'flex'
});

registerFunction('closeModal', () => {
  console.log('[handler] closeModal called');
  // In real app: document.querySelector('.modal-overlay').style.display = 'none'
});

// ── Setup registry and render ─────────────────────────────────────────────────

const registry = createRegistry();
registerComponent(registry, 'Button', makeButton());
registerComponent(registry, 'Counter', makeCounter());
registerComponent(registry, 'Modal', makeModal());

const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click me
        variant: primary
        onClick: alert("hi")
    - type: Counter
      props:
        label: Tickets
        initialValue: 7
    - type: Modal
      props:
        label: Confirm
        body: Are you sure?
`;

const config = parseYAML(yaml);
const { html, hydrationMap } = renderToString(config, registry);

console.log('=== SSR Output ===\n');
console.log('HTML (server-rendered):');
console.log(html);
console.log('\n---');
console.log('Hydration map (events to attach):');
console.log(JSON.stringify(hydrationMap, null, 2));

console.log('\n=== Client-side hydration (how browser wires it up) ===\n');
console.log('1. Browser parses HTML → DOM tree with data-yell-* attributes');
console.log('2. Browser loads hydrationMap (sent as JSON or embedded in HTML)');
console.log('3. For each entry in hydrationMap:');
console.log('   - Find DOM element by data-yell-id');
console.log('   - For each event type, attach handler from global registry');
console.log('4. Now clicking buttons triggers the correct handlers');
console.log('\nNote: current renderer uses generic fallback tags with data-yell-id.');
console.log('Registered components output their own HTML — component must self-identify.');

// ── Show what the browser would do ───────────────────────────────────────────

console.log('\n=== Simulated browser hydration ===\n');
if (Object.keys(hydrationMap).length === 0) {
  console.log('(hydrationMap empty — this is expected for registered components)');
  console.log('The registered components self-identify via data-yell-component,');
  console.log('but they don\'t have nodeIds since the component returns raw HTML.');
  console.log('\nThe fallback path (unregistered types) DOES include nodeId:');
  console.log('  <div id="yell-0" data-type="UnknownType">...</div>');
} else {
  for (const [nodeId, info] of Object.entries(hydrationMap)) {
    console.log(`Node #${nodeId} (${info.type}): attach ${info.events.join(', ')}`);
  }
}