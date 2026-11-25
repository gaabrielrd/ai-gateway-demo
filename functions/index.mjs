import { onRequest } from 'firebase-functions/v2/https';

import { defineSecret } from 'firebase-functions/params';
import { tokenHandler, verifyGoogleIdentity } from './google-auth.mjs';

const googleClientSecret = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET');

export const aiGatewayGoogleToken = onRequest(
  { secrets: [googleClientSecret] },
  tokenHandler({
    configuration: () => ({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      secret: googleClientSecret.value(),
    }),
  }),
);

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
      const identity = await verifyGoogleIdentity(bearer?.[1], process.env.GOOGLE_OAUTH_CLIENT_ID);
      response.json({ subject: identity.subject });
    } catch {
      response.status(401).json({ error: 'Entre com Google para continuar' });
    }
    return;
  }
  response.json({ status: 'ok' });
});
