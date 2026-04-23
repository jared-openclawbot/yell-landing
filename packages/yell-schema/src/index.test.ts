import { describe, it, expect } from 'vitest';
import {
  createSchemaRegistry,
  registerComponentSchema,
  validateProps,
  getComponentManifest,
  buildSystemPromptSection,
} from '../src/index.js';

describe('@yell/schema', () => {
  describe('createSchemaRegistry', () => {
    it('creates empty registry', () => {
      const registry = createSchemaRegistry();
      expect(registry.schemas.size).toBe(0);
    });
  });

  describe('registerComponentSchema', () => {
    it('registers a component schema', () => {
      const registry = createSchemaRegistry();
      registerComponentSchema(registry, {
        name: 'Button',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'variant', type: 'enum', enum: ['primary', 'secondary'] },
        ],
      });
      expect(registry.schemas.size).toBe(1);
    });

    it('registers with version', () => {
      const registry = createSchemaRegistry();
      registerComponentSchema(registry, {
        name: 'Button',
        version: 'v2',
        props: [{ name: 'label', type: 'string' }],
      });
      expect(registry.schemas.get('Button@v2')).toBeDefined();
    });
  });

  describe('validateProps', () => {
    let registry: ReturnType<typeof createSchemaRegistry>;

    beforeEach(() => {
      registry = createSchemaRegistry();
      registerComponentSchema(registry, {
        name: 'Button',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'variant', type: 'enum', enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
          { name: 'disabled', type: 'boolean', default: false },
        ],
      });
    });

    it('returns no errors for valid props', () => {
      const errors = validateProps('Button', { label: 'Click', variant: 'primary' }, registry);
      expect(errors).toHaveLength(0);
    });

    it('returns error for invalid enum value', () => {
      const errors = validateProps('Button', { label: 'Click', variant: 'invalid' }, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid_enum');
      expect(errors[0].path).toBe('Button.variant');
      expect(errors[0].suggestion).toBeDefined();
    });

    it('returns error for missing required prop', () => {
      const errors = validateProps('Button', {}, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('missing_required');
      expect(errors[0].path).toBe('Button.label');
    });

    it('returns error for unknown component', () => {
      const errors = validateProps('Fake', {}, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('unknown_component');
    });

    it('returns error for unknown prop', () => {
      const errors = validateProps('Button', { label: 'Click', fakeProp: 'x' }, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid_prop');
    });

    it('returns no errors when prop not provided and has default', () => {
      const errors = validateProps('Button', { label: 'Click' }, registry);
      expect(errors).toHaveLength(0);
    });

    it('validates type: string', () => {
      const errors = validateProps('Button', { label: 123 } as any, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid_type');
    });

    it('validates type: number', () => {
      registry.schemas.get('Button')!.props.push({ name: 'count', type: 'number' });
      const errors = validateProps('Button', { label: 'Click', count: 'not a number' } as any, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid_type');
    });

    it('validates type: boolean', () => {
      const errors = validateProps('Button', { label: 'Click', disabled: 'yes' } as any, registry);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid_type');
    });
  });

  describe('getComponentManifest', () => {
    it('returns manifest with all components', () => {
      const registry = createSchemaRegistry();
      registerComponentSchema(registry, {
        name: 'Button',
        description: 'A button',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'variant', type: 'enum', enum: ['primary'] },
        ],
        events: [{ name: 'onClick', payload: 'null' }],
      });

      const manifest = getComponentManifest(registry);
      expect(manifest.components).toHaveLength(1);
      expect(manifest.components[0].name).toBe('Button');
      expect(manifest.components[0].description).toBe('A button');
      expect(manifest.components[0].props).toHaveLength(2);
      expect(manifest.components[0].events).toHaveLength(1);
    });
  });

  describe('buildSystemPromptSection', () => {
    it('generates readable system prompt section', () => {
      const registry = createSchemaRegistry();
      registerComponentSchema(registry, {
        name: 'Button',
        description: 'A button component',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'variant', type: 'enum', enum: ['primary'], description: 'Button style' },
        ],
      });

      const manifest = getComponentManifest(registry);
      const section = buildSystemPromptSection(manifest);

      expect(section).toContain('## Button');
      expect(section).toContain('A button component');
      expect(section).toContain('`label`: string (required)');
      expect(section).toContain('`variant`: "primary" — one of: primary');
      expect(section).toContain('Button style');
    });
  });
});
