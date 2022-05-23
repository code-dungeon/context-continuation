import { AsyncResource } from 'async_hooks';
const VERSION_REGEX: RegExp = /v(\d+)\.\d+.*/;

function getNodeMajorVersion():string {
  const [,version] = VERSION_REGEX.exec(process.version);
  return version;
}

type Args = Array<any>
type Func<R, TArgs extends Args> = (...args: TArgs) => R;

function bindv14<R, TArgs extends Args, TFunc extends Func<R, TArgs>>(fn: TFunc, boundThis?: any): TFunc {
  const boundFunc = AsyncResource.bind<any, TArgs>(fn);

  return new Proxy(fn, {
    apply: function (target, thisArg, args) {
        return boundFunc(boundThis || thisArg, ...args);
    }
 });
}

function bindv16<R, TArgs extends Args, TFunc extends Func<R, TArgs>>(fn: TFunc, thisArg?: any): TFunc{
  const boundFunc = AsyncResource.bind<any, TArgs>(fn, thisArg);

  return new Proxy(fn, {
    apply: function (target, thisArg, args) {
        return boundFunc(thisArg, ...args);
    }
 });
}

let bindVersion: <R, TArgs extends Args, TFunc extends Func<R, TArgs>>(fn: TFunc, thisArg?: any) => TFunc;

switch (getNodeMajorVersion()) {
  case '14':
  case '15':
    bindVersion = bindv14;
    break;
  case '16':
  case '17':
  case '18':
  default:
    bindVersion = bindv16;
    break;
}

export const bind = bindVersion;
