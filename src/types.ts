import { AsyncLocalStorage } from 'async_hooks';
export type Context = any;

export type ContextKey = string|symbol;
export type ContextMap = Map<ContextKey, any>;
export type Storage = AsyncLocalStorage<ContextRef>;

export interface ContextRef {
  parent?: ContextRef;
  context: ContextMap;
};
