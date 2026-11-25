# Revisão das telas do AI Gateway Demo

As 13 rotas e o erro geral foram avaliados por dois revisores. A referência grafite e âmbar do benchmark orientou os fluxos de consulta, seleção de modelos e administração. As notas por tela e os critérios de atribuição estão na [matriz do Impeccable](../../.impeccable/critique/2026-11-25T22-22-48Z__src-app-routes-index-tsx.md).

## Entrega

- O catálogo exibe filtros e versões ao lado da seleção. O resumo acompanha a rolagem no desktop e permite remover modelos escolhidos em outro provedor.
- O benchmark apresenta os campos quando há conferência e identifica empate, liderança ou classificação parcial a partir do resultado. O inspetor e o diagrama compartilham a seleção.
- Galeria e histórico separam os registros em linhas. A galeria administrativa solicita login antes de buscar publicações privadas. Após aprovação, “Meu acesso” oferece entrada direta no comparador.
- Cache e fallback mostram a sequência da demonstração e o teto antes da confirmação. Os juízes são agrupados por tarefa, com critérios e contagem de versões.
- A página inexistente oferece retorno à inicial. No erro geral, o visitante pode tentar carregar a rota novamente ou consultar os detalhes técnicos.

Os componentes estão em `src/features`. O cabeçalho comum fica em `src/shared/ui` e as páginas de erro em `src/app/components`. O [guia visual](../styleguide.md) descreve o comportamento.

## Verificação

| Evidência             | Resultado                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run validate`    | Validação concluída nas nove suítes do perfil padrão. Smoke test do bundle OK.                                                                               |
| Vitest                | 116 testes passaram. Cobertura de 86,58% das instruções, 74,95% dos ramos, 87,60% das funções e 90,42% das linhas.                                           |
| Testes Node           | 93 testes listados, 81 passaram e 12 foram pulados.                                                                                                          |
| `npm run test:e2e`    | Seis fluxos passaram no Chromium, incluindo teclado, login simulado, aprovação e execução com orçamento.                                                     |
| Inspeção de navegador | 23 estados a 1440 × 900 e seis estados em cada largura de 1280 e 390 px. Zero ocorrências de rolagem horizontal da página ou exceção JavaScript não tratada. |
| Contraste             | A ação “Comparar modelos” no acesso aprovado atingiu 10,19 para 1.                                                                                           |

Os testes de regressão verificam a ausência de uma coluna de campos em resumos, o anúncio do empate e o destino oferecido à conta aprovada. As capturas usam sessões e dados simulados. A pontuação expressa a avaliação dos revisores.

Para conferir a seleção, abra `/comparar`, escolha um modelo e troque de provedor. Para verificar a ligação entre a tabela e o inspetor, abra um benchmark da galeria, selecione outro modelo pelo teclado e consulte “Pareceres”.
