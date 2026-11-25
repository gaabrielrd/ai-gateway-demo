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

export function isAdministrator(identity) {
  // O UID foi confirmado no projeto de homologação. Em testes, o bootstrap é local.
  const firstAdmin =
    identity.aud === 'timekeeper-d9a0a'
      ? 'Rkz2uR0QthZgLPqyvJOkwNR2xJw2'
      : process.env.AI_GATEWAY_ADMIN_UID;
  return Boolean(firstAdmin && identity.uid === firstAdmin);
}

export async function adminAccess(request, response, identity) {
  if (!isAdministrator(identity))
    return response.status(403).json({ error: 'Acesso administrativo necessário' });
  const db = getFirestore('cf-ai-gateway');
  const requests = db.collection('accessRequests');
  if (request.method === 'GET') {
    const result = await requests.where('status', '==', 'pending').get();
    return response.json({
      requests: result.docs.map((doc) => ({
        id: doc.id,
        email: doc.get('email'),
        reason: doc.get('reason'),
      })),
    });
  }
  const { id, decision } = request.body ?? {};
  if (
    typeof id !== 'string' ||
    !id ||
    id.includes('/') ||
    !['approved', 'rejected'].includes(decision)
  ) {
    return response.status(400).json({ error: 'Decisão inválida' });
  }
  const ref = requests.doc(id);
  const result = await db.runTransaction(async (tx) => {
    const prior = await tx.get(ref);
    if (!prior.exists) return 404;
    if (prior.get('status') !== 'pending') return 409;
    tx.update(ref, {
      status: decision,
      decidedAt: FieldValue.serverTimestamp(),
      decidedBy: identity.uid,
    });
    return 200;
  });
  return response
    .status(result)
    .json(result === 200 ? { status: decision } : { error: 'Pedido indisponível para decisão' });
}
