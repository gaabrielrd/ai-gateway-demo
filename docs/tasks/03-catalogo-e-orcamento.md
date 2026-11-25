# Fase 3 — Catálogo, previsão e reserva mensal

Dar ao usuário uma seleção válida e um limite de custo antes da primeira execução paga.

**Dependências e cobertura** · Fases 1–2 · RF-01, RF-06 · RN-01–02 · CA-03–04

## Tarefas

- [ ] **T07 — Montar o catálogo habilitado.** Inventariar os destinos realmente habilitados no gateway, provedor, versão, modalidades, unidade e origem do preço. Validar como obter uso, origem do cache e identidade do destino efetivo com exemplos das respostas.
- [ ] **T08 — Entregar o seletor público.** Filtrar versões pela tarefa. Testar zero, uma, duas e três ou mais opções compatíveis. Mostrar por que uma tarefa está indisponível ou permite menos de três modelos.
- [ ] **T09 — Calcular o teto de execução.** Limitar entradas e saídas de cada tentativa para estimar o máximo em USD, incluindo juízes, mídia e tentativas previstas. Preparar orçamento para comparação, repetição e demos. Mostrar saldo e teto antes de confirmar.
- [ ] **T10 — Reservar e contabilizar no servidor.** Usar valores monetários com precisão definida, mês de Brasília e operação atômica por usuário. Vincular reserva e liquidação à execução. Testar concorrência, virada do mês, reenvio, falha parcial e recuperação de reserva após interrupção.

## Critério de conclusão

Com US$ 1 livre, duas reservas simultâneas de US$ 0,70 permitem uma execução. Gasto final de US$ 0,50 deixa US$ 0,50 disponíveis. Preço desconhecido bloqueia o início.

## Risco principal

Preço estimado para exibição e teto para autorização têm usos diferentes. Sem teto verificável, bloquear a execução. Em falhas com cobrança incerta, reconciliar a tentativa antes de liberar seu valor.

## Inventário da homologação — T07 em andamento

O gateway de homologação é `ai-gateway-demo`. O token local de execução está em `functions/.secret.local` sob a variável `CLOUDFLARE_API_TOKEN`. Em 25/11/2026 a verificação do token retornou HTTP 200 e estado `active`. A consulta `GET /accounts/{account_id}/ai/models/search` retornou HTTP 403, código Cloudflare `10000`, com a permissão `AI Gateway: Run`. O endpoint de catálogo requer acesso a Workers AI. O painel mostrou US$ 0,00 de créditos pré-pagos e cobrança padrão para Workers AI.

Os modelos destacados pelo painel ainda não foram verificados como executáveis na conta. A próxima verificação é consultar o catálogo com `Workers AI: Read` e cruzar os identificadores e modalidades com as evidências de resposta e preço. A API REST aceita essa permissão para inferência. [Autenticação da API REST da Cloudflare](https://developers.cloudflare.com/ai-gateway/usage/rest-api/#authentication).
