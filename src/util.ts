import {ContextRef} from './types';
import { storage } from './storage';

export function init<R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func): (...args: TArgs) => R {
  return function run(...args: TArgs): R {
    const parent = storage.getStore();
    const context: ContextRef = {parent, context: new Map()};
    return storage.run(context, fn, ...args);
  };
}

export function run<R, TArgs extends Array<any>, Func extends (...args: TArgs) => R>(fn: Func, thisArg?: any, ...args: TArgs): R {
  const runner = init<R, TArgs, Func>(fn.bind(thisArg));
  return runner(...args);
}
