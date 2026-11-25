---
target: Telas do AI Gateway Demo
total_score: 364
max_score: 472
na_heuristics: 5 (404 e erro geral)
p0_count: 0
p1_count: 0
target_identity: 'file:/Users/gaabrielrd/Dev/pessoal/ai-gateway-demo/src/app/routes/index.tsx'
target_fingerprint: 'sha256:e159c634c9ef1a40a2c982847913d2e9c39cef28eaea3cc12350bda9cc643154'
target_path: /Users/gaabrielrd/Dev/pessoal/ai-gateway-demo/src/app/routes/index.tsx
timestamp: 2026-11-25T22-22-48Z
slug: src-app-routes-index-tsx
---

# Crítica de usabilidade das telas do AI Gateway Demo

Avaliação independente de design por `design` e inspeção técnica por `evidence`. Cada nota expressa julgamento heurístico de 0 a 4. O detector examina padrões no código e na página renderizada. A confirmação final reuniu 23 estados desktop e seis estados em cada uma das larguras de 1280 e 390 px com sessões e dados simulados.

As 13 rotas incluem a inicial e o callback de compatibilidade, que convergem para o benchmark público. Ambos herdam a avaliação do destino. O erro geral de rota tem avaliação própria. As doze superfícies distintas somaram **290/472 antes e 364/472 depois**. A nota de prevenção de erros é inaplicável às duas páginas de recuperação.

| Superfície           | Antes | Depois | Mudança observável                                                                                           |
| -------------------- | ----: | -----: | ------------------------------------------------------------------------------------------------------------ |
| Benchmark público    | 31/40 |  34/40 | A conclusão distingue empate, classificação parcial e liderança. A tabela omite campos sem conferência.      |
| Cache                | 25/40 |  32/40 | O percurso das duas chamadas e o orçamento aparecem antes da execução.                                       |
| Fallback             | 25/40 |  32/40 | A ordem dos destinos aparece antes da execução e o resultado registra o destino efetivo.                     |
| Galeria pública      | 24/40 |  30/40 | Cada título ocupa uma linha acionável. A galeria vazia oferece o comparador.                                 |
| Gerenciar benchmarks | 23/40 |  31/40 | Login contextual substitui uma tentativa de recarregamento inútil. A retirada continua exigindo confirmação. |
| Meu histórico        | 26/40 |  31/40 | Datas de retenção ficam junto à execução. O estado vazio oferece a primeira comparação.                      |
| Execução privada     | 26/40 |  30/40 | Saídas ficam lado a lado, com métricas alinhadas abaixo. A tela oferece login quando necessário.             |
| Comparar             | 24/40 |  32/40 | O resumo de seleção permanece visível durante a escolha. Antes, a contagem começava a 2.136 px do topo.      |
| Painéis de juízes    | 22/40 |  29/40 | Cada tarefa tem seu painel, seus critérios e a contagem de versões selecionadas.                             |
| Meu acesso           | 21/40 |  29/40 | O pedido pendente explica a espera. Após aprovação, a comparação fica a um clique.                           |
| Página inexistente   | 27/36 |  28/36 | Título de página e ação de retorno com hierarquia própria.                                                   |
| Erro geral           | 16/36 |  26/36 | Nova tentativa recarrega a rota. A mensagem técnica abre sob demanda.                                        |

## Notas por heurística

Da esquerda para a direita, as dez posições representam estado do sistema, linguagem familiar, controle, consistência, prevenção de erros, reconhecimento, eficiência, estética, recuperação de erros e ajuda contextual.

| Superfície           | Antes                                 | Depois                                |
| -------------------- | ------------------------------------- | ------------------------------------- |
| Benchmark público    | 3 · 3 · 3 · 3 · 3 · 3 · 4 · 4 · 3 · 2 | 3 · 4 · 4 · 3 · 3 · 4 · 3 · 4 · 3 · 3 |
| Cache                | 3 · 3 · 2 · 2 · 4 · 3 · 2 · 2 · 2 · 2 | 3 · 4 · 3 · 3 · 4 · 3 · 3 · 3 · 3 · 3 |
| Fallback             | 3 · 3 · 2 · 2 · 4 · 3 · 2 · 2 · 2 · 2 | 3 · 4 · 3 · 3 · 4 · 3 · 3 · 3 · 3 · 3 |
| Galeria pública      | 3 · 3 · 2 · 2 · 3 · 2 · 2 · 2 · 3 · 2 | 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 |
| Gerenciar benchmarks | 2 · 3 · 3 · 2 · 4 · 2 · 2 · 2 · 1 · 2 | 3 · 3 · 3 · 3 · 4 · 3 · 3 · 3 · 3 · 3 |
| Meu histórico        | 3 · 3 · 3 · 2 · 4 · 2 · 2 · 2 · 3 · 2 | 3 · 3 · 3 · 3 · 4 · 3 · 3 · 3 · 3 · 3 |
| Execução privada     | 3 · 3 · 3 · 2 · 3 · 3 · 2 · 2 · 3 · 2 | 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 |
| Comparar             | 2 · 3 · 3 · 3 · 3 · 2 · 1 · 2 · 3 · 2 | 4 · 3 · 3 · 3 · 3 · 4 · 3 · 3 · 3 · 3 |
| Painéis de juízes    | 2 · 3 · 2 · 2 · 3 · 2 · 2 · 2 · 2 · 2 | 3 · 3 · 2 · 3 · 3 · 3 · 3 · 3 · 3 · 3 |
| Meu acesso           | 2 · 3 · 2 · 2 · 2 · 2 · 2 · 2 · 2 · 2 | 3 · 3 · 3 · 3 · 2 · 3 · 3 · 3 · 3 · 3 |
| Página inexistente   | 3 · 4 · 3 · 3 · - · 3 · 3 · 3 · 3 · 2 | 3 · 4 · 3 · 3 · - · 3 · 3 · 4 · 3 · 2 |
| Erro geral           | 2 · 2 · 2 · 2 · - · 2 · 2 · 2 · 1 · 1 | 3 · 3 · 3 · 3 · - · 3 · 3 · 3 · 3 · 2 |

## Achados e limites

- **Visitante.** O benchmark permite percorrer a linha, o caminho do prompt e o parecer sem perder o modelo selecionado. O link para comparar reaproveita as entradas. Nas telas privadas, o convite de login agora abre a autenticação ali mesmo.
- **Desenvolvedor.** O catálogo inicial tinha 25 caixas de seleção e 35 provedores. A divisão em lista e seleção permite acompanhar quantas versões faltam durante a escolha. O seletor ainda requer consultar o provedor para saber quais versões estão disponíveis para a tarefa.
- **Administrador.** A fila, as ações de acesso e a configuração dos juízes têm áreas distintas. Os painéis exibem quantas versões foram selecionadas. A ação de salvar continua disponível quando um painel completo está intacto.
- **Inspeção técnica.** O detector de código sinalizou zero ocorrências antes e depois. Nas cinco páginas com detector de navegador, os 25 avisos de entrelinha do catálogo desapareceram. Dos três avisos finais, dois correspondem ao sublinhado da navegação ativa e um à diferença de altura entre o catálogo e a seleção fixa. O botão de comparação no acesso aprovado atingiu contraste de 10,19 para 1 na confirmação final.
- **Validade.** O parecer considera leitura, estados e interação no Chromium, testes automatizados e revisão do código. O login e as respostas do servidor nas capturas foram simulados. A nota do erro geral foi atribuída pelo código e o estado foi depois reproduzido no navegador.
