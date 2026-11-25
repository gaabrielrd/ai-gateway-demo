# T26 — Publicação no Firebase

O Hosting publicou a versão `a0162484ed620714` em 25/11/2026 às 18h27 de Brasília. O deploy criou seis Functions de segunda geração em Node.js 24. Os quatro trabalhadores de eventos executam em São Paulo junto ao Firestore dedicado. A API HTTP e o agendamento de expiração executam em `us-central1`. Os dois domínios do site foram autorizados no Firebase Authentication. O token do Workers AI está no Secret Manager. [Aplicativo publicado](https://cf-ai-gateway.web.app)

## Verificações no ambiente publicado

- No Chromium, as três URLs de detalhe abriram diretamente e mostraram seus respectivos títulos. As respostas públicas coincidiram integralmente com os exemplares autorizados da T25. O SHA-256 da imagem pública coincidiu com o da imagem de homologação. A galeria inclui a avaliação parcial do benchmark de imagem.
- A página inicial, o comparador, a galeria, as duas demos e a página de acesso abriram por URL direta. A API de saúde retornou HTTP 200. Os endpoints de sessão, histórico, administração e orçamento recusaram acesso anônimo com HTTP 401.
- No Safari, o primeiro clique apresentou a mensagem de popup bloqueado. Ao repetir a entrada, o Google retornou ao aplicativo e a área de administração exibiu a fila de solicitações. A previsão de cache exibiu saldo de US$ 5,00 e teto de US$ 0,016372. O ensaio terminou na previsão, antes de confirmar a execução.
- A carga inicial promoveu somente as três publicações autorizadas e configurou três juízes por tarefa. A API pública lê os resultados armazenados. As sete gerações e nove chamadas de julgamento que lhes deram origem estão documentadas na [T25](2026-11-25-t25-homologacao.md).

## Aceite

O comando `npm run validate` passou com o Firestore Emulator, incluindo 113 testes do Vitest, testes das Functions, build e smoke. Os seis cenários de `npm run test:e2e` passaram no Chromium.

| Critérios do PRD | Evidência                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------- |
| CA-01 e CA-02    | Galeria e acesso no site publicado, jornadas por papel na T24, autorização nas T06 e T19     |
| CA-03 e CA-04    | Compatibilidade na T08, previsão e reserva nas T09 e T10, conciliação por execução na T25    |
| CA-05 e CA-06    | Pareceres e ranking nas T15–T17, repetição de tentativa na T14 e resultado parcial publicado |
| CA-07            | Cinco eventos reais de cache e fallback conferidos na T23                                    |
| CA-08            | Expiração e remoção na T18, cópia pública independente na T19 e isolamento de autores na T25 |
| CA-09            | Teclado, foco, comparação lado a lado e empilhamento na T24                                  |
