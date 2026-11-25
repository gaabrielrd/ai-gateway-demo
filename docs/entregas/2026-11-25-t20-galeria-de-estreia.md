# T20 — Galeria de estreia em homologação

A conta administrativa do Auth Emulator executou e publicou três benchmarks pelo fluxo das Cloud Functions. Os sete resultados e as nove chamadas a juízes vieram do Workers AI pelo gateway configurado. O formulário oferece as mesmas entradas em **Usar exemplo**, incluindo o gabarito ou a referência para o julgamento.

| Benchmark                                    | Gerações | Custo das gerações (USD) | Custo dos juízes (USD) | Duração do painel |
| -------------------------------------------- | -------: | -----------------------: | ---------------------: | ----------------: |
| Fatura fictícia com desconto                 |        3 |                 0,000401 |               0,001903 |          17,537 s |
| Resumo de um ensaio de cache                 |        3 |                 0,000498 |               0,002318 |          18,326 s |
| Bicicleta vermelha diante de uma parede azul |        1 |                 0,007524 |               0,001139 |          25,449 s |

Os custos são estimativas da execução, calculadas a partir das tarifas registradas no catálogo. A parcela do parecer inválido da imagem também foi contabilizada.

## Revisão

- **Fatura.** Llama 3.3 e Mistral Small acertaram os seis campos e empataram com 4/4. Llama 4 Scout incluiu horário na emissão. O verificador encontrou cinco correspondências exatas e o painel atribuiu 3,67/4.
- **Resumo.** As três respostas preservaram as medidas de 860 ms e 94 ms e mencionaram o limite regional. Scout obteve 4/4. Llama 3.3 e Mistral empataram com 3,67/4.
- **Imagem.** A imagem JPEG de 512 × 512 do Lucid Origin mostra uma bicicleta vermelha, a parede azul e o vaso amarelo com planta verde à direita. O vaso encobre parte da roda dianteira. Mistral e Scout entregaram pareceres válidos. Gemma retornou um parecer em formato inválido, e a galeria apresenta a avaliação parcial.

## Consulta pública

A consulta sem credenciais listou os três títulos. Para cada publicação, o detalhe público preservou o prompt, a referência, as tentativas e a avaliação revisada. A imagem pública coincidiu byte a byte com a imagem privada. O contador de invocações dos trabalhadores de geração e julgamento permaneceu em 21 durante a publicação e a leitura anônima.

A exportação local em `.firebase/t20/export` preservou os dados de Auth, Firestore e Storage fora do Git. A conta e a galeria pertencem ao projeto fictício `demo-ai-gateway` dos emuladores. A verificação da URL hospedada e a disponibilização no projeto Firebase de destino fazem parte da T26.

A validação completa passou com o Firestore Emulator, incluindo 111 testes do Vitest, build e smoke test. O teste de interface conferiu o preenchimento do prompt e da referência e a edição dos dois campos antes do envio.
