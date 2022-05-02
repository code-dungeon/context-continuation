[![NPM](https://nodei.co/npm/@code-dungeon/context-continuation.png?downloads=true&stars=true)](https://nodei.co/npm/@code-dungeon/context-continuation)

# Context-Continuation

Context-Continuation works like [thread-local storage] in threaded
programming, but is based on chains of Node-style callbacks instead of threads.
The standard Node convention of functions calling functions is very similar to
[Continuation-Passing Style (CPS)] in functional programming. This module allows you to
set and get values scoped to the lifetime of these chains of function calls.

This library is very similar in functionality to other packages like
[continuation-local-storage](https://www.npmjs.com/package/continuation-local-storage),
but differs in implementation. Similar libraries rely on patching and won't work with async/await.
Instead this library uses the [async hooks api](https://nodejs.org/api/async_hooks.html).

Suppose you're writing a module that fetches a user and adds it to a session
before executing the provided callback (in this case `next`):

```javascript
// setup.js

const ctx = require('context-continuation');
const db = require('./lib/db.js');

async function start(options, next) {
  try {
    ctx.user = await db.fetchUserById(options.id);
    next();
  } catch(error) {
    next(error);
  }
}
```

Later on in a process for rendering the user's data into HTML, you call
another function (maybe defined in another module entirely) that wants to fetch
the value you set earlier:

```javascript
// send_response.js

const ctx = require('context-continuation');
const render = require('./lib/render.js')

function finish(response) {
  const { user } = ctx;
  render({ user }).pipe(response);
}
```

When you set values in context-continuation, those values are accessible
until all functions called from the original function – synchronously or
asynchronously – have finished executing. This includes callbacks passed to
`process.nextTick` and the [timer functions][] ([setImmediate][],
[setTimeout][], and [setInterval][]), as well as callbacks passed to
asynchronous functions that call native functions (such as those exported from
the `fs`, `dns`, `zlib` and `crypto` modules).

A simple rule of thumb is anywhere where you might have set a property on the
`request` or `response` objects in an HTTP handler, you can (and should) now
use context-continuation. This API is designed to allow you extend the
scope of a variable across a sequence of function calls, but with values
specific to each sequence of calls.

Sets of function calls are grouped together by calling them within the function
passed to `.init()`. Calls to `.init()` can be nested, and each nested context
has it's own write space. Performing a get will first look in the current
context, and then up the context tree until it finds a context that contains
that key. Looking up the context tree only checks that the key was set, so
`ctx.value=undefined` will stop searching the tree even though a context further
on may have a value defined for that key. Synchronous and asynchronous calls
originating from the function passed to `.init` will all share the same context
reference. The simplest way to integrate this into express is to add a
middleware that only creates the context.

Nesting example:
```javascript
const { ctx, run } = require('context-continuation');

function root() {
  ctx.scope = 'root';

  run(function outer() {
    // ctx.scope; returns 'root'
    ctx.scope = 'outer';
    ctx.value = 1
    // ctx.scope; returns 'outer'
    // ctx.value; returns 1
    // root.scope is 'root'
    // root.value is undefined

    run(function inner() {
      // ctx.scope; returns 'outer'
      // ctx.value; returns 1
      ctx.scope = 'inner';
      // ctx.scope; returns 'inner'
      // ctx.value; returns 1
      // outer.scope is 'outer'
      // outer.value is 1
      // root.scope is 'root'
      // root.value is undefined
    })
  });
}
```

Middleware example:
```javascript
const { init } = require('context-continuation');

app.use(init((request, response, next) => {
  next();
}));
```

## bind(callback, [thisArg])

* return: the callback bound to the current execution context

Binds the callback to the current execution context. The callback will retain
the context at time of binding, not the context that is active at time of invocation.
This is useful when dealing with streams, and event emitters..

## init(callback)

* return: the callback bound to a new execution context when invoked

Wraps the callback allowing it to run in a new context when invoked. The context
will be a child of the active context when invoked, not the context that was
active when init was called.

## run(callback, [thisArg], [...args])

* return: the callback bound to a new execution context

Runs the callback with a new context. The context will be a child of the active
context.

### ctx.key = value

* return: Boolean

Values can be set to any arbritray key using `ctx.key = value` or `ctx[key] = value`.
This looks global and seems like it shouldn't work, but it does because ctx is a proxy
to the current context. The return value indicates if the assignment was successful.

### const value = ctx.key

* return: the requested value, or `undefined`

Look up a value on the current context.

## context

A context is a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to the
current execution context. Since the context is actually a proxy, you can use it like any other javascript object. Getting values will work using dot property, square bracket and destructuring. Setting values will work with dot property and square brackets.

[thread-local storage]: https://en.wikipedia.org/wiki/Thread-local_storage
[Continuation-Passing Style (CPS)]: https://en.wikipedia.org/wiki/Continuation-passing_style
