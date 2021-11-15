const express = require('express');
const { ctx } = require('../dist/Context');
const { v4 } = require('uuid');

const app = express();
const port = 8080;

ctx.app = 'test-app'

app.use(
  ctx.$init(async (req, res, next) => {
    ctx.req = req;
    ctx.res = res;
    ctx.id = v4();
    next();
  })
);

app.get('/route', () => {
  const { app, id, req: { originalUrl, query } } = ctx;
  ctx.res.json({ app, id, path: originalUrl, query });
})

app.get('/async-route', async () => {
  const { app, id, req: { originalUrl, query } } = ctx;
  await getIp();
  const { ip } = ctx;

  ctx.res.json({ app, id, ip, path: originalUrl, query });
});

async function getIp() {
  return new Promise((resolve) => {
    setTimeout(() => {
      ctx.ip = ctx.req.ip;
      resolve();
    }, 2500)
  });
}

app.listen(port);
