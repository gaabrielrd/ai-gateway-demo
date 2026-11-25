// Executar com emulators:exec no projeto fictício e nas portas de firebase.json.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function signIn(email) {
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
          id_token: JSON.stringify({ sub: randomUUID(), email, email_verified: true }),
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
