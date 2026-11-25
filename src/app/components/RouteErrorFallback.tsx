import { Button } from '@/shared/ui';
import { FileQuestionMark, TriangleAlert } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import styles from './RouteErrorFallback.module.css';

/**
 * Tela para enderecos que nao correspondem a nenhuma rota.
 * Usada tanto pela rota curinga quanto pelo `errorElement` diante de um 404.
 */
export function NotFound() {
  return (
    <section className={styles.container} role="alert">
      <h1 className={styles.title}>
        <FileQuestionMark className="icon" aria-hidden="true" />
        Página não encontrada
      </h1>
      <p>O endereço acessado não existe neste aplicativo.</p>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </section>
  );
}

/**
 * Tela mostrada quando uma rota falha ao carregar ou ao renderizar.
 * Registrada como `errorElement` para que nenhum erro de rota resulte
 * em tela branca.
 */
export function RouteErrorFallback() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  const detail = error instanceof Error ? error.message : '';

  return (
    <section className={styles.container} role="alert">
      <h1 className={styles.title}>
        <TriangleAlert className="icon" aria-hidden="true" />
        Não foi possível carregar esta página
      </h1>
      <p>Tente novamente. Se o problema continuar, avise quem mantém o projeto.</p>
      {detail ? (
        <details>
          <summary>Detalhes técnicos</summary>
          <pre className={styles.detail}>{detail}</pre>
        </details>
      ) : null}
      <Button variant="default" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </section>
  );
}
