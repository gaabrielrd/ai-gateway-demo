import { OAuth2Client } from 'google-auth-library';

const google = new OAuth2Client();

export async function verifyGoogleIdentity(idToken, clientId) {
  if (!clientId || !idToken) throw new Error('Identidade ausente');
  const ticket = await google.verifyIdToken({ idToken, audience: clientId });
  const claims = ticket.getPayload();
  if (!claims?.sub) throw new Error('Identidade inválida');
  return { subject: claims.sub, expiresAt: claims.exp };
}

export function tokenHandler({ configuration, verify = verifyGoogleIdentity, send = fetch }) {
  return async (request, response) => {
    response.set('Cache-Control', 'no-store');
    if (request.method !== 'POST') return response.set('Allow', 'POST').sendStatus(405);
    const settings = configuration();
    if (!settings.clientId || !settings.secret || !settings.redirectUri) {
      return response.status(503).json({ error: 'Login indisponível' });
    }
    const body = request.body;
    if (
      body?.grant_type !== 'authorization_code' ||
      body.client_id !== settings.clientId ||
      body.redirect_uri !== settings.redirectUri ||
      typeof body.code !== 'string' ||
      !body.code ||
      typeof body.code_verifier !== 'string' ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier)
    ) {
      return response.status(400).json({ error: 'Pedido de login inválido' });
    }
    try {
      const upstream = await send('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: body.code,
          code_verifier: body.code_verifier,
          client_id: settings.clientId,
          client_secret: settings.secret,
          redirect_uri: settings.redirectUri,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) return response.status(401).json({ error: 'Login recusado' });
      const tokens = await upstream.json();
      const identity = await verify(tokens.id_token, settings.clientId);
      // A SPA usa o ID token verificado como credencial Bearer da nossa API.
      // O token de acesso às APIs do Google permanece no servidor.
      return response.json({
        access_token: tokens.id_token,
        token_type: 'Bearer',
        expires_in: Math.max(0, identity.expiresAt - Math.floor(Date.now() / 1000)),
      });
    } catch {
      return response.status(401).json({ error: 'Falha ao verificar a identidade' });
    }
  };
}
