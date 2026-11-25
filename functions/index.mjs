import { onRequest } from 'firebase-functions/v2/https';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import { ownAccess } from './access.mjs';

const auth = getAuth(initializeApp());

export const aiGatewayApi = onRequest(async (request, response) => {
  response.set('Cache-Control', 'no-store');
  if (!['/api/health', '/api/session', '/api/access'].includes(request.path)) {
    response.status(404).json({ error: 'Rota desconhecida' });
    return;
  }
  if (request.method !== 'GET' && !(request.path === '/api/access' && request.method === 'POST')) {
    response
      .set('Allow', request.path === '/api/access' ? 'GET, POST' : 'GET')
      .status(405)
      .end();
    return;
  }
  if (request.path !== '/api/health') {
    const bearer = /^Bearer ([^ ]+)$/.exec(request.get('Authorization') ?? '');
    let identity;
    try {
      if (!bearer) throw new Error('Token ausente');
      identity = await auth.verifyIdToken(bearer[1]);
      if (identity.firebase.sign_in_provider !== 'google.com') throw new Error('Provedor inválido');
    } catch {
      response.status(401).json({ error: 'Entre com Google para continuar' });
      return;
    }
    if (request.path === '/api/access') {
      try {
        await ownAccess(request, response, identity);
      } catch {
        response.status(503).json({ error: 'Solicitações de acesso indisponíveis' });
      }
    } else response.json({ subject: identity.uid });
    return;
  }
  response.json({ status: 'ok' });
});
