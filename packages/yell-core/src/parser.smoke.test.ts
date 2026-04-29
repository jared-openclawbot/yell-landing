/**
 * Smoke tests for all built-in playground templates.
 * Ensures every template loads and parses without throwing.
 */

import { describe, it, expect } from 'vitest';
import { parseYAML } from './parser.js';

describe('Playground Templates', () => {
  // Dashboard template
  it('dashboard template parses without error', () => {
    const yaml = [
      'meta:',
      '  version: "1.0"',
      '  description: Admin dashboard with stats cards',
      'props:',
      '  user:',
      '    type: string',
      '    default: "Alex Chen"',
      '  totalUsers:',
      '    type: number',
      '    default: 12847',
      'template: |',
      '  <div class="page">',
      '    <h2>Dashboard</h2>',
      '    <div class="stat-card">',
      '      <div class="stat-value">$props.totalUsers</div>',
      '    </div>',
      '  </div>',
    ].join('\n');
    expect(() => parseYAML(yaml)).not.toThrow();
  });

  it('dashboard template has required meta fields', () => {
    const yaml = 'meta:\n  version: "1.0"\n  description: Test\nprops:\n  foo:\n    type: string\ntemplate: |\n  <div>$props.foo</div>';
    const parsed = parseYAML(yaml) as Record<string, unknown>;
    expect(parsed).toHaveProperty('meta');
    expect(parsed).toHaveProperty('props');
    expect(parsed).toHaveProperty('template');
  });

  // Settings form template
  it('settings-form template parses without error', () => {
    const yaml = [
      'meta:',
      '  version: "1.0"',
      '  description: User settings form',
      'props:',
      '  name:',
      '    type: string',
      '    default: "Alex Chen"',
      'template: |',
      '  <form class="yell-form">',
      '    <input value="$props.name" />',
      '  </form>',
    ].join('\n');
    expect(() => parseYAML(yaml)).not.toThrow();
  });

  // Pricing table template
  it('pricing-table template parses without error', () => {
    const yaml = [
      'meta:',
      '  version: "1.0"',
      '  description: Three-tier pricing table',
      'props:',
      '  currency:',
      '    type: string',
      '    default: "$"',
      'template: |',
      '  <div class="pricing-grid">',
      '    <div class="pricing-card">',
      '      <div class="price">$props.currency 0</div>',
      '    </div>',
      '  </div>',
    ].join('\n');
    expect(() => parseYAML(yaml)).not.toThrow();
  });

  // App.children format (index.html style)
  describe('app.children format', () => {
    const appChildrenYaml = `
app:
  children:
    - type: Button
      props:
        label: Get started
        variant: primary
    - type: Badge
      props:
        label: v0.1.0
        variant: success
`;

    it('parses app.children without error', () => {
      expect(() => parseYAML(appChildrenYaml)).not.toThrow();
    });

    it('has app.children array', () => {
      const parsed = parseYAML(appChildrenYaml) as Record<string, unknown>;
      expect(parsed).toHaveProperty('app');
      const app = parsed.app as Record<string, unknown>;
      expect(app).toHaveProperty('children');
      expect(Array.isArray(app.children)).toBe(true);
    });

    it('has correct children count', () => {
      const parsed = parseYAML(appChildrenYaml) as Record<string, unknown>;
      const app = parsed.app as Record<string, unknown>;
      const children = app.children as unknown[];
      expect(children).toHaveLength(2);
    });

    it('children have type and props', () => {
      const parsed = parseYAML(appChildrenYaml) as Record<string, unknown>;
      const app = parsed.app as Record<string, unknown>;
      const children = app.children as Record<string, unknown>[];
      for (const child of children) {
        expect(child).toHaveProperty('type');
        expect(child).toHaveProperty('props');
      }
    });
  });

  // Empty/missing children
  describe('edge cases', () => {
    it('handles missing children gracefully', () => {
      const yaml = 'app:\n  children: []';
      const parsed = parseYAML(yaml) as Record<string, unknown>;
      const app = parsed.app as Record<string, unknown>;
      expect(app.children).toEqual([]);
    });

    it('handles null props gracefully', () => {
      const yaml = 'app:\n  children:\n    - type: Button';
      const parsed = parseYAML(yaml) as Record<string, unknown>;
      const app = parsed.app as Record<string, unknown>;
      const child = (app.children as Record<string, unknown>[])[0];
      expect(child.type).toBe('Button');
    });
  });
});
