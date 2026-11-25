# AI Gateway Demo

Base front-end em React, TypeScript e Vite para uma demonstração de gateway de IA. A versão inicial traz uma página de primeiros passos e uma lista de notas persistida no navegador. A integração com um gateway de IA ainda está em aberto.

## Instalação

Use Node.js 24 LTS e npm 11.16.0. Com o nvm instalado, execute na raiz do repositório:

```bash
nvm use
npm install --global npm@11.16.0
npm ci
```

## Execução

```bash
npm run dev
```

Abra o endereço informado pelo Vite. A demonstração funciona sem configurar variáveis de ambiente.

## Autenticação

Para habilitar o login OIDC, configure o emissor, o identificador público do cliente e a URI de retorno em `.env.local`, conforme [.env.example](.env.example).

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
