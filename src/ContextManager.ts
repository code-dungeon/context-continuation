import * as hooks from 'async_hooks';

const MERGE: symbol = Symbol('merge');

export type Context = Map<symbol | string, any>;

export class ContextManager {
  private contextMap: Map<number, Context>;
  private parentChildrenIdMap: Map<number, Set<number>>;
  private childParentIdMap: Map<number, number>;

  constructor() {
    this.contextMap = new Map();
    this.parentChildrenIdMap = new Map();
    this.childParentIdMap = new Map();

    hooks.createHook({
      init: this.asyncInit.bind(this),
      destroy: this.asyncDestroy.bind(this)
    }).enable();
  }

  public init(fn?: Function): Function | void {
    this.merge = true;

    if (fn instanceof Function) {
      return (...params: Array<any>) => {
        this.merge = true;
        return fn(...params);
      };
    }
  }

  public get context(): Context {
    return this.getContext();
  }

  public get merge(): boolean {
    const { context } = this;
    return Boolean(context.get(MERGE));
  }

  public set merge(value: boolean) {
    const { context } = this;
    context.set(MERGE, value);
  }

  private getParentContext(triggerAsyncId: number): Context {
    const { contextMap, parentChildrenIdMap: parentToChildren } = this;
    let context: Context = contextMap.get(triggerAsyncId);

    if (context === undefined) {
      context = new Map();
      contextMap.set(triggerAsyncId, context);
    }

    if (parentToChildren.has(triggerAsyncId) === false) {
      parentToChildren.set(triggerAsyncId, new Set());
    }

    return context;
  }

  private getContext(asyncId: number = hooks.executionAsyncId(), triggerAsyncId: number = hooks.triggerAsyncId()): Context {
    const { contextMap, childParentIdMap: childToParent, parentChildrenIdMap: parentToChildren } = this;
    let context: Context = contextMap.get(asyncId);

    if (context === undefined) {
      const parent: Context = this.getParentContext(triggerAsyncId);

      if (parent.get(MERGE) !== true) {
        context = new Map(parent);
      } else {
        context = parent;
      }

      parentToChildren.get(triggerAsyncId).add(asyncId);
      childToParent.set(asyncId, triggerAsyncId);
      contextMap.set(asyncId, context);
    }

    return context;
  }

  private asyncInit(asyncId: number, type: string, triggerAsyncId: number): void {
    this.getContext(asyncId, triggerAsyncId);
  }

  private asyncDestroy(asyncId: number): void {
    // remove the id from parent mapping
    // and this link to get the parent from asyncId
    this.removeChildParentLink(asyncId);

    // this call will also remove this from contextMap
    this.cleanupChildren(asyncId);
  }

  private removeChildParentLink(asyncId: number): void {
    const { childParentIdMap, parentChildrenIdMap } = this;
    const parentId: number = childParentIdMap.get(asyncId);
    const children: Set<number> = parentChildrenIdMap.get(parentId);

    childParentIdMap.delete(asyncId);

    if (children !== undefined) {
      // remove self from parent's list of children
      children.delete(asyncId);
    }
  }

  private cleanupChildren(asyncId: number): void {
    const { contextMap, childParentIdMap, parentChildrenIdMap } = this;
    const children: Set<number> = parentChildrenIdMap.get(asyncId);

    if (children !== undefined) {
      children.forEach((childId: number) => {
        // cleanup any children this node has
        this.cleanupChildren(childId);
        // remove the link pointing back to parent
        childParentIdMap.delete(childId);
      });
    }

    parentChildrenIdMap.delete(asyncId);
    contextMap.delete(asyncId);
  }
}
