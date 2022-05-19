import { AsyncLocalStorage, AsyncResource } from 'async_hooks';
const VERSION_REGEX: RegExp = /v(\d+)\.\d+.*/;
export type Context = any;

type ContextKey = string|symbol;
type ContextMap = Map<ContextKey, any>;
type Storage = AsyncLocalStorage<ContextRef>;
type Callback = (...args: Array<any>) => any;

interface ContextRef {
  parent?: ContextRef;
  context: ContextMap;
}

const rootContext: ContextMap = new Map();
const asyncLocalStorage: Storage = new AsyncLocalStorage();

function getNodeMajorVersion():string {
  const [,version] = VERSION_REGEX.exec(process.version);
  return version;
}

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



export const ctx: Context = new Proxy(asyncLocalStorage, {
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

export function init<R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func): (...args: TArgs) => R {
  return function run(...args: TArgs): R {
    const parent = asyncLocalStorage.getStore();
    const context: ContextRef = {parent, context: new Map()};
    return asyncLocalStorage.run(context, fn, ...args);
  };
}

export function run<R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func, thisArg?: any, ...args: TArgs): R {
  const runner = init<R, TArgs, Func>(fn.bind(thisArg));
  return runner(...args);
}

function bindv14<R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func, thisArg?: any): (...args: TArgs) => R {
  const boundFunc = AsyncResource.bind<any, TArgs>(fn);

  return function boundCallback(...args: TArgs): R {
    return boundFunc(thisArg, ...args);
  };
}

function bindv16<R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func, thisArg?: any): (...args: TArgs) => R {
  const boundFunc = AsyncResource.bind<any, TArgs>(fn, thisArg);

  return function boundCallback(...args: TArgs): R {
    return boundFunc(...args);
  };
}

let bindVersion: <R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func, thisArg?: any) => (...args: TArgs) => R;

switch (getNodeMajorVersion()) {
  case '14':
    bindVersion = bindv14;
    break;
  default:
    bindVersion = bindv16;
    break;
}

export const bind = bindVersion;
