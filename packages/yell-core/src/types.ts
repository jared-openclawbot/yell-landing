/**
 * Yell Core Types
 * 
 * Core type definitions for the Yell declarative UI runtime.
 */

// Base Yell node — any node in the YAML tree
export interface YellNode {
  type: string;
  props?: Record<string, unknown>;
  children?: YellNode[];
  slots?: Record<string, YellNode[]>;
}

// Component registry entry
export interface ComponentDef {
  type: string;
  component: unknown; // Component function or web component
  schema?: unknown;   // Zod schema for props validation
}

// Event handler map
export interface EventHandlers {
  [event: string]: (payload: unknown) => void;
}

// Resolved component instance before render
export interface ResolvedNode {
  type: string;
  props: Record<string, unknown>;
  children: ResolvedNode[];
  events: EventHandlers;
}

// Render context passed to components
export interface RenderContext {
  registry: ComponentRegistry;
  onEvent: (nodeId: string, event: string, payload: unknown) => void;
}

// Component registry — maps type strings to component definitions
export type ComponentRegistry = Map<string, ComponentDef>;

// YAML configuration as parsed from source
export interface YellConfig {
  app?: AppConfig;
  route?: string;
  shell?: YellNode;
  children?: YellNode[];
}

export interface AppConfig {
  route?: string;
  shell?: {
    layout?: 'stack' | 'grid' | 'flex' | 'columns';
    gap?: number;
    direction?: 'row' | 'column';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// SSR-specific types
export interface SSRRenderOptions {
  registry: ComponentRegistry;
  pretty?: boolean;
}

export interface SSRRenderResult {
  html: string;
  hydrationMap: HydrationMap;
}

// Maps node paths to their event bindings for client hydration
export interface HydrationMap {
  [nodePath: string]: {
    type: string;
    events: string[];
  };
}