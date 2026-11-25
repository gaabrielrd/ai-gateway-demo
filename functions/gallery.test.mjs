import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { galleryApi } from './gallery.mjs';

test(
  'somente o administrador publica a própria rodada revisada, com cópia independente e retirada',
  {
    skip: !process.env.FIRESTORE_EMULATOR_HOST,
  },
  async (t) => {
    const app = initializeApp({ projectId: 'demo-ai-gateway' }, randomUUID());
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway');
    const admin = { uid: randomUUID() },
      other = { uid: randomUUID() };
    process.env.AI_GATEWAY_ADMIN_UID = admin.uid;
    const objects = new Map();
    const bucket = {
      file(name) {
        return {
          name,
          save: async (data) => objects.set(name, Buffer.from(data)),
          copy: async (dest) => {
            assert.ok(objects.has(name));
            objects.set(dest.name, objects.get(name));
          },
          download: async () => [objects.get(name)],
        };
      },
      deleteFiles: async ({ prefix }) => {
        for (const key of objects.keys()) if (key.startsWith(prefix)) objects.delete(key);
      },
    };
    async function call(method, path, identity, body) {
      const res = {
        code: 200,
        status(code) {
          this.code = code;
          return this;
        },
        json(data) {
          this.data = data;
        },
        sendStatus(code) {
          this.code = code;
        },
        type() {
          return this;
        },
        send(data) {
          this.data = data;
        },
      };
      await galleryApi(db, { method, path, body }, res, identity, () => bucket);
      return res;
    }
    const executionId = randomUUID();
    const source = db.doc('users/' + admin.uid + '/executions/' + executionId);
    const base = '/api/admin/gallery';
    const body = { executionId, title: 'Imagem de teste', ownMaterial: true, revision: 0 };
    assert.equal((await call('POST', base, other, body)).code, 403);
    const foreign = db.doc('users/' + other.uid + '/executions/' + executionId);
    const record = {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      prompt: 'Crie uma imagem.',
      task: 'image',
      judges: ['a', 'b', 'c'],
      criteria: [],
    };
    await foreign.set(record);
    assert.equal((await call('POST', base, admin, body)).code, 404);
    await source.set(record);
    await source
      .collection('rounds')
      .doc('original')
      .set({ indices: [0, 1], revision: 0, status: 'finished' });
    for (const index of [0, 1])
      await source
        .collection('attempts')
        .doc(String(index))
        .set({
          index,
          modelId: 'modelo',
          status: 'completed',
          output: { type: 'image', contentType: 'image/png' },
          durationMs: 12,
        });
    assert.equal((await call('POST', base, admin, { ...body, ownMaterial: false })).code, 400);
    assert.equal((await call('POST', base, admin, { ...body, revision: 1 })).code, 409);
    const first = source.path + '/attempts/0/image',
      second = source.path + '/attempts/1/image';
    objects.set(first, Buffer.from('imagem 1'));
    assert.equal((await call('POST', base, admin, body)).code, 503);
    assert.deepEqual([...objects.keys()], [first]);
    objects.set(second, Buffer.from('imagem 2'));
    const result = await call('POST', base, admin, body);
    assert.equal(result.code, 200);
    const id = result.data.id,
      path = '/api/gallery/' + id;
    assert.equal((await call('POST', base, admin, body)).data.id, id);
    await db.recursiveDelete(source);
    objects.delete(first);
    objects.delete(second);
    assert.ok((await call('GET', '/api/gallery')).data.some((item) => item.id === id));
    assert.equal((await call('GET', path)).data.prompt, record.prompt);
    assert.equal((await call('GET', path + '/media/1')).data.toString(), 'imagem 2');
    assert.equal((await call('DELETE', base + '/' + id, other)).code, 403);
    assert.equal((await call('DELETE', base + '/' + id, admin)).code, 204);
    assert.equal((await call('GET', path)).code, 404);
    assert.equal((await call('GET', path + '/media/1')).code, 404);
    assert.equal(objects.size, 0);
  },
);
