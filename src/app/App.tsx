// App: layout principal da aplicacao e roteamento base.
//
// Erros de renderizacao deste layout ou das rotas filhas sao tratados pelo
// `errorElement` registrado em `app/routes`, que cobre inclusive falhas no
// proprio header.
import { Home } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { env } from '@/shared/config/env';
import styles from './App.module.css';

const PROJECT_NAME = 'AI Gateway Demo';

export function App({ account }: { account?: ReactNode }) {
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          {/* Marca decorativa: o nome do projeto ao lado ja identifica a pagina. */}
          <img
            className={styles.mark}
            src={`${env.baseUrl}favicon.svg`}
            alt=""
            width="28"
            height="28"
          />
          <h1 className={styles.projectName}>{PROJECT_NAME}</h1>
        </div>
        <nav className={styles.nav} aria-label="Navegação principal">
          <NavLink to="/" end>
            <Home className="icon icon-sm" aria-hidden="true" />
            Início
          </NavLink>
          <NavLink to="/comparar">Comparar modelos</NavLink>
          <NavLink to="/historico">Meu histórico</NavLink>
          <NavLink to="/acesso">Meu acesso</NavLink>
          {account}
        </nav>
      </header>

      <main id="conteudo" className={styles.content} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
