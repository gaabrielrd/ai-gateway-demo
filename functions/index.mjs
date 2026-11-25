import { onRequest } from 'firebase-functions/v2/https';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import { ownAccess, adminAccess, isAdministrator } from './access.mjs';

import { quoteBudget } from './quote.mjs';

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { panelsApi } from './panels.mjs';
import { retryApi } from './retries.mjs';
import { executionApi, executionPath, processAttempt } from './executions.mjs';

export const generateAttempt = onDocumentCreated(
  {
    document: executionPath,
    database: 'cf-ai-gateway',
    secrets: ['CLOUDFLARE_API_TOKEN'],
    timeoutSeconds: 180,
    retry: true,
  },
  (event) =>
    processAttempt(getFirestore('cf-ai-gateway'), {
      ...event.params,
      index: Number(event.params.index),
    }),
);

const auth = getAuth(initializeApp());

export const aiGatewayApi = onRequest(async (request, response) => {
  response.set('Cache-Control', 'no-store');
  const retryRoute = /^\/api\/executions\/[A-Za-z0-9_-]{1,128}\/attempts\/\d+\/(quote|retry)$/.test(
    request.path,
  );
  const createRoute = request.path === '/api/executions';
  const detailRoute = /^\/api\/executions\/[A-Za-z0-9_-]{1,128}(?:\/media\/\d+)?$/.test(
    request.path,
  );
  const accessRoute = ['/api/access', '/api/admin/access', '/api/admin/panels'].includes(
    request.path,
  );
  const quoteRoute = request.path === '/api/budget/quote';
  if (
    !retryRoute &&
    !createRoute &&
    !detailRoute &&
    !quoteRoute &&
    !accessRoute &&
    !['/api/health', '/api/session', '/api/access', '/api/admin/access'].includes(request.path)
  ) {
    response.status(404).json({ error: 'Rota desconhecida' });
    return;
  }
  if (
    quoteRoute || createRoute || retryRoute
      ? request.method !== 'POST'
      : request.method !== 'GET' && !(accessRoute && request.method === 'POST')
  ) {
    response
      .set(
        'Allow',
        quoteRoute || createRoute || retryRoute ? 'POST' : accessRoute ? 'GET, POST' : 'GET',
      )
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
    if (createRoute || detailRoute || retryRoute) {
      try {
        const handler = retryRoute ? retryApi : executionApi;
        await handler(request, response, identity);
      } catch {
        response.status(503).json({ error: 'Execução indisponível.' });
      }
      return;
    }
    if (accessRoute || quoteRoute) {
      try {
        const handler = quoteRoute
          ? quoteBudget
          : request.path === '/api/admin/panels'
            ? panelsApi
            : request.path === '/api/access'
              ? ownAccess
              : adminAccess;
        await handler(request, response, identity);
      } catch {
        response.status(503).json({
          error: quoteRoute ? 'Orçamento indisponível' : 'Solicitações de acesso indisponíveis',
        });
      }
    } else response.json({ subject: identity.uid, administrator: isAdministrator(identity) });
    return;
  }
  response.json({ status: 'ok' });
});
