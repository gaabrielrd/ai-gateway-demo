import { Disclosure } from '@/shared/ui';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import styles from './App.module.css';

const PROJECT_NAME = 'AI Gateway Demo';

export function App({ account }: { account?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} to="/">
          {PROJECT_NAME}
        </Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          <NavLink to="/galeria">Benchmarks</NavLink>
          <NavLink to="/comparar">Comparar</NavLink>
          <Disclosure key={'gateway' + pathname} title="Gateway">
            <div>
              <Link to="/demos/cache">Cache</Link>
              <Link to="/demos/fallback">Fallback</Link>
            </div>
          </Disclosure>
        </nav>
        <div className={styles.account}>
          <Disclosure key={pathname} title="Conta">
            <div>
              <Link to="/historico">Meu histórico</Link>
              <Link to="/acesso">Meu acesso</Link>
            </div>
          </Disclosure>
          {account}
        </div>
      </header>
      <main id="conteudo" className={styles.content} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
