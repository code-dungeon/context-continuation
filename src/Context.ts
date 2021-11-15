import { ContextManager } from './ContextManager';

function get(target: ContextManager, key: string | symbol): any {
  let result: any;

  switch (key) {
    case '$init':
      result = target.init.bind(target);
      break;
    case '$merge':
      result = target.merge;
      break;
    default:
      result = target.context.get(key);
  }

  return result;
}

function set(target: ContextManager, key: string | symbol, value: any): boolean {
  switch (key) {
    case '$merge':
      target.merge = Boolean(value);
      break;
    default:
      target.context.set(key, value);
      break;
  }

  return true;
}

function has(target: ContextManager, key: string | symbol): boolean {
  return target.context.has(key);
}

function ownKeys(target: ContextManager): Array<string | symbol> {
  return Array.from(target.context.keys());
}

interface ProxyContext {
  $merge: boolean;
  $init(fn?: Function): void | Function;
}

export type Context = ProxyContext | any;

export const ctx: Context = new Proxy(new ContextManager(), {
  get, set, has, ownKeys
});
