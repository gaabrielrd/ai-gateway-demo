# Fase 5 — Painel de juízes e classificação

Explicar a qualidade de cada geração por critério e produzir uma classificação reproduzível.

**Dependências e cobertura** · Fases 3–4 · RF-04–07 · RN-03–05 · CA-05–06

## Tarefas

- [x] **T15 — Configurar e identificar o painel.** Permitir ao administrador escolher três juízes compatíveis por tarefa. Validar capacidade de inspecionar imagens e registrar versões e critérios na execução, inclusive para orçar antes de gerar.
- [x] **T16 — Executar o julgamento.** Enviar saídas com identificadores anônimos, prompt, referência e critérios. Validar notas de 0 a 4, justificativas e marcações de não verificável. Avaliar uma resposta isolada ou comparar as concluídas. Conferir os campos de gabaritos verificáveis.
- [x] **T17 — Entregar classificação e pareceres.** Calcular mediana por critério e média com pesos iguais, incluindo o critério próprio quando presente. Mostrar empates, divergências e motivos de resultado parcial. Exibir custo e tempo dos juízes em separado e incluir eventual reavaliação na previsão de repetição.

## Critério de conclusão

Notas 1, 3 e 4 produzem mediana 3. Medianas 4, 3 e 2 produzem 3/4. Custos diferentes preservam o empate. Parecer ausente deixa o resultado parcial.

## Risco principal

Uma imagem indisponível ou um parecer inválido pode impedir a classificação completa. Preservar os pareceres válidos e testar esses casos sem atribuir zero à avaliação ausente.
