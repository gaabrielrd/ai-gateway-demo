# T25 — Homologação das integrações

As Functions no projeto de emuladores `demo-ai-gateway` chamaram o Workers AI pelo gateway real. A repetição usou os exemplos da galeria e a conta administrativa do emulador. A exportação anterior restaurou contas e objetos, mas o banco nomeado voltou vazio. As medições abaixo vêm das novas execuções.

| Execução | Gerações (µUSD) | Juízes (µUSD) | Débito (µUSD) |
| -------- | --------------: | ------------: | ------------: |
| Extração |             401 |         1.961 |         2.362 |
| Resumo   |             478 |         2.777 |         3.255 |
| Imagem   |           7.524 |         1.128 |         8.652 |

Os 16 valores registrados nos resultados corresponderam aos lançamentos das reservas. O saldo mensal terminou com US$ 0,014269 consumidos e reserva zero. Dois juízes avaliaram a imagem e um falhou. A conta privada recebeu o resultado parcial. A homologação real de cache e fallback com cinco eventos no painel está na [entrega da T23](2026-11-25-t23-cota-demos.md).

A conta autora consultou as três execuções e recuperou a imagem. Uma segunda conta aprovada viu seu histórico vazio e recebeu HTTP 404 ao usar os identificadores privados da autora, inclusive para a mídia. A consulta anônima ao histórico, aos detalhes e à imagem privada recebeu HTTP 401. As três publicações responderam anonimamente, a imagem pública coincidiu com a revisada e o consumo mensal permaneceu idêntico após as leituras.

A validação completa passou com um segundo Firestore Emulator isolado. Os testes automatizados usaram respostas controladas.
