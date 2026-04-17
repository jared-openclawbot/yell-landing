/**
 * Yell Schema Types
 */

export interface ComponentSchema {
  name: string;
  version?: string;
  description?: string;
  props: PropSchema[];
  events?: EventSchema[];
}

export interface PropSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'node' | 'array';
  required?: boolean;
  default?: unknown;
  enum?: string[];
  description?: string;
  min?: number;
  max?: number;
}

export interface EventSchema {
  name: string;
  payload: string;
  description?: string;
}

export interface SchemaRegistry {
  schemas: Map<string, ComponentSchema>;
  versions: Map<string, string[]>; // name -> versions[]
}

export interface ValidationError {
  type: 'missing_required' | 'invalid_type' | 'invalid_enum' | 'unknown_component' | 'invalid_prop' | 'out_of_range';
  path: string;
  message: string;
  suggestion?: string;
  received?: unknown;
  expected?: unknown;
}

export interface ComponentManifest {
  version: string;
  components: ManifestComponent[];
}

export interface ManifestComponent {
  name: string;
  version?: string;
  description?: string;
  props: ManifestProp[];
  events: { name: string; payload: string }[];
}

export interface ManifestProp {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
  enum?: string[];
}