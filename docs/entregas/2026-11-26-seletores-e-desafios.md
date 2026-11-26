# Seleção de modelos e desafios de benchmark

O comparador tem seletores pesquisáveis de provedor e de modelos. O primeiro informa a quantidade de versões elegíveis para a tarefa; o segundo mostra ícone de modalidade, tarifa e restrições. É possível selecionar candidatos de provedores diferentes e removê-los pelo diagrama de comparação. A abertura dos seletores e o destaque dos caminhos usam movimento curto, com indicação estática quando o navegador solicita movimento reduzido.

Na página de um benchmark publicado, **Usar este prompt** recupera a entrada original. **Experimentar desafio** abre um rascunho com as versões compatíveis e uma tarefa mais difícil. Os mesmos desafios e referências estão disponíveis em **Usar exemplo** no formulário de execução.

| Tarefa   | O que o desafio verifica                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extração | Distinguir pedido, rascunho e fatura final, descontar uma devolução e reconciliar frete e desconto. O total correto é R$ 325,10.                         |
| Resumo   | Distinguir médias simples e ponderadas, interpretar latências de cauda e qualificar uma conclusão com evidência limitada. A taxa conjunta correta é 45%. |
| Imagem   | Compor três sólidos em ordem, com refração localizada, oclusão parcial, luz e sombras coerentes.                                                         |

## Verificação

- A validação completa passou com 116 testes Vitest. Os seis testes Chromium passaram, incluindo seleção por teclado, seleção de imagens, orçamento e acesso ao novo desafio a partir da galeria.
- A inspeção em Chromium confirmou a seleção em janelas de 1440 e 390 px, com movimento reduzido na segunda. Os menus mediram 512 e 358 px, respectivamente, dentro da área visível.
- O detector de código do Impeccable retornou zero ocorrências nas áreas examinadas. Os testes usam respostas simuladas; gerar novas respostas avaliadas precisa de uma execução confirmada com orçamento.
