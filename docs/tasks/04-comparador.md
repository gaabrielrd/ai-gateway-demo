# Fase 4 — Comparador e resultados por tentativa

Percorrer o fluxo real de um prompt até as respostas, com geração e medição independentes por modelo.

**Dependências e cobertura** · Fases 1–3 · RF-03–04, RF-07 · CA-03, CA-06, CA-09

## Tarefas

- [x] **T11 — Integrar as primeiras gerações.** Criar o cliente de gateway nas Functions. Começar por texto e validar também a saída em imagem para o benchmark de estreia. Ligar cada modalidade compatível do catálogo ao adaptador e à apresentação correspondentes.
- [x] **T12 — Orquestrar a execução.** Validar prompt, modelos e opções no servidor. Criar execução privada com tentativas independentes vinculadas à reserva. Registrar estados, saída, provedor e versão efetivos, tempo até conclusão, unidade, tokens e USD.
- [x] **T13 — Montar a tela principal.** Substituir a entrada de onboarding pelo comparador com prompt textual, referência e critério opcionais. Recuperar o andamento por execução. Exibir saídas lado a lado ou empilhadas, separar medidas ausentes de zero e prever espaço para pareceres.
- [x] **T14 — Recuperar e repetir falhas.** Preservar respostas após recarga e falhas. Distinguir repetição técnica idempotente de nova tentativa solicitada pelo usuário. Testar modelos lentos, respostas incompletas, imagem e repetição individual com o custo previsto.

## Critério de conclusão

A mesma entrada chega a três versões. A primeira resposta aparece enquanto as demais continuam. Uma falha mantém as respostas prontas e repetir a tentativa exige uma nova previsão.

## Risco principal

Um timeout pode acontecer após o provedor aceitar a chamada. Identificar a tentativa antes de iniciar a geração e evitar disparar novamente só porque a tela foi recarregada.
