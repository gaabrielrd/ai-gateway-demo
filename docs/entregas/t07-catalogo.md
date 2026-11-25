# T07 — Catálogo de homologação

Em 25/11/2026, o token existente recebeu somente a permissão `Workers AI: Read`. A consulta ao catálogo passou de HTTP 403 a 200. Com 100 itens por página, a primeira página trouxe 52 registros, as três seguintes vieram vazias e a API informou 337 em `total_count`. O plano gratuito recusou Inkling 2 Small com HTTP 403 e código 5035. O catálogo das Functions inclui somente os destinos com geração confirmada e tarifa conhecida.

## Gerações verificadas

O teste enviou o mesmo prompt textual com limite de oito tokens aos três modelos pelo endpoint de chat. O cabeçalho `cf-aig-gateway-id` selecionou `ai-gateway-demo`. A duração inclui a viagem de ida e volta e representa uma única observação por linha.

| Modelo no Workers AI      | Cache do gateway | Tokens de entrada / saída | Duração |
| ------------------------- | ---------------- | ------------------------- | ------- |
| Llama 3.3 70B FP8 Fast    | MISS             | 40 / 3                    | 3698 ms |
| Mistral Small 3.1 24B     | MISS             | 8 / 3                     | 959 ms  |
| Qwen2.5 Coder 32B         | MISS             | 34 / 3                    | 749 ms  |
| Llama, repetição idêntica | HIT              | 40 / 3                    | 98 ms   |
| FLUX.1 Schnell, um passo  | MISS             | indisponível              | 1341 ms |

Nos três chats, o campo `model` confirmou o identificador solicitado. As contagens vieram de `usage.prompt_tokens` e `usage.completion_tokens`. Na repetição, o cabeçalho `cf-aig-cache-status` mudou para HIT e o corpo preservou o uso original, inclusive `cached_tokens: 0`. A contabilização precisa considerar a origem da resposta para evitar cobrança duplicada.

A chamada direta ao caminho do FLUX retornou HTTP 200 e `result.image`. O corpo omitiu uso e modelo efetivo. Registrar o destino solicitado e o identificador de log para correlação. A tarifa de imagem usa blocos de 512 × 512 pixels e passos. As tarifas por versão, em USD, estão no [catálogo](../../functions/catalog.json). [Preços oficiais](https://developers.cloudflare.com/workers-ai/platform/pricing/) · [API REST](https://developers.cloudflare.com/ai-gateway/usage/rest-api/).

O provedor de execução dos quatro modelos é Workers AI. O painel indicou saldo pré-pago de US$ 0,00. Provedores externos ainda dependem de homologação própria.

A validação completa passou nas nove suítes do perfil padrão, incluindo os 91 testes do Vitest, build e smoke test.
