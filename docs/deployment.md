# Publicação do AI Gateway Demo

O projeto Firebase `timekeeper-d9a0a` compartilha infraestrutura com outros aplicativos. O site Hosting, o codebase das Functions e o banco Firestore deste aplicativo têm o nome `cf-ai-gateway`. O banco fica em `southamerica-east1`. A API HTTP recebe as chamadas encaminhadas por `/api/**`. Os demais caminhos abrem a SPA. [Site do comparador](https://cf-ai-gateway.web.app)

## Configuração do servidor

Configure `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_GATEWAY_ID` em `functions/.env.timekeeper-d9a0a`. O Secret Manager fornece `CLOUDFLARE_API_TOKEN` aos quatro trabalhadores que chamam modelos. A versão local do segredo fica em `functions/.secret.local`. O Firebase Authentication precisa ter o provedor Google ativo e o domínio publicado autorizado. As regras do bucket compartilhado protegem os objetos privados do comparador. As Functions leem as imagens com a identidade de serviço.

## Publicar uma atualização

Com as dependências da raiz e de `functions` instaladas, execute a validação com o Firestore Emulator e os testes de navegador. A validação gera o bundle em `dist`.

```bash
firebase emulators:exec --only firestore --project demo-ai-gateway 'npm run validate'
npm run test:e2e
firebase deploy --project timekeeper-d9a0a --only firestore:cf-ai-gateway,functions:cf-ai-gateway,hosting
```

Confira o site especificado em `firebase.json` antes da publicação. Na primeira instalação a CLI solicita confirmação para ativar repetição das quatro Functions de eventos. As repetições podem gerar cobranças de infraestrutura. A administração escolhe três juízes compatíveis por tarefa e publica, na galeria, as execuções próprias revisadas.

Abra a rota direta de um benchmark, confira o retorno do login Google e a previsão mensal de uma conta aprovada. Em uma janela anônima, confira os detalhes da galeria e a imagem pública. A consulta de saúde está em `/api/health`.

## GitHub Pages do template

O Pages hospeda os arquivos estáticos gerados pelo Vite. A publicação inclui
a página inicial e o styleguide, sem backend. O exemplo de notas continua
salvando dados apenas no navegador.

### Publicação automática

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment**, selecione **GitHub Actions** como Source.
3. Integre as alterações na `master`.
4. Acompanhe o workflow **GitHub Pages** em **Actions**.

O workflow valida o projeto antes de gerar o site e publica o artefato em um
job com permissão para Pages e OIDC. Apenas a `master` pode publicar, inclusive
em execução manual. Não há token pessoal nem segredo adicional no workflow.
O caminho público vem de `actions/configure-pages`: funciona tanto sob o nome
do repositório quanto na raiz de um domínio personalizado.

Neste repositório, a página inicial fica em
[https://devedtech.github.io/template-ia-web/](https://devedtech.github.io/template-ia-web/)
e o styleguide em
[https://devedtech.github.io/template-ia-web/styleguide/](https://devedtech.github.io/template-ia-web/styleguide/).

### Como o roteamento funciona

O build usa a mesma base para assets, favicon e `basename` do React Router.
A leitura de `BASE_URL` fica centralizada em `src/shared/config/env.ts`.
As fontes declaradas no CSS são reescritas pelo Vite para a base do build.

O GitHub Pages não oferece rewrite de SPA. Por isso `npm run build:pages`
gera uma cópia da entrada em `dist/styleguide/index.html`, permitindo abrir
e recarregar essa rota diretamente com HTTP 200. A cópia em `dist/404.html`
mostra a tela de não encontrado do app para endereços desconhecidos, mantendo
o status HTTP 404. As âncoras de seção do styleguide continuam disponíveis.

Ao adicionar uma nova rota pública que precisa de acesso direto, acrescente
sua entrada em `scripts/prepare-pages.mjs`. Rotas com parâmetros podem exigir
outra estratégia de hospedagem ou geração estática.

### Build local para o Pages

Em um terminal POSIX, execute:

```bash
PAGES_BASE_PATH=/template-ia-web/ npm run build:pages
```

`PAGES_BASE_PATH` é uma variável de build, não uma credencial. Sem ela, o
comando gera um site na raiz (`/`). O build normal e o servidor de
desenvolvimento continuam usando a raiz.

Para conferir o artefato, sirva `dist/` sob o mesmo prefixo, sem fallback de
SPA, e abra a página inicial e `/template-ia-web/styleguide/` diretamente.
Verifique também o favicon, as fontes e a navegação entre as páginas.

### Referências

- [Vite: GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub: configurar a origem da publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
