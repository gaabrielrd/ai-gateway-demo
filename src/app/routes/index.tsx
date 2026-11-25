import { DemoPage } from '@/features/demos';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { App } from '@/app/App';
import { AuthCallbackRoute, AuthGate } from '@/app/components/AuthGate';
import { NotFound, RouteErrorFallback } from '@/app/components/RouteErrorFallback';
import { GoogleAccountButton } from '@/features/auth';
import { CatalogRoute } from '@/features/catalog';
import { PanelsPage } from '@/features/judges';
import { AccessPage } from '@/features/access';
import { ExecutionPage, GalleryPage, HistoryPage } from '@/features/comparison';
import { env } from '@/shared/config/env';

/**
 * Definicao das rotas, separada do router para permitir montar a mesma
 * arvore com um router de memoria nos testes.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    // O provedor de autenticacao envolve o layout: as telas protegidas e o
    // retorno do provedor precisam do mesmo estado de sessao.
    element: (
      <AuthGate>
        <App account={<GoogleAccountButton />} />
      </AuthGate>
    ),
    // Captura erros do layout e de qualquer rota filha sem errorElement proprio.
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: <GalleryPage featured />,
      },
      {
        // Retorno do provedor de identidade (`redirect_uri`).
        path: 'auth/callback',
        element: <AuthCallbackRoute />,
      },
      { path: 'demos/fallback', element: <DemoPage kind="fallback" /> },
      { path: 'demos/cache', element: <DemoPage /> },
      { path: 'galeria', element: <GalleryPage /> },
      { path: 'galeria/:id', element: <ExecutionPage published /> },
      { path: 'admin/galeria', element: <GalleryPage manage /> },
      { path: 'historico', element: <HistoryPage /> },
      { path: 'execucoes/:id', element: <ExecutionPage /> },
      { path: 'comparar', element: <CatalogRoute /> },
      { path: 'admin/juizes', element: <PanelsPage /> },
      { path: 'acesso', element: <AccessPage /> },
      {
        // Qualquer endereco desconhecido cai aqui, dentro do layout.
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes, { basename: env.baseUrl });
