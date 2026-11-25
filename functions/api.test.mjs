import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { api } from './index.mjs';

test('a API responde à verificação local e identifica rota ou método inválido', async (t) => {
  const app = express();
  app.use(api);
  const server = createServer(app).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  assert.equal((await fetch(base + '/api/missing')).status, 404);
  assert.equal((await fetch(base + '/api/health', { method: 'POST' })).status, 405);
});
