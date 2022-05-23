import { AsyncLocalStorage } from 'async_hooks';
import {ContextMap, Storage} from './types';

export const rootContext: ContextMap = new Map();
export const storage: Storage = new AsyncLocalStorage();
