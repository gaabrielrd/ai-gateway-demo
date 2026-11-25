import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export async function ownAccess(request, response, identity) {
  const db = getFirestore('cf-ai-gateway');
  const ref = db.collection('accessRequests').doc(identity.uid);
  if (request.method === 'GET') {
    const snapshot = await ref.get();
    return response.json({ status: snapshot.get('status') ?? 'none' });
  }
  const reason = request.body?.reason ?? '';
  if (typeof reason !== 'string' || reason.length > 2000) {
    return response.status(400).json({ error: 'Justificativa inválida' });
  }
  const status = await db.runTransaction(async (tx) => {
    const previous = await tx.get(ref);
    if (previous.exists) return previous.get('status');
    tx.create(ref, {
      status: 'pending',
      email: identity.email ?? '',
      reason: reason.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });
    return 'pending';
  });
  return response.json({ status });
}
