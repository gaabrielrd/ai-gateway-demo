# Seleção de modelos por provedor

Entrega de 25/11/2026 na branch `codex/catalogo-por-provedor`, conforme o plano apresentado na conversa.

## Funcionalidades e critérios de aceite

- [x] Escolher o provedor e consultar seus modelos, incluindo os destinados a outras tarefas.
- [x] Combinar modelos de vários provedores e remover qualquer escolha sem voltar ao provedor de origem.
- [x] Ordenar pela data de inclusão publicada pela API ou por nome.
- [x] Usar o mesmo catálogo na seleção e no cálculo do orçamento.

A sincronização encontrou 295 modelos de 35 provedores. O comparador habilitou 68 modelos de texto e um de imagem. A disponibilidade depende do suporte ao formato e de limites e tarifas suficientes para calcular a reserva. A consulta aos metadados foi real. Os testes de geração usaram respostas simuladas.

## Arquivos e testes

`scripts/sync-model-catalog.mjs` lê as duas APIs da conta e atualiza `functions/catalog.json`. As configurações verificadas do Workers AI ficam em `functions/workers-models.json`. A atualização é manual e está descrita no [guia de integrações](../integrations.md). A API fornece a data de inclusão para ordenar por recência.

`CatalogPage.tsx` apresenta os provedores e as escolhas. `budget.mjs` verifica a disponibilidade também para juízes. `CatalogPage.test.tsx` cobre a troca de provedor, remoção, ordenação e limites por tarefa. Os testes Chromium em `app.spec.ts` e `roles.spec.ts` exercitam seleção por teclado e confirmação de uma execução.

## Validação

`npm run validate` concluiu com 115 testes Vitest aprovados, 81 testes Node aprovados e 12 ignorados nas condições locais. O build e o smoke test passaram. `npm run test:e2e` terminou com `6 passed (9.3s)`.

## Como verificar

Em **Comparar**, marque um modelo de Workers AI. Mude o provedor para **openai**, ordene por nome e marque outro modelo. Os dois aparecem na lista de selecionados. Remova o primeiro nessa lista e confira o contador.
