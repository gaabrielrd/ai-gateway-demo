# Fase 3 — Catálogo, previsão e reserva mensal

Dar ao usuário uma seleção válida e um limite de custo antes da primeira execução paga.

**Dependências e cobertura** · Fases 1–2 · RF-01, RF-06 · RN-01–02 · CA-03–04

## Tarefas

- [x] **T07 — Montar o catálogo habilitado.** Inventariar os destinos realmente habilitados no gateway, provedor, versão, modalidades, unidade e origem do preço. Validar como obter uso, origem do cache e identidade do destino efetivo com exemplos das respostas.
- [x] **T08 — Entregar o seletor público.** Filtrar versões pela tarefa. Testar zero, uma, duas e três ou mais opções compatíveis. Mostrar por que uma tarefa está indisponível ou permite menos de três modelos.
- [x] **T09 — Calcular o teto de execução.** Limitar entradas e saídas de cada tentativa para estimar o máximo em USD, incluindo juízes, mídia e tentativas previstas. Preparar orçamento para comparação, repetição e demos. Mostrar saldo e teto antes de confirmar.
- [x] **T10 — Reservar e contabilizar no servidor.** Usar valores monetários com precisão definida, mês de Brasília e operação atômica por usuário. Vincular reserva e liquidação à execução. Testar concorrência, virada do mês, reenvio, falha parcial e recuperação de reserva após interrupção.

## Critério de conclusão

Com US$ 1 livre, duas reservas simultâneas de US$ 0,70 permitem uma execução. Gasto final de US$ 0,50 deixa US$ 0,50 disponíveis. Preço desconhecido bloqueia o início.

## Risco principal

Preço estimado para exibição e teto para autorização têm usos diferentes. Sem teto verificável, bloquear a execução. Em falhas com cobrança incerta, reconciliar a tentativa antes de liberar seu valor.

## Inventário da homologação

As Functions têm um [catálogo inicial de quatro destinos](../../functions/catalog.json) testados no gateway `ai-gateway-demo`. O [registro da T07](../entregas/t07-catalogo.md) reúne preços, medições e limites da verificação.
