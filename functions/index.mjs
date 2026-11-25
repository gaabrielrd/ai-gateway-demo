import { onRequest } from 'firebase-functions/v2/https';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const auth = getAuth(initializeApp());

export const aiGatewayApi = onRequest(async (request, response) => {
  response.set('Cache-Control', 'no-store');
  if (!['/api/health', '/api/session'].includes(request.path)) {
    response.status(404).json({ error: 'Rota desconhecida' });
    return;
  }
  if (request.method !== 'GET') {
    response.set('Allow', 'GET').status(405).end();
    return;
  }
  if (request.path === '/api/session') {
    const bearer = /^Bearer ([^ ]+)$/.exec(request.get('Authorization') ?? '');
    try {
      if (!bearer) throw new Error('Token ausente');
      const identity = await auth.verifyIdToken(bearer[1]);
      if (identity.firebase.sign_in_provider !== 'google.com') throw new Error('Provedor inválido');
      response.json({ subject: identity.uid });
    } catch {
      response.status(401).json({ error: 'Entre com Google para continuar' });
    }
    return;
  }
  response.json({ status: 'ok' });
});
