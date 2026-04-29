/**
 * Schema Validation Example
 * 
 * Shows how to:
 * 1. Define component schemas (name, props, types)
 * 2. Validate YAML input against schemas
 * 3. Get friendly error messages with suggestions
 * 
 * Run: bun run examples/schema-demo.ts
 */

import { createSchemaRegistry, registerComponentSchema, validateProps, getComponentManifest, schemaAsTypeScript } from '../packages/yell-schema/src/index.js';

// ── Create registry ────────────────────────────────────────────────────────────

const schemaRegistry = createSchemaRegistry();

// ── Define schemas for built-in components ───────────────────────────────────

registerComponentSchema(schemaRegistry, {
  name: 'Button',
  description: 'Interactive button',
  props: [
    { name: 'label', type: 'string', required: true, description: 'Button text' },
    { name: 'variant', type: 'enum', enum: ['primary', 'secondary', 'ghost'], default: 'primary', description: 'Visual style' },
    { name: 'disabled', type: 'boolean', default: false },
  ],
});

registerComponentSchema(schemaRegistry, {
  name: 'Text',
  description: 'Text content',
  props: [
    { name: 'content', type: 'string', required: true },
    { name: 'as', type: 'enum', enum: ['h1', 'h2', 'h3', 'p', 'span'], default: 'p' },
  ],
});

registerComponentSchema(schemaRegistry, {
  name: 'Container',
  description: 'Layout container',
  props: [
    { name: 'layout', type: 'enum', enum: ['stack', 'row', 'grid'], default: 'stack' },
    { name: 'gap', type: 'number', default: 16, min: 0, max: 64 },
  ],
});

registerComponentSchema(schemaRegistry, {
  name: 'Input',
  description: 'Text input field',
  props: [
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'enum', enum: ['text', 'email', 'password', 'number'], default: 'text' },
    { name: 'placeholder', type: 'string', default: '' },
    { name: 'required', type: 'boolean', default: false },
  ],
});

registerComponentSchema(schemaRegistry, {
  name: 'Card',
  description: 'Card component',
  props: [
    { name: 'title', type: 'string', required: true },
    { name: 'description', type: 'string', default: '' },
    { name: 'badge', type: 'string' },
    { name: 'price', type: 'string' },
  ],
});

// ── Validate some props ────────────────────────────────────────────────────────

console.log('=== Schema Validation ===\n');

// Valid props
const validErrors = validateProps('Button', { label: 'Submit', variant: 'primary' }, schemaRegistry);
console.log('Valid Button props:');
console.log('  Errors:', validErrors.length === 0 ? 'none ✓' : validErrors);
console.log();

// Missing required prop
const missingLabel = validateProps('Button', { variant: 'secondary' }, schemaRegistry);
console.log('Button without label:');
console.log('  Errors:', missingLabel.map(e => `${e.type}: ${e.message} (${e.suggestion})`));
console.log();

// Unknown prop
const unknownProp = validateProps('Button', { label: 'Click', size: 'large' }, schemaRegistry);
console.log('Button with unknown prop "size":');
console.log('  Errors:', unknownProp.map(e => `${e.type}: ${e.message}`));
console.log('  Valid props:', schemaRegistry.schemas.get('Button')?.props.map(p => p.name));
console.log();

// Invalid enum value
const badEnum = validateProps('Input', { name: 'email', type: 'url' }, schemaRegistry);
console.log('Input with invalid type "url":');
console.log('  Errors:', badEnum.map(e => `${e.message} | Suggestion: ${e.suggestion}`));
console.log();

// Unknown component
const unknownComp = validateProps('MissingComponent', { foo: 'bar' }, schemaRegistry);
console.log('Unknown component:');
console.log('  Errors:', unknownComp.map(e => e.message));
console.log();

// ── Generate component manifest (for AI/tools) ────────────────────────────────

console.log('=== Component Manifest (for AI & tooling) ===\n');

const manifest = getComponentManifest(schemaRegistry);
console.log(JSON.stringify(manifest, null, 2));

// ── Generate TypeScript types ─────────────────────────────────────────────────

console.log('\n=== TypeScript Types ===\n');

const tsTypes = schemaAsTypeScript(schemaRegistry);
console.log(tsTypes);

// ── Simulate YAML parsing → validation pipeline ───────────────────────────────

console.log('\n=== Full YAML → Validated Pipeline ===\n');

const yaml = `
app:
  children:
    - type: Button
      props:
        label: Submit form
        variant: primary
    - type: Card
      props:
        title: My Card
        description: A sample card
`;

console.log('Simulating YAML parse + validation:');
console.log('1. YAML parsed → config object');
console.log('2. For each node in config:');
console.log('   - Get component type from node.type');
console.log('   - Validate node.props against schemaRegistry');
console.log('3. Result: valid or ValidationError[]');
console.log('\nSample validation for Card:');
const cardValidation = validateProps('Card', { title: 'My Card', description: 'A sample card' }, schemaRegistry);
console.log('  Valid:', cardValidation.length === 0 ? 'YES ✓' : 'NO ✗');
console.log('\nSample validation for Button (missing label):');
const btnValidation = validateProps('Button', { variant: 'primary' }, schemaRegistry);
console.log('  Valid:', btnValidation.length === 0 ? 'YES ✓' : 'NO ✗');
console.log('  Errors:', btnValidation.map(e => `  - ${e.message}`).join('\n'));