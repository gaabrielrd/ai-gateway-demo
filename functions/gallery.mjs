import { createHash, randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import { isAdministrator } from './access.mjs';
import { executionSnapshot } from './executions.mjs';

class GalleryError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function galleryApi(db, req, res, identity, bucket = () => getStorage().bucket()) {
  try {
    const admin = req.path.startsWith('/api/admin/');
    if (admin && !isAdministrator(identity))
      throw new GalleryError(403, 'Acesso administrativo necessário.');
    const parts = req.path
      .slice(admin ? '/api/admin/gallery'.length : '/api/gallery'.length)
      .split('/');
    const [, id, media, index] = parts;
    const collection = db.collection('benchmarks');
    if (admin && req.method === 'POST') {
      const { executionId, title, ownMaterial, revision } = req.body ?? {};
      if (
        typeof executionId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(executionId) ||
        typeof title !== 'string' ||
        !title.trim() ||
        title.trim().length > 120 ||
        ownMaterial !== true ||
        !Number.isSafeInteger(revision)
      )
        throw new GalleryError(400, 'Revise a execução, informe o título e confirme a autoria.');
      const source = db
        .collection('users')
        .doc(identity.uid)
        .collection('executions')
        .doc(executionId);
      const original = await source.get();
      if (!original.exists || original.get('expiresAt').toMillis() <= Date.now())
        throw new GalleryError(404, 'Execução privada indisponível.');
      const record = await executionSnapshot(original);
      if (record.evaluation?.status !== 'finished' || record.evaluation.revision !== revision)
        throw new GalleryError(409, 'Revise a rodada concluída antes de publicar.');
      const key = createHash('sha256')
        .update(JSON.stringify([identity.uid, executionId, revision]))
        .digest('hex');
      const publication = collection.doc(key);
      const previous = await publication.get();
      if (previous.get('published')) return res.json({ id: key });
      const prefix = publication.path + '/' + randomUUID() + '/';
      const storage = bucket();
      let linked = false;
      try {
        const images = {};
        for (const attempt of record.attempts) {
          if (attempt.output?.type !== 'image') continue;
          images[attempt.index] = attempt.output.contentType;
          await storage
            .file(source.path + '/attempts/' + attempt.index + '/image')
            .copy(storage.file(prefix + attempt.index));
        }
        const { expiresAt: _expiry, ...snapshot } = record;
        await storage
          .file(prefix + 'result.json')
          .save(JSON.stringify({ ...snapshot, executionId: key }), {
            resumable: false,
            metadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
          });
        linked = await db.runTransaction(async (tx) => {
          const [current, existing] = await tx.getAll(source, publication);
          if (
            !current.exists ||
            !current.updateTime.isEqual(original.updateTime) ||
            current.get('expiresAt').toMillis() <= Date.now()
          )
            throw new GalleryError(409, 'A execução mudou. Revise novamente.');
          if (existing.get('published')) return false;
          if (
            existing.exists !== previous.exists ||
            (previous.exists && !previous.updateTime.isEqual(existing.updateTime))
          )
            throw new GalleryError(409, 'A publicação mudou. Revise novamente.');
          tx.set(publication, {
            title: title.trim(),
            prefix,
            images,
            owner: identity.uid,
            sourceId: executionId,
            published: true,
            publishedAt: new Date(),
          });
          return true;
        });
      } finally {
        // Uma resposta de commit perdida pode corresponder a um commit efetivado.
        if (!linked && (await publication.get()).get('prefix') !== prefix)
          await storage.deleteFiles({ prefix });
      }
      return res.json({ id: key });
    }
    if (!id) {
      const docs = await collection
        .where('published', '==', true)
        .select('title', 'publishedAt')
        .get();
      return res.json(
        docs.docs
          .sort((a, b) => b.get('publishedAt').toMillis() - a.get('publishedAt').toMillis())
          .map((doc) => ({ id: doc.id, title: doc.get('title') })),
      );
    }
    const ref = collection.doc(id);
    if (admin) {
      const prefix = await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) throw new GalleryError(404, 'Benchmark indisponível.');
        tx.update(ref, { published: false });
        return doc.get('prefix');
      });
      await bucket().deleteFiles({ prefix });
      return res.sendStatus(204);
    }
    const doc = await ref.get();
    if (!doc.get('published')) throw new GalleryError(404, 'Benchmark indisponível.');
    const type = media ? doc.get('images')?.[index] : 'application/json';
    if (!type) throw new GalleryError(404, 'Mídia indisponível.');
    const [bytes] = await bucket()
      .file(doc.get('prefix') + (media ? index : 'result.json'))
      .download();
    if (media) return res.type(type).send(bytes);
    return res.json({ ...JSON.parse(bytes.toString()), title: doc.get('title') });
  } catch (error) {
    return res
      .status(error instanceof GalleryError ? error.status : 503)
      .json({ error: error instanceof GalleryError ? error.message : 'Galeria indisponível.' });
  }
}
