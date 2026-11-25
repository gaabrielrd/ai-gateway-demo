import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { tokenHandler } from './google-auth.mjs';

test('troca apenas o código do cliente configurado e entrega a identidade verificada', async (t) => {
  const settings = {
    clientId: 'web',
    secret: 'test-only',
    redirectUri: 'http://localhost/callback',
  };
  let calls = 0;
  const handler = tokenHandler({
    configuration: () => settings,
    send: async (_url, { body }) => {
      calls++;
      assert.equal(body.get('client_secret'), settings.secret);
      return Response.json({ id_token: 'identity', access_token: 'provider-access' });
    },
    verify: async (token, audience) => {
      assert.equal(token, 'identity');
      assert.equal(audience, 'web');
      return { subject: 'subject', expiresAt: Math.floor(Date.now() / 1000) + 120 };
    },
  });
  const app = express();
  app.use(express.urlencoded({ extended: false }), handler);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: 'wrong',
    redirect_uri: settings.redirectUri,
    code: 'demo',
    code_verifier: 'a'.repeat(43),
  });
  assert.equal((await fetch(url, { method: 'POST', body })).status, 400);
  assert.equal(calls, 0);
  body.set('client_id', 'web');
  const result = await fetch(url, { method: 'POST', body });
  assert.equal(result.status, 200);
  const session = await result.json();
  assert.equal(session.access_token, 'identity');
  assert.ok(session.expires_in > 0);
  assert.equal(calls, 1);
});
