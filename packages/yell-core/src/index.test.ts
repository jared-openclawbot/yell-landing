import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseYAML,
  createRegistry,
  registerComponent,
  registerFunction,
  renderToString,
  flattenConfig,
  validateConfig,
} from '../src/index.js';

describe('@yell/core', () => {
  describe('parseYAML', () => {
    it('parses basic YAML to YellConfig', () => {
      const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click
`;
      const config = parseYAML(yaml);
      expect(config.app?.children?.[0].type).toBe('Button');
      expect(config.app?.children?.[0].props?.label).toBe('Click');
    });

    it('parses shell with layout', () => {
      const yaml = `
app:
  shell:
    type: Container
    layout: stack
    gap: 24
`;
      const config = parseYAML(yaml);
      expect(config.app?.shell?.type).toBe('Container');
      expect(config.app?.shell?.layout).toBe('stack');
      expect(config.app?.shell?.gap).toBe(24);
    });

    it('parses nested children', () => {
      const yaml = `
app:
  children:
    - type: Container
      children:
        - type: Button
        - type: Text
`;
      const config = parseYAML(yaml);
      const container = config.app?.children?.[0];
      expect(container?.children?.length).toBe(2);
      expect(container?.children?.[0].type).toBe('Button');
    });

    it('parses tokens section', () => {
      const yaml = `
tokens:
  colors:
    primary: '#ff8a3d'
app:
  children:
    - type: Button
`;
      const config = parseYAML(yaml);
      expect(config.tokens?.colors?.primary).toBe('#ff8a3d');
    });

    it('parses empty config', () => {
      const yaml = '';
      const config = parseYAML(yaml);
      expect(config).toBeDefined();
    });
  });

  describe('createRegistry + registerComponent', () => {
    it('registers and retrieves a component', () => {
      const registry = createRegistry();
      registerComponent(registry, 'Button', { component: () => '<button/>' });

      const def = registry.get('Button');
      expect(def).toBeDefined();
      expect(def?.type).toBe('Button');
    });

    it('registers multiple components', () => {
      const registry = createRegistry();
      registerComponent(registry, 'Button', { component: () => '<button/>' });
      registerComponent(registry, 'Text', { component: () => '<span/>' });

      expect(registry.size).toBe(2);
    });

    it('overwrites existing component', () => {
      const registry = createRegistry();
      registerComponent(registry, 'Button', { component: () => '<button v1/>' });
      registerComponent(registry, 'Button', { component: () => '<button v2/>' });

      expect(registry.get('Button')).toBeDefined();
    });
  });

  describe('renderToString', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
      registerComponent(registry, 'Button', {
        component: ({ label }) => `<button>${label || ''}</button>`,
      });
      registerComponent(registry, 'Text', {
        component: ({ content }) => `<span>${content || ''}</span>`,
      });
      registerComponent(registry, 'Container', {
        component: ({ layout, gap, children }) =>
          `<div class="container-${layout}" style="gap:${gap}px">${children || ''}</div>`,
      });
    });

    it('renders a single component', () => {
      const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, registry);
      expect(html).toContain('<button>Click</button>');
    });

    it('renders nested components', () => {
      const yaml = `
app:
  children:
    - type: Container
      layout: stack
      gap: 16
      children:
        - type: Text
          props:
            content: Hello
        - type: Button
          props:
            label: Go
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, registry);
      expect(html).toContain('class="container-stack"');
      expect(html).toContain('gap:16px');
      expect(html).toContain('<span>Hello</span>');
      expect(html).toContain('<button>Go</button>');
    });

    it('resolves design tokens', () => {
      // Register a component that uses style
      registerComponent(registry, 'StyledButton', {
        component: ({ label, backgroundColor }: { label?: string; backgroundColor?: string }) =>
          `<button style="background:${backgroundColor || ''}">${label || ''}</button>`,
      });

      const yaml = `
tokens:
  colors:
    brand: '#ff8800'
app:
  children:
    - type: StyledButton
      props:
        label: Click
        backgroundColor: \$tokens.colors.brand
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, registry);
      expect(html).toContain('#ff8800');
    });

    it('populates hydrationMap with event handlers', () => {
      const yaml = `
app:
  children:
    - type: Button
      props:
        onClick: handleClick
`;
      const config = parseYAML(yaml);
      const { hydrationMap } = renderToString(config, registry);
      const nodeId = Object.keys(hydrationMap)[0];
      expect(hydrationMap[nodeId]?.events).toContain('onClick');
    });

    // Issue #32: XSS prevention — escape text content by default
    it('escapes HTML in Text content prop', () => {
      const yaml = `app:
  children:
    - type: Text
      props:
        content: "<script>alert('XSS')</script>"
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, registry);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes & in text content', () => {
      const yaml = `app:
  children:
    - type: Text
      props:
        content: "Tom & Jerry"
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, registry);
      expect(html).toContain('Tom &amp; Jerry');
    });

    it('escapes HTML in Button label prop (registered component)', () => {
      // escapeText runs before props reach the component, so < becomes &lt;
      // The escaped string is rendered as text, not parsed as HTML — safe
      const yaml = `app:
  children:
    - type: Button
      props:
        label: "<script>alert(1)</script>"
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, registry);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('XSS prevention (standalone)', () => {
    // These tests set up their own registry
    it('escapes HTML in Card title prop', () => {
      const reg = createRegistry();
      registerComponent(reg, 'Card', {
        component: ({ title, description }: any) =>
          `<div class="card"><h3>${title || ''}</h3><p>${description || ''}</p></div>`,
      });
      const yaml = `app:
  children:
    - type: Card
      props:
        title: "Hello <b>World</b>"
        description: "desc"
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, reg);
      expect(html).not.toContain('<b>World</b>');
      expect(html).toContain('&lt;b&gt;World&lt;/b&gt;');
    });
  });

  describe('flattenConfig', () => {
    it('flattens shell children', () => {
      const yaml = `
app:
  shell:
    type: Container
    children:
      - type: Button
      - type: Text
`;
      const config = parseYAML(yaml);
      const nodes = flattenConfig(config);
      expect(nodes.length).toBe(3); // Container + Button + Text
    });
  });

  describe('validateConfig', () => {
    it('returns errors for unknown components', () => {
      const registry = createRegistry();
      registerComponent(registry, 'Button', { component: () => '' });

      const yaml = `
app:
  children:
    - type: FakeComponent
`;
      const config = parseYAML(yaml);
      const errors = validateConfig(config, registry);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('FakeComponent');
    });

    it('returns no errors for known components', () => {
      const registry = createRegistry();
      registerComponent(registry, 'Button', { component: () => '' });

      const yaml = `
app:
  children:
    - type: Button
`;
      const config = parseYAML(yaml);
      const errors = validateConfig(config, registry);
      expect(errors.length).toBe(0);
    });
  });


  describe('function registry', () => {
    it('resolves onClick string to registered function', () => {
      const reg = createRegistry();
      registerFunction('handleClick', () => '<strong>clicked</strong>');
      registerComponent(reg, 'Button', {
        component: ({ label, onClick }: any) =>
          `<button>${label || ''} ${typeof onClick === 'function' ? '(fn resolved)' : '(no fn)'}</button>`,
      });
      const yaml = `app:
  children:
    - type: Button
      props:
        label: "Click me"
        onClick: handleClick
`;
      const config = parseYAML(yaml);
      const { html } = renderToString(config, reg);
      // onClick should be resolved to actual function, not a string
      expect(html).toContain('(fn resolved)');
      expect(html).not.toContain('handleClick');
    });
  });
});
