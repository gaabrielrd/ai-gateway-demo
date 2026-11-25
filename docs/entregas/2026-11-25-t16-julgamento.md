# T16 — Julgamento anônimo das gerações

Quando as tentativas de uma rodada terminam, os juízes recebem as saídas concluídas, identificadas por letras, e o pedido, a referência e os critérios registrados na execução. O servidor carrega os bytes das imagens privadas para os juízes visuais. Uma única resposta concluída também pode receber pareceres.

Cada juiz tem um registro e uma parcela própria da reserva. As notas aceitas são inteiros de zero a quatro ou valor nulo para “não verificável”. Cada marcação exige justificativa. O servidor rejeita pareceres que omitam candidatos ou critérios, preserva os pareceres válidos e contabiliza o uso conhecido. Para gabaritos de extração fornecidos como objeto JSON, confere os valores por campo independentemente das notas.

## Homologação

Uma execução de extração no Firestore Emulator recebeu uma resposta sintética para uma fatura de R$ 12. As outras duas gerações foram marcadas como falhas para testar o julgamento isolado. As chamadas aos três juízes usaram o gateway real. O servidor confirmou o campo total. Em uma rodada, Llama 3.3 e Mistral Small 3.1 devolveram três notas 4 com justificativas, em 2.557 e 3.033 ms, respectivamente. Qwen2.5 Coder não devolveu um parecer válido. Em diagnóstico separado, o endpoint retornou HTTP 200, 68 tokens de entrada e 40 de saída, sem texto aproveitável. O adaptador passou a conservar o uso retornado também nesse caso.

## Validação

Os testes verificaram a validação das notas e justificativas, campos ausentes em JSON, envio de bytes ao juiz visual, identificação anônima, preservação de dois pareceres quando o terceiro é inválido e ausência de novo despacho ao repetir o evento. O teste visual desta entrega usou Storage e gateway controlados. A capacidade de inspeção dos modelos foi verificada com imagens reais na [T15](2026-11-25-t15-paineis.md).

A validação completa passou com o Firestore Emulator:

```text
✔ juiz com resposta vazia preserva o uso para liquidação antes da validação do parecer
✔ rodada visual independente preserva pareceres válidos e contabiliza a resposta inválida
Smoke test do bundle OK.
Validação concluída.
```
