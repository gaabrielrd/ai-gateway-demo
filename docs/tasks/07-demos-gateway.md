# Fase 7 — Demonstrações de cache e fallback

Mostrar o que o gateway fez em chamadas controladas e quanto tempo cada tentativa levou.

**Dependências e cobertura** · Fases 2–4 · RF-10–11 · RN-01–02 · CA-07

## Tarefas

- [x] **T21 — Entregar o exemplo de cache.** Preparar a entrada fixa e repetir a chamada pelas Functions. Ler a indicação de origem do gateway e medir cada tentativa. Testar acerto, duas passagens pelo provedor e metadado ausente.
- [x] **T22 — Entregar o exemplo de fallback.** Configurar cenário isolado com falha controlada no primeiro destino. Apresentar a sequência efetiva, erros e modelo final. Exercitar também a indisponibilidade do segundo destino.
- [x] **T23 — Verificar custo e acesso das demos.** Aplicar aprovação e teto para as tentativas previstas. Conferir os indicadores com os registros do gateway em um ensaio controlado, incluindo um caso em que o cache não atende a repetição.

## Critério de conclusão

A demo identifica a origem observada nas duas chamadas idênticas e a duração de cada uma. A demo de fallback apresenta a falha preparada e o destino que respondeu.

## Risco principal

Inferir cache por menor latência ou exibir a sequência planejada como observada induz a erro. Apresentar evidência do gateway e sinalizar metadados ausentes.
