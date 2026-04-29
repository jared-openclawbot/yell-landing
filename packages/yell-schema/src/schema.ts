/**
 * Yell Schema — Component Registry with Validation
 * 
 * This file re-exports from index.ts so playground.mts can import
 * schema validation without circular dependencies.
 */

export {
  createSchemaRegistry,
  registerComponentSchema,
  validateProps,
  getComponentSchema,
  getLatestVersion,
  getComponentManifest,
  buildSystemPromptSection,
  schemaAsTypeScript,
} from './index.js';

export type {
  SchemaRegistry,
  ComponentSchema,
  PropSchema,
  ValidationError,
  ComponentManifest,
} from './types.js';