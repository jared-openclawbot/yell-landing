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
 * Note: registered components receive `nodeId` in their props, allowing
 * them to embed data-yell-id in their HTML output for proper hydration.
 * 
 * Run: bun run examples/ssr-demo.ts
 */

import { parseYAML, createRegistry, registerComponent, registerFunction, renderToString } from '../packages/yell-core/src/index.js';

// ── Component: Button with click handler ──────────────────────────────────────
// NOTE: For SSR hydration to work, components receive `nodeId` in props.
// This allows them to embed data-yell-id in their HTML output.

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
          <span class="counter-value">${initialValue}</span>
          <button data-yell-event="onClick" data-yell-handler="increment">+1</button>
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
      return `
        <div class="modal-wrap">
          <button data-yell-event="onClick" data-yell-handler="openModal">${label}</button>
          <div class="modal-overlay" ${idAttr} style="display:none">
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
});

registerFunction('closeModal', () => {
  console.log('[handler] closeModal called');
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
        onClick: handleClick
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
console.log('1. Browser parses HTML → DOM tree with data-yell-id attributes');
console.log('2. Browser loads hydrationMap (sent as JSON or embedded in HTML)');
console.log('3. For each entry in hydrationMap:');
console.log('   - Find DOM element by data-yell-id');
console.log('   - For each event type, attach handler from global registry');
console.log('4. Now clicking buttons triggers the correct handlers');
console.log('\nNote: Registered components now receive `nodeId` in their props.');
console.log('This allows them to embed data-yell-id in their HTML output.');
console.log('The hydration map is now aligned with actual DOM elements.');

// ── Show what the browser would do ───────────────────────────────────────────

console.log('\n=== Simulated browser hydration ===\n');
if (Object.keys(hydrationMap).length === 0) {
  console.log('(hydrationMap empty — Button, Counter, Modal use nodeId in data-yell-id)');
  console.log('Check the HTML above: look for data-yell-id in the output.');
} else {
  for (const [nodeId, info] of Object.entries(hydrationMap)) {
    console.log(`Node #${nodeId} (${info.type}): attach ${info.events.join(', ')}`);
  }
}

// ── Show nodeId in action ─────────────────────────────────────────────────────

console.log('\n=== nodeId in component output ===\n');
const hasNodeId = html.includes('data-yell-id');
console.log('HTML contains data-yell-id attributes:', hasNodeId ? 'YES ✓' : 'NO ✗');
if (hasNodeId) {
  const matches = html.match(/data-yell-id="[^"]*"/g);
  console.log('Found:', matches?.join(', '));
}