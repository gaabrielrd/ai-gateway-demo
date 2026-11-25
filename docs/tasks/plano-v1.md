# Plano de implementação do AI Gateway Demo

Este roteiro divide a [primeira versão aprovada](../prd.md) em oito entregas verificáveis. A [arquitetura](../architecture.md) define as fronteiras entre navegador, Cloud Functions e gateway. As caixas nas fichas representam trabalho de implementação planejado.

| Fase                                                                 | Tarefas | Resultado demonstrável                                                                                |
| -------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| [1. Fundação e ambiente local](01-fundacao.md)                       | T01–T03 | Preparar o caminho entre a aplicação web e uma função de servidor antes de integrar provedores.       |
| [2. Login, solicitações e administração](02-acesso.md)               | T04–T06 | Permitir leitura pública e controlar no servidor quem pode executar e administrar.                    |
| [3. Catálogo, previsão e reserva mensal](03-catalogo-e-orcamento.md) | T07–T10 | Dar ao usuário uma seleção válida e um limite de custo antes da primeira execução paga.               |
| [4. Comparador e resultados por tentativa](04-comparador.md)         | T11–T14 | Percorrer o fluxo real de um prompt até as respostas, com geração e medição independentes por modelo. |
| [5. Painel de juízes e classificação](05-juizes.md)                  | T15–T17 | Explicar a qualidade de cada geração por critério e produzir uma classificação reproduzível.          |
| [6. Histórico privado e galeria pública](06-historico-e-galeria.md)  | T18–T20 | Permitir revisitar uma comparação e publicar benchmarks que sobrevivem à expiração do original.       |
| [7. Demonstrações de cache e fallback](07-demos-gateway.md)          | T21–T23 | Mostrar o que o gateway fez em chamadas controladas e quanto tempo cada tentativa levou.              |
| [8. Aceite integrado e publicação](08-aceite-e-publicacao.md)        | T24–T26 | Conferir a jornada real de cada papel e publicar a primeira versão no Firebase.                       |

## Ordem de execução

Começar por T01. As fases 1 a 4 formam o caminho até a primeira geração real com autorização e reserva de saldo. A fase 5 completa a comparação de qualidade. A fase 6 depende dos pareceres para publicar os benchmarks completos. A fase 7 pode começar assim que a fase 4 terminar. A fase 8 reúne as entregas para homologação e publicação.

## Premissas e limites

- A implementação parte da SPA existente, com identidade visual própria. Reaproveitar os componentes e serviços compatíveis e manter o estado de negócio sensível no servidor.
- Projeto Firebase, login Google, acesso administrativo inicial, gateway de homologação, provedores habilitados e preços verificáveis são dependências operacionais para testes reais. Confirmar disponibilidade nas fases 1 a 3. O desenvolvimento local pode avançar com respostas controladas.
- A escolha do mecanismo de persistência e dos adaptadores concretos é trabalho técnico das fases 1 e 3. O catálogo deve refletir os modelos efetivamente habilitados. Texto e imagem precisam funcionar para os benchmarks de lançamento.
- Permanecem fora da versão upload de arquivos, execução pública, compartilhamento pessoal, seleção de juízes pelo usuário e sequências personalizadas de fallback.

## Como concluir cada entrega

Implementar uma tarefa por vez. Usar o PRD para conferir o comportamento, testar pelo fluxo público da feature e marcar a caixa após verificar o resultado. Em cada entrega, revisar o diff, rodar `npm run validate` e registrar a evidência conforme o [processo de desenvolvimento](../development-process.md). A fase 8 acrescenta E2E e verificação no ambiente publicado.
