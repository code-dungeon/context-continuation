import {Context, ContextKey, ContextMap, ContextRef, Storage} from './types';
import { storage, rootContext } from './storage';

function getValue(storage: Storage, key: ContextKey): any {
  const context: ContextMap = getContext(storage, key);

  return context.get(key);
}

function getContext(storage: Storage, key: ContextKey): Context {
  let ref: ContextRef = storage.getStore();

  while(ref !== undefined) {
    const {context} = ref;

    if( context.has(key) ){
      return context;
    }

    ref = ref.parent;
  }

  return rootContext;
}

export const ctx: Context = new Proxy(storage, {
  deleteProperty(storage: Storage, key: ContextKey): boolean {
    const context: ContextMap = storage.getStore()?.context || rootContext;

    // context is undefined when currently in the root context
    // delete will be safe in the root context, since we are actively in it
    return context.delete(key);
  },
  get(storage: Storage, key: ContextKey): any {
    return getValue(storage, key);
  },
  getOwnPropertyDescriptor(storage: Storage, key: ContextKey): PropertyDescriptor {
    const context: ContextMap = getContext(storage, key);
    if( context.has(key) ){
      return { enumerable: true, configurable: true, value: context.get(key)};
    }

    return { enumerable: false, configurable: false };
  },
  has(storage: Storage, key: ContextKey): boolean {
    return getContext(storage, key).has(key);
  },
  set(storage: Storage, key: ContextKey, value: any): boolean {
    const context: ContextMap = storage.getStore()?.context || rootContext;
    context.set(key, value);

    return true;
  },
  ownKeys(storage: Storage): Array<ContextKey> {
    const keys: Set<ContextKey> = new Set([...rootContext.keys()]);
    let ref: ContextRef = storage.getStore();

    while(ref !== undefined) {
      for(let key of ref.context.keys()){
        keys.add(key);
      }

      ref = ref.parent;
    }

    return Array.from(keys);
  },
});
