import { settleAttempt } from './reservations.mjs';
import { getStorage } from 'firebase-admin/storage';

export async function listHistory(db, uid, now = new Date()) {
  const records = await db
    .collection('users')
    .doc(uid)
    .collection('executions')
    .where('expiresAt', '>', now)
    .orderBy('expiresAt', 'desc')
    .get();
  return records.docs.map((doc) => ({
    executionId: doc.id,
    prompt: doc.get('prompt').slice(0, 160),
    createdAt: doc.get('createdAt').toDate().toISOString(),
    expiresAt: doc.get('expiresAt').toDate().toISOString(),
  }));
}

export async function hideExecution(ref, now = new Date()) {
  return ref.firestore.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists || doc.get('expiresAt').toMillis() <= +now) return false;
    tx.update(ref, { expiresAt: now });
    return true;
  });
}

export async function purgeExpired(db, now = new Date(), bucket = () => getStorage().bucket()) {
  // Os workers já iniciados têm timeout máximo de quatro minutos.
  const cutoff = new Date(+now - 5 * 60000);
  const query = db
    .collectionGroup('executions')
    .where('expiresAt', '<=', cutoff)
    .orderBy('expiresAt')
    .limit(50);
  let cursor;
  do {
    const batch = await (cursor ? query.startAfter(cursor) : query).get();
    for (const doc of batch.docs) {
      const user = doc.ref.parent.parent;
      if (!user || user.parent.path !== 'users') continue;
      const rounds = await doc.ref.collection('rounds').listDocuments();
      for (const round of rounds) {
        const reservation = await user.collection('reservations').doc(round.id).get();
        const attempts = reservation.get('attempts') ?? [];
        for (const [index, attempt] of attempts.entries()) {
          if (attempt.status === 'reserved') await settleAttempt(db, user.id, round.id, index, 0);
        }
      }
      if (doc.get('task') === 'image') await bucket().deleteFiles({ prefix: doc.ref.path + '/' });
      for (const collection of await doc.ref.listCollections())
        await db.recursiveDelete(collection);
      await doc.ref.delete();
    }
    cursor = batch.size === 50 ? batch.docs.at(-1) : null;
  } while (cursor);
}
