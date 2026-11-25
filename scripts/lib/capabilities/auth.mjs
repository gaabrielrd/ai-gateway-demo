// Desliga a capacidade `auth`: remove a feature, a composição, a rota de
// retorno e as regras que existiam só por causa dela.
//
// Remover é mais confiável que gerar: o template carrega a feature como código
// real, verificada pelo seu próprio CI, e o setup tira o que o projeto não
// quer. Uma feature removida só volta pelo Git — igual à escolha de interface
// do template Python.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { removeSection, replaceExact } from '../markdown-sections.mjs';

function edit(root, file, mutate) {
  const path = join(root, file);
  if (!existsSync(path)) return false;
  writeFileSync(path, mutate(readFileSync(path, 'utf8'), file));
  return true;
}

/**
 * @param {string} root raiz do repositório.
 * @param {(message: string) => void} log
 */
export function removeAuth(root, log = () => {}) {
  for (const path of [
    'src/features/auth',
    'src/features/access',
    'src/app/components/AuthGate.tsx',
    'docs/decisions/0015-authentication.md',
  ]) {
    const target = join(root, path);
    if (!existsSync(target)) continue;
    rmSync(target, { recursive: true, force: true });
    log(`Removido: ${path}`);
  }

  edit(root, 'src/app/routes/index.tsx', (source, file) => {
    let next = replaceExact(
      source,
      "import { AuthCallbackRoute, AuthGate } from '@/app/components/AuthGate';\n",
      '',
      file,
    );
    next = next
      .replace("import { AccessPage } from '@/features/access';\n", '')
      .replace("      { path: 'acesso', element: <AccessPage /> },\n", '');
    next = next.replace("import { GoogleAccountButton } from '@/features/auth';\n", '');
    next = next.replace('<App account={<GoogleAccountButton />} />', '<App />');
    next = replaceExact(
      next,
      `    // O provedor de autenticacao envolve o layout: as telas protegidas e o
    // retorno do provedor precisam do mesmo estado de sessao.
    element: (
      <AuthGate>
        <App />
      </AuthGate>
    ),`,
      '    element: <App />,',
      file,
    );
    next = replaceExact(
      next,
      `      {
        // Retorno do provedor de identidade (\`redirect_uri\`).
        path: 'auth/callback',
        element: <AuthCallbackRoute />,
      },
`,
      '',
      file,
    );
    return next;
  });

  edit(root, 'src/app/App.tsx', (source) =>
    source.replace('          <NavLink to="/acesso">Meu acesso</NavLink>\n', ''),
  );
  // Configuração de ambiente: sem a feature, as variáveis não têm leitor.
  edit(root, '.env.example', (source) =>
    source.replace(/\n# --- Autenticacao \(opcional\) ---[\s\S]*$/, '\n'),
  );
  edit(root, 'src/vite-env.d.ts', (source) =>
    source.replace(/\n {2}\/\*\* Emissor OIDC[\s\S]*?readonly VITE_AUTH_SCOPE\?: string;/, ''),
  );
  edit(root, 'src/shared/config/env.ts', (source) => {
    let next = source.replace(
      /\/\*\*\n \* Configuracao do provedor de identidade[\s\S]*?\n\}\n\n(?=export interface Env)/,
      '',
    );
    next = next.replace(
      /\n {2}\/\*\*\n {3}\* Provedor de identidade, quando configurado[\s\S]*?readonly auth: AuthEnv \| undefined;/,
      '',
    );
    next = next.replace(/\/\*\*\n \* Le a configuracao do provedor[\s\S]*?\n\}\n\n(?=\/\*\*)/, '');
    next = next.replace(/\n {2}const auth = readAuth\(raw, problems\);/, '');
    next = next.replace(/\n {4}auth,/, '');
    return next;
  });
  // Os testes de ambiente afirmam o contrato de `env.auth`, que deixou de
  // existir. Removidos pelo bloco inteiro: o `describe` é a âncora, e a
  // ausência dele significa que o template mudou sem este script saber.
  edit(root, 'src/shared/config/tests/env.test.ts', (source, file) => {
    if (!source.includes("describe('configuracao de autenticacao', () => {")) {
      throw new Error(`${file}: bloco de testes de autenticação não encontrado.`);
    }
    return source.replace(
      /\n*describe\('configuracao de autenticacao', \(\) => \{[\s\S]*?\n\}\);\n/,
      '\n',
    );
  });
  edit(
    root,
    'src/shared/config/index.ts',
    () => "export { createEnv, env, EnvValidationError, type Env } from './env';\n",
  );

  edit(root, 'AGENTS.md', (source) => removeSection(source, 'Autenticação'));
  edit(root, 'README.md', (source) => removeSection(source, 'Autenticação'));
  log('Regras e documentação realinhadas: AGENTS.md, README.md');
}
