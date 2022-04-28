[![NPM](https://nodei.co/npm/@code-dungeon/context-continuation.png?downloads=true&stars=true)](https://nodei.co/npm/@code-dungeon/context-continuation)

# Context-Continuation

Context-Continuation works like thread-local storage in threaded
programming, but is based on chains of Node-style callbacks instead of threads.
The standard Node convention of functions calling functions is very similar to
something called ["continuation-passing style"][cps] in functional programming,
and the name comes from the way this module allows you to set and get values
that are scoped to the lifetime of these chains of function calls.

This library is very similar in functionality to other packages like
[continuation-local-storage](https://www.npmjs.com/package/continuation-local-storage),
but differs in implementation. Similar libraries all rely on patching and won't work with async/await,
instead this library uses the [async hooks api](https://nodejs.org/api/async_hooks.html).

Suppose you're writing a module that fetches a user and adds it to a session
before calling a function passed in by a user to continue execution:

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

Later on in the process of turning that user's data into an HTML page, you call
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

Sets of function calls are grouped together by calling them within the function passed
to `.$init()` on the context object. Synchronous and asynchronous calls originating from
the function passed to `.$init` will all share the same context reference. The simplest
way to integrate this into express is to add a middleware that only creates the context.

Here is an example middleware:
```javascript
const ctx = require('context-continuation');

app.use(ctx.$init((request, response, next) => {
  next();
}));
```

## ctx.$init(callback)

* return: the callback bound to the execution context

Create a new context on which values can be set or read. Run all the functions
that are called (either directly, or indirectly through asynchronous functions
that take callbacks themselves) from the provided callback.

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
