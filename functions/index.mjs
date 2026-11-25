import { onRequest } from 'firebase-functions/v2/https';

export const api = onRequest((request, response) => {
  response.set('Cache-Control', 'no-store');
  if (request.path !== '/api/health') {
    response.status(404).json({ error: 'Rota desconhecida' });
    return;
  }
  if (request.method !== 'GET') {
    response.set('Allow', 'GET').status(405).end();
    return;
  }
  response.json({ status: 'ok' });
});
