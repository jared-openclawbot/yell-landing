import { describe, it, expect } from 'vitest';
import {
  parseYAML,
  createRegistry,
  registerComponent,
  renderToString,
} from '../src/index.js';

/**
 * Render performance benchmarks.
 * These are NOT strict performance tests — they document expected render times
 * and catch regressions, not enforce exact limits.
 */
describe('Render Performance Benchmarks', () => {
  let registry: ReturnType<typeof createRegistry>;

  beforeEach(() => {
    registry = createRegistry();
    registerComponent(registry, 'Text', {
      component: ({ content }: { content?: string }) => `<span>${content || ''}</span>`,
    });
    registerComponent(registry, 'Button', {
      component: ({ label }: { label?: string }) => `<button>${label || ''}</button>`,
    });
    registerComponent(registry, 'Container', {
      component: ({ layout, gap, children }: { layout?: string; gap?: number; children?: string }) =>
        `<div class="container-${layout || 'stack'}" style="gap:${gap || 0}px">${children || ''}</div>`,
    });
    registerComponent(registry, 'Card', {
      component: ({ title, body }: { title?: string; body?: string }) =>
        `<div class="card"><h3>${title || ''}</h3><p>${body || ''}</p></div>`,
    });
  });

  function buildNestedYAML(depth: number): string {
    if (depth === 0) {
      return `
app:
  children:
    - type: Text
      props:
        content: Leaf
`;
    }
    return `
app:
  children:
    - type: Container
      layout: stack
      gap: 8
      children:
${buildNestedYAML(depth - 1)
  .split('\n')
  .map((l: string) => '        ' + l)
  .join('\n')
  .trim()}
`;
  }

  it('renders simple page under 50ms', () => {
    const yaml = `
app:
  children:
    - type: Text
      props:
        content: Hello
    - type: Button
      props:
        label: Click
`;
    const config = parseYAML(yaml);
    const start = performance.now();
    renderToString(config, registry);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('renders 100 siblings under 100ms', () => {
    const buttons = Array.from({ length: 100 }, (_, i) => `    - type: Button\n      props:\n        label: Button ${i}`).join('\n');
    const yaml = `\napp:\n  children:\n${buttons}`;
    const config = parseYAML(yaml);
    const start = performance.now();
    renderToString(config, registry);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('renders deeply nested tree (depth 10) under 100ms', () => {
    const yaml = buildNestedYAML(10);
    const config = parseYAML(yaml);
    const start = performance.now();
    renderToString(config, registry);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('renders complex page (20 components) under 100ms', () => {
    const yaml = `
app:
  children:
    - type: Container
      layout: stack
      gap: 16
      children:
        - type: Text
          props:
            content: Dashboard
        - type: Container
          layout: grid
          gap: 24
          children:
            - type: Card
              props:
                title: Card 1
                body: Description
            - type: Card
              props:
                title: Card 2
                body: Description
            - type: Card
              props:
                title: Card 3
                body: Description
            - type: Card
              props:
                title: Card 4
                body: Description
        - type: Button
          props:
            label: Load more
`;
    const config = parseYAML(yaml);
    const start = performance.now();
    renderToString(config, registry);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('parseYAML is under 10ms for typical page', () => {
    const yaml = `
tokens:
  colors:
    primary: '#ff8a3d'
app:
  shell:
    layout: stack
    gap: 24
  children:
    - type: Container
      layout: grid
      gap: 16
      children:
        - type: Card
          props:
            title: Welcome
            body: Get started here
        - type: Card
          props:
            title: Learn more
            body: Read the docs
    - type: Button
      props:
        label: Submit
`;
    const start = performance.now();
    parseYAML(yaml);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});
