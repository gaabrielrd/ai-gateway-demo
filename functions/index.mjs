import { runFallbackDemo } from './fallback-demo.mjs';
import { demoApi, runCacheDemo } from './cache-demo.mjs';
import { galleryApi } from './gallery.mjs';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { purgeExpired } from './history.mjs';
import { onRequest } from 'firebase-functions/v2/https';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import { ownAccess, adminAccess, isAdministrator } from './access.mjs';

import { quoteBudget } from './quote.mjs';

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { panelsApi } from './panels.mjs';
import { judgeAfterGeneration } from './judging.mjs';
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

export const judgeGenerations = onDocumentUpdated(
  {
    document: executionPath,
    database: 'cf-ai-gateway',
    secrets: ['CLOUDFLARE_API_TOKEN'],
    timeoutSeconds: 240,
    retry: true,
  },
  (event) => {
    const after = event.data?.after.data();
    if (after && ['completed', 'failed'].includes(after.status))
      return judgeAfterGeneration(getFirestore('cf-ai-gateway'), {
        ...event.params,
        index: Number(event.params.index),
      });
  },
);

export const purgePrivateHistory = onSchedule(
  { schedule: 'every 5 minutes', timeoutSeconds: 540, maxInstances: 1 },
  () => purgeExpired(getFirestore('cf-ai-gateway')),
);

export const repeatCacheDemo = onDocumentCreated(
  {
    document: 'users/{uid}/cacheDemos/{runId}',
    database: 'cf-ai-gateway',
    secrets: ['CLOUDFLARE_API_TOKEN'],
    timeoutSeconds: 240,
    retry: true,
  },
  (event) => runCacheDemo(getFirestore('cf-ai-gateway'), event.params),
);

export const executeFallbackDemo = onDocumentCreated(
  {
    document: 'users/{uid}/fallbackDemos/{runId}',
    database: 'cf-ai-gateway',
    secrets: ['CLOUDFLARE_API_TOKEN'],
    timeoutSeconds: 120,
    retry: true,
  },
  (event) => runFallbackDemo(getFirestore('cf-ai-gateway'), event.params),
);
const auth = getAuth(initializeApp());

export const aiGatewayApi = onRequest(async (request, response) => {
  response.set('Cache-Control', 'no-store');
  const demoRoute = /^\/api\/demos\/(?:cache|fallback)(?:\/[a-f0-9-]{36})?$/.test(request.path);
  const publicGallery = /^\/api\/gallery(?:\/[a-f0-9]{64}(?:\/media\/\d+)?)?$/.test(request.path);
  const adminGallery = /^\/api\/admin\/gallery(?:\/[a-f0-9]{64})?$/.test(request.path);
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
    !demoRoute &&
    !publicGallery &&
    !adminGallery &&
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
  let methods = ['GET'];
  if (createRoute || accessRoute) methods = ['GET', 'POST'];
  if (quoteRoute || retryRoute) methods = ['POST'];
  if (detailRoute && !request.path.includes('/media/')) methods = ['GET', 'DELETE'];
  if (adminGallery) methods = request.path === '/api/admin/gallery' ? ['GET', 'POST'] : ['DELETE'];
  if (demoRoute && request.path.split('/').length === 4) methods = ['GET', 'POST'];
  if (!methods.includes(request.method)) {
    response.set('Allow', methods.join(', ')).status(405).end();
    return;
  }
  if (publicGallery) return galleryApi(getFirestore('cf-ai-gateway'), request, response);
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
    if (demoRoute) {
      try {
        return await demoApi(getFirestore('cf-ai-gateway'), request, response, identity);
      } catch {
        return response.status(503).json({ error: 'Demonstração indisponível.' });
      }
    }
    if (adminGallery) return galleryApi(getFirestore('cf-ai-gateway'), request, response, identity);
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
