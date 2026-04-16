/**
 * Yell Core Types
 *
 * Core type definitions for the Yell declarative UI runtime.
 */
export interface YellNode {
    type: string;
    props?: Record<string, unknown>;
    children?: YellNode[];
    slots?: Record<string, YellNode[]>;
}
export interface ComponentDef {
    type: string;
    component: unknown;
    schema?: unknown;
}
export interface EventHandlers {
    [event: string]: (payload: unknown) => void;
}
export interface ResolvedNode {
    type: string;
    props: Record<string, unknown>;
    children: ResolvedNode[];
    events: EventHandlers;
}
export interface RenderContext {
    registry: ComponentRegistry;
    onEvent: (nodeId: string, event: string, payload: unknown) => void;
}
export type ComponentRegistry = Map<string, ComponentDef>;
export interface TokenMap {
    [category: string]: {
        [key: string]: string | number | TokenMap;
    };
}
export interface YellConfig {
    tokens?: TokenMap;
    app?: {
        route?: string;
        shell?: YellNode;
        children?: YellNode[];
        [key: string]: unknown;
    };
}
export interface SSRRenderOptions {
    registry: ComponentRegistry;
    pretty?: boolean;
}
export interface SSRRenderResult {
    html: string;
    hydrationMap: HydrationMap;
}
export interface HydrationMap {
    [nodePath: string]: {
        type: string;
        events: string[];
    };
}
