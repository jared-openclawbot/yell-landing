/**
 * XSS Security Tests for Renderer
 */

import { describe, it, expect } from 'vitest';
import { renderToString, createRegistry, registerComponent } from '../index.js';
import { escapeAttr } from '../renderer.js';

describe('XSS Security', () => {
  describe('escapeAttr', () => {
    it('escapes double quotes', () => {
      expect(escapeAttr('say "hi"')).toBe('say &quot;hi&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeAttr("it's fine")).toBe("it's fine"); // single quote not escaped in double-quoted attr
    });

    it('escapes angle brackets', () => {
      expect(escapeAttr('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes ampersand', () => {
      expect(escapeAttr('foo & bar')).toBe('foo &amp; bar');
    });

    it('escapes mixed injection payloads', () => {
      // Quote injection blocked — this would break out of the attribute value
      const payload = 'xss", onload="alert(1)';
      const escaped = escapeAttr(payload);
      // Double quotes must be escaped — prevents attribute breakout
      expect(escaped).not.toContain('"');
      // &quot; is safe — the whole string becomes a literal attribute value
      expect(escaped).toContain('&quot;');
    });
  });

  describe('Hydration map event binding', () => {
    function ClickBtn({ onClick, label }: Record<string, unknown>) {
      return `<button onclick="${onClick}">${label}</button>`;
    }

    it('collects onClick event names in hydration map', () => {
      const reg = createRegistry();
      registerComponent(reg, 'ClickBtn', { component: ClickBtn });

      const { hydrationMap } = renderToString({
        app: { children: [{ type: 'ClickBtn', props: { onClick: 'handleClick', label: 'Test' } }] }
      }, reg);

      const nodeIds = Object.keys(hydrationMap);
      expect(nodeIds.length).toBeGreaterThan(0);
      const firstId = nodeIds[0];
      expect(hydrationMap[firstId].events).toContain('onClick');
    });

    it('collects multiple event types', () => {
      function MultiEvent({ onClick, onMouseOver }: Record<string, unknown>) {
        return `<div onClick="${onClick}" onMouseOver="${onMouseOver}">hi</div>`;
      }
      const reg = createRegistry();
      registerComponent(reg, 'MultiEvent', { component: MultiEvent });

      const { hydrationMap } = renderToString({
        app: { children: [{ type: 'MultiEvent', props: { onClick: 'c', onMouseOver: 'm' } }] }
      }, reg);

      const nodeIds = Object.keys(hydrationMap);
      const firstId = nodeIds[0];
      expect(hydrationMap[firstId].events).toContain('onClick');
      expect(hydrationMap[firstId].events).toContain('onMouseOver');
    });

    it('does not include non-event props in hydration map', () => {
      function SomeComp({ label, onClick }: Record<string, unknown>) {
        return `<button onclick="${onClick}">${label}</button>`;
      }
      const reg = createRegistry();
      registerComponent(reg, 'SomeComp', { component: SomeComp });

      const { hydrationMap } = renderToString({
        app: { children: [{ type: 'SomeComp', props: { onClick: 'h', label: 'hi' } }] }
      }, reg);

      const events = Object.values(hydrationMap)[0].events;
      expect(events).not.toContain('label');
      expect(events).toContain('onClick');
    });
  });

  describe('Hydration in SSR output', () => {
    it('renders HTML with hydration map for interactive components', () => {
      function Interactive({ onClick }: Record<string, unknown>) {
        return `<button onclick="${onClick}">Click</button>`;
      }
      const reg = createRegistry();
      registerComponent(reg, 'Interactive', { component: Interactive });

      const { html, hydrationMap } = renderToString({
        app: { children: [{ type: 'Interactive', props: { onClick: 'doIt' } }] }
      }, reg);

      // HTML should contain the rendered component
      expect(html).toContain('<button');
      // Hydration map should have an entry
      expect(Object.keys(hydrationMap).length).toBeGreaterThan(0);
    });
  });
});
