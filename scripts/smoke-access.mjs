// Executar com emulators:exec no projeto fictício e nas portas de firebase.json.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function signIn(email, subject = randomUUID()) {
  const response = await fetch(
    'http://127.0.0.1:9599/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=test',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestUri: 'http://localhost',
        returnSecureToken: true,
        postBody: new URLSearchParams({
          providerId: 'google.com',
          id_token: JSON.stringify({ sub: subject, email, email_verified: true }),
        }).toString(),
      }),
    },
  );
  assert.equal(response.status, 200);
  return response.json();
}

async function api(user, path, body) {
  const response = await fetch('http://127.0.0.1:5500/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + user.idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

const alice = await signIn('alice@example.test');
const bob = await signIn('bob@example.test');
assert.deepEqual((await api(alice, 'access')).data, { status: 'none' });
for (const response of await Promise.all([api(alice, 'access', {}), api(alice, 'access', {})])) {
  assert.deepEqual(response, { status: 200, data: { status: 'pending' } });
}
assert.deepEqual((await api(alice, 'access')).data, { status: 'pending' });
assert.deepEqual((await api(bob, 'access?uid=' + alice.localId)).data, { status: 'none' });
console.log('Acesso opcional, reenvio concorrente e isolamento de contas OK.');

assert.equal((await api(bob, 'admin/access')).status, 403);
assert.equal(
  (await api(bob, 'admin/access', { id: alice.localId, decision: 'approved' })).status,
  403,
);
const email = 'admin@example.test';
const seed = await fetch(
  'http://127.0.0.1:9599/identitytoolkit.googleapis.com/v1/projects/demo-ai-gateway/accounts:batchCreate',
  {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      users: [
        {
          localId: 'smoke-admin',
          email,
          emailVerified: true,
          providerUserInfo: [{ providerId: 'google.com', rawId: 'smoke-google-admin', email }],
        },
      ],
    }),
  },
);
assert.equal(seed.status, 200);
const admin = await signIn(email, 'smoke-google-admin');
assert.equal(admin.localId, 'smoke-admin');
const queue = await api(admin, 'admin/access');
assert.equal(queue.status, 200);
assert.ok(queue.data.requests.some((req) => req.id === alice.localId));
const decisions = await Promise.all(
  ['approved', 'rejected'].map((decision) =>
    api(admin, 'admin/access', { id: alice.localId, decision }),
  ),
);
assert.deepEqual(decisions.map((r) => r.status).sort(), [200, 409]);
assert.equal(
  (await api(alice, 'access')).data.status,
  decisions.find((r) => r.status === 200).data.status,
);
assert.deepEqual((await api(admin, 'admin/access')).data.requests, []);
console.log('Papel administrativo, decisão concorrente e fila vazia OK.');
