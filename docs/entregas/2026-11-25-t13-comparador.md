# T13 — Comparador na página inicial

A página inicial e a rota `/comparar` abrem o catálogo público. Com seleção válida, acesso aprovado e orçamento disponível, a pessoa pode usar um prompt de exemplo ou escrever o próprio, acrescentar gabarito e critério e confirmar a execução pelo teto apresentado.

A rota privada `/execucoes/:id` recupera o andamento pela API. Os resultados aparecem conforme terminam, em colunas no desktop e empilhados em telas de até 640 px. Cada tentativa apresenta a versão solicitada, a efetiva quando informada, o provedor, tempo, tokens, USD, unidade e cache. Zero é exibido como valor, e campos ausentes aparecem como “Não informado”. Imagens usam uma URL local criada após uma requisição autenticada. A seção de pareceres aguarda a integração do painel na fase 5.

## Validação

O teste de fluxo usa respostas controladas para verificar os campos enviados, a confirmação de orçamento, uma resposta concluída enquanto outra está em andamento, a preservação da primeira após falha e a recuperação de uma imagem privada após erro de rede. O Chromium verificou a seleção por teclado, a página de rota desconhecida e o catálogo sem transbordamento horizontal no celular.

```text
Test Files  18 passed (18)
Tests  105 passed (105)
Smoke test do bundle OK.
Validação concluída.
3 passed (3.7s)
```

Comandos executados: `npm run validate` e `npm run test:e2e`. A homologação de uma jornada completa com o painel real depende da configuração dos juízes prevista na [fase 5](../tasks/05-juizes.md).
