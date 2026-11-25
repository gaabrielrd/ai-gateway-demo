# Fase 1 — Fundação e ambiente local

Preparar o caminho entre a aplicação web e uma função de servidor antes de integrar provedores.

**Dependências e cobertura** · Base inicial

## Tarefas

- [x] **T01 — Conferir a base existente.** Mapear a autenticação OIDC, rotas, configuração de ambiente, tokens visuais, testes e publicação herdada. Identificar o que reaproveitar e registrar as diferenças para Firebase Hosting.
- [x] **T02 — Definir persistência e contratos.** Comparar as opções de armazenamento transacional e de mídia no Firebase. Documentar identidade, autorização, execução, tentativa, parecer, reserva e publicação, com autoria e prazos. Registrar a escolha e o motivo na arquitetura.
- [x] **T03 — Preparar Firebase e testes locais.** Configurar Hosting para a SPA, Cloud Functions, ambiente local de testes e acesso a segredos no servidor. Conferir compatibilidade com Node 24. Integrar os testes do servidor à validação e exercitar uma chamada sem custo.

## Critério de conclusão

A aplicação e uma função de teste rodam localmente. Atualizar diretamente uma rota do app funciona. O bundle público não contém credenciais.

## Risco principal

A configuração de GitHub Pages pertence ao template. Verificar base de rotas, retorno do login e separação entre configuração pública e segredos antes do primeiro deploy.

## Inventário da base — T01

| Área        | Reaproveitamento e trabalho previsto                                                                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade  | A feature `auth` já implementa OIDC com PKCE, retorno em `/auth/callback`, renovação e token em memória. Preservar a sessão e o isolamento dos serviços. Na T04, validar a identidade Google no servidor. A aprovação administrativa é uma autorização adicional. |
| Rotas       | `src/app/routes/index.tsx` já compõe o layout, callback, tratamento de erro e rota curinga. A raiz ainda monta o onboarding e as notas. Na T13 passará a abrir o comparador.                                                                                      |
| Ambiente    | `src/shared/config/env.ts` centraliza a configuração pública do Vite. Manter as credenciais de provedor e gateway nas Functions.                                                                                                                                  |
| Interface   | Reutilizar `src/styles/tokens.css`, os primitivos `Button` e `PageHeader` em `src/shared/ui`, CSS Modules e a navegação acessível do layout.                                                                                                                      |
| Verificação | Vitest cobre modelo e componentes, os testes Node cobrem scripts e o Playwright cobre navegação. O smoke HTTP verifica o bundle. Na T03, acrescentar os testes do servidor ao gate.                                                                               |
| Publicação  | O workflow Pages gera entradas estáticas com base variável. O Hosting do produto precisa servir o bundle na raiz, encaminhar a API às Functions e devolver a SPA nas rotas de navegação, inclusive ao atualizar a página do callback.                             |
