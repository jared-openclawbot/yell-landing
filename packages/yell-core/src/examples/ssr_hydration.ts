/**
 * SSR + Hydration Example
 * 
 * Demonstrates the full flow:
 * YAML → SSR render → hydration map → browser event binding
 */

import { renderToString, createRegistry, registerComponent } from './index.js';

// Component that accepts an event handler
const Button = ({ label = 'Click me', onClick, count, children }: Record<string, unknown>) => {
  return `<button class="yell-btn" data-count="${count ?? 0}">${label || String(children)} (${count ?? 0})</button>`;
};

// Counter display
const Counter = ({ value = 0 }: Record<string, unknown>) => {
  return `<div class="counter" data-value="${value}">Count: ${value}</div>`;
};

// Build registry with components that have events
function buildExampleRegistry() {
  const registry = createRegistry();
  registerComponent(registry, 'Button', { component: Button });
  registerComponent(registry, 'Counter', { component: Counter });
  return registry;
}

// YAML config with an event-binding component
const yaml = `
tokens:
  brand:
    primary: "#FF8A3D"

app:
  shell:
    type: div
    props:
      class: page
    children:
      - type: Counter
        props:
          value: 0
      - type: Button
        props:
          label: Increment
          onClick: incrementCounter
`;

// Parse the YAML (normally done by parseYAML from parser.ts)
// For this example, we'll manually construct the config
interface YellNode {
  type: string;
  props?: Record<string, unknown>;
  children?: YellNode[];
}

const config = {
  tokens: { brand: { primary: '#FF8A3D' } },
  app: {
    shell: {
      type: 'div',
      props: { class: 'page' },
      children: [
        { type: 'Counter', props: { value: 0 }, children: [] },
        { type: 'Button', props: { label: 'Increment', onClick: 'incrementCounter' }, children: [] },
      ],
    } as YellNode,
  },
};

export function runExample() {
  const registry = buildExampleRegistry();

  // Step 1: SSR — render to HTML string
  const { html, hydrationMap } = renderToString(config, registry, { registry });

  console.log('=== SSR HTML ===');
  console.log(html);
  console.log('\n=== Hydration Map ===');
  console.log(JSON.stringify(hydrationMap, null, 2));

  // Step 2: Browser-side hydration
  // Normally done by yell-core's client-side hydration code
  // This is what the hydration map enables:
  //
  // const hydrate = (hydrationMap) => {
  //   for (const [nodeId, info] of Object.entries(hydrationMap)) {
  //     const el = document.getElementById(nodeId);
  //     if (!el) continue;
  //     for (const event of info.events) {
  //       if (event === 'onClick') {
  //         el.addEventListener('click', () => {
  //           // Dispatch event to the event bus
  //           window.__yellEvents.emit(`node:${nodeId}:${event}`, {
  //             nodeId,
  //             event,
  //             currentCount: parseInt(el.dataset.count || '0'),
  //           });
  //         });
  //       }
  //     }
  //   }
  // };

  // Step 3: Event handling
  // In a real app, event handlers would be wired up here.
  // For this example, the Button's onClick references incrementCounter
  // which would be defined by the application developer.

  return { html, hydrationMap };
}

// If run directly
runExample();
