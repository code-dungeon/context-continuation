import * as hooks from 'async_hooks';

export type ContextKey = string|symbol;
export type ContextValuesObject = { [k: ContextKey]: any };
export type Context = Map<ContextKey, any>;
interface ContextWrapper {
  id: number;
  parentId: number;
  context: Context;
  children: Set<number>;
  merge: boolean;
}

interface ContextDebugInfo {
  id: number;
  parentId: number;
  merge: boolean;
  values: ContextValuesObject;
}

export class ContextManager {
  private contextMap: Map<number, ContextWrapper>;

  constructor() {
    this.contextMap = new Map();

    hooks.createHook({
      init: this.asyncInit.bind(this),
      before: this.asyncBefore.bind(this),
      destroy: this.asyncDestroy.bind(this)
    }).enable();
  }

  public init(fn?: Function): Function | void {
    if (fn instanceof Function) {
      this.merge = false;
      return (...params: Array<any>) => {
        this.merge = true;
        return fn(...params);
      };
    }
  }

  public info(): Array<ContextDebugInfo> {
    let ctx: ContextWrapper = this.getContext();
    const contexts:Array<ContextDebugInfo> = [this.getContextDebugInfo(ctx)];

    while (ctx.id !== 0) {
        ctx = this.getParentContext(ctx.parentId);
        contexts.push(this.getContextDebugInfo(ctx));
    }

    return contexts;
  }

  private getContextDebugInfo(ctx: ContextWrapper): ContextDebugInfo {
    const { id, parentId, merge, context } = ctx;
    const values: ContextValuesObject = Object.fromEntries(context);

    return {id, parentId, merge, values};
  }

  public get context(): Context {
    return this.getContext().context;
  }

  public get merge(): boolean {
    return this.getContext().merge;
  }

  public set merge(value: boolean) {
    this.getContext().merge = value;
  }

  private getParentContext(id: number): ContextWrapper {
    const { contextMap } = this;
    let context: ContextWrapper = contextMap.get(id);

    if (context === undefined) {
      context = { id, parentId: 0, merge: false, children: new Set(), context: new Map() };
      contextMap.set(id, context);
    }

    return context;
  }

  public getContext(id: number = hooks.executionAsyncId(), parentId: number = hooks.triggerAsyncId()): ContextWrapper {
    const { contextMap } = this;
    let context: ContextWrapper = contextMap.get(id);

    if (context === undefined) {
      const parent: ContextWrapper = this.getParentContext(parentId);

      let newContext: Context;
      if (parent.merge === false) {
        newContext = new Map(parent.context);
      } else {
        newContext = parent.context;
      }
      context = { id, parentId, children: new Set(), context: newContext, merge: parent.merge };

      parent.children.add(id);
      contextMap.set(id, context);
    }

    return context;
  }

  private asyncInit(asyncId: number, type: string, triggerAsyncId: number): void {
    this.getContext(asyncId, triggerAsyncId);
  }

  private asyncBefore(asyncId: number): void {
    this.getContext(asyncId);
  }

  private asyncDestroy(asyncId: number): void {
    this.cleanupContext(asyncId);
  }

  private cleanupContext(id: number): void {
    const { contextMap } = this;
    const context: ContextWrapper = contextMap.get(id);

    // apparently destroy can be called multiple times
    /* istanbul ignore if */
    if (context === undefined) {
      return;
    }

    if (context.children.size === 0) {
      contextMap.delete(id);
    }

    this.cleanupParent(id, context.parentId);
  }

  private cleanupParent(childId: number, parentId: number): void {
    const { contextMap } = this;
    const parent: ContextWrapper = contextMap.get(parentId);
    if (parent === undefined) {
      return;
    }

    parent.children.delete(childId);
    if (parent.children.size === 0) {
      return this.cleanupContext(parentId);
    }
  }
}
