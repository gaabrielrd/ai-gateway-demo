# AI Gateway Demo

Comparador de modelos do Cloudflare AI Gateway com React, TypeScript, Firebase Hosting e Cloud Functions. A página inicial abre um benchmark público em destaque. Em **Comparar**, o desenvolvedor escolhe as versões para seu próprio teste. Usuários aprovados podem consultar o orçamento, confirmar o prompt e acompanhar cada geração em uma URL privada. A execução depende de um painel de juízes configurado para a tarefa.

[Abrir o comparador](https://cf-ai-gateway.web.app) · [Consultar os benchmarks](https://cf-ai-gateway.web.app/galeria) · [Guia de publicação](docs/deployment.md)

## Instalação

Use Node.js 24 LTS e npm 11.16.0. Com o nvm instalado, execute na raiz do repositório:

```bash
nvm use
npm install --global npm@11.16.0
npm ci
npm ci --prefix functions
```

## Execução

```bash
npm run dev
```

Abra o endereço informado pelo Vite. O catálogo em `/comparar` pode ser explorado sem credenciais. A galeria e os resultados consultam a API do Firebase; o servidor Vite encaminha `/api` ao Hosting local na porta 5500.

## Autenticação

O botão **Entrar com Google** abre o popup do Firebase Authentication. A sessão fica em memória, e as Functions verificam o ID token Firebase de cada chamada autenticada.

## Validação

```bash
npm run validate
```

O perfil `padrao` verifica a arquitetura, documentação, formatação, lint, tipos, testes com cobertura e build de produção. O smoke test verifica o HTML e os assets servidos pelo build. O CI também executa os testes de navegador.

| Comando                  | O que faz                                    |
| ------------------------ | -------------------------------------------- |
| `npm run validate:quick` | Verificar o código durante o desenvolvimento |
| `npm run test:unit`      | Rodar os testes de unidade e componentes     |
| `npm run test:e2e`       | Testar a aplicação no Chromium               |
| `npm run build`          | Gerar e verificar o bundle de produção       |

Para a primeira execução dos testes de navegador, instale o Chromium com `npx playwright install chromium`.

## Estrutura

- `src/app` reúne rotas, composição e layout.
- `src/features` contém a página inicial, as notas e as demais funcionalidades do projeto.
- `src/shared/ui` reúne os componentes da identidade própria. Os tokens visuais ficam em `src/styles/tokens.css`.

Consulte a [arquitetura](docs/architecture.md), o [guia visual](docs/styleguide.md) e o [processo de desenvolvimento](docs/development-process.md) para criar funcionalidades e registrar decisões. As instruções para trabalhar com agentes ficam no [guia de skills](docs/skills-guide.md).

## Firebase local

Com o Firebase CLI instalado, gere o bundle e inicie Hosting e Functions em um projeto de demonstração local:

```bash
npm run build
firebase emulators:start --only hosting,functions,firestore --project demo-ai-gateway
```

Abra `http://127.0.0.1:5500/`. A tela **Meu acesso** usa o banco Firestore dedicado `cf-ai-gateway` pelas Functions. O emulador do Firestore requer Java 21. Para testar com login Google real e dados locais, use `--project homologacao` com os três emuladores em execução. O caminho `/api/health` verifica a função sem chamar provedores. Os segredos de funções que integram serviços externos devem ser vinculados à função consumidora pelo Secret Manager. O emulador aceita valores de desenvolvimento em `functions/.secret.local`, ignorado pelo Git. O endpoint de saúde dispensa segredos.

### Login no ambiente local

Use o projeto Firebase `timekeeper-d9a0a` e o site `cf-ai-gateway` na homologação. Em **Authentication → Settings → Authorized domains**, autorize o hostname usado para abrir o app, por exemplo `localhost` para desenvolvimento. O provedor Google deve estar habilitado. O SDK usa os identificadores públicos do aplicativo Web e gerencia a janela de login. [Login Google pelo Firebase](https://firebase.google.com/docs/auth/web/google-signin).
