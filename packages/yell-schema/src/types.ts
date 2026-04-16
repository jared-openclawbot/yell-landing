/**
 * Yell Schema Types
 * 
 * Schema definitions for component contracts, prop validation, and AI manifests.
 */

export type PropType = 'string' | 'number' | 'boolean' | 'enum' | 'component' | 'array';

export interface PropSchema {
  name: string;
  type: PropType;
  required?: boolean;
  default?: unknown;
  enum?: string[];           // For 'enum' type
  componentRef?: string;     // For 'component' type
  arrayOf?: string;          // For 'array' type
  description?: string;      // For AI agents and docs
}

export interface SlotSchema {
  name: string;             // 'header', 'body', 'footer'
  accepts?: string[];        // Optional: allowed component types
  description?: string;
}

export interface EventSchema {
  name: string;             // 'onClick', 'onChange'
  payload?: string;          // 'string', 'number', 'User'
  description?: string;
}

export interface ComponentSchema {
  name: string;             // 'Button', 'Text', 'Modal'
  version?: string;          // 'v1', 'v2' — defaults to 'v1'
  description?: string;       // For AI agents and docs
  props: PropSchema[];
  slots?: SlotSchema[];
  events?: EventSchema[];
}

// Schema registry — maps component name → schema
export interface SchemaRegistry {
  schemas: Map<string, ComponentSchema>;
}

// Validation result
export interface ValidationError {
  path: string;             // 'Button.variant'
  message: string;          // Human-readable
  type: 'unknown_component' | 'invalid_prop' | 'missing_required' | 'invalid_type' | 'invalid_enum';
  suggestion?: string;       // Suggested fix
}

// AI manifest — structured overview of all components
export interface ComponentManifest {
  components: {
    name: string;
    version?: string;
    description?: string;
    props: {
      name: string;
      type: string;
      required: boolean;
      default?: unknown;
      enum?: string[];
      description?: string;
    }[];
    slots?: string[];
    events?: { name: string; payload?: string }[];
  }[];
}