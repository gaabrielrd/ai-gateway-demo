# Console desktop de benchmarks

A página inicial consulta a galeria e abre o benchmark da fatura quando publicado. Tabela e diagrama selecionam o mesmo modelo no inspetor. A aba Resposta apresenta a saída e as divergências de extração. Pareceres reúne notas e justificativas da versão selecionada. A navegação oferece Benchmarks, Comparar e as demos em Gateway.

A tipografia combina títulos em Georgia e dados em IBM Plex Mono, servida localmente sob licença OFL. A [direção visual](../../DESIGN.md) contém a prancha desktop.

## Verificação

O Chromium abriu o benchmark real por uma prévia local que encaminhou as leituras da galeria ao Hosting publicado. A geração do Scout apresentou cinco dos seis campos corretos. Usar este prompt abriu a tarefa Extração de campos com o conteúdo da fatura e três versões selecionadas.

O comando `npm run validate` passou com o Firestore Emulator. A suíte de navegador passou nos seis cenários, incluindo seleção por teclado e consulta de pareceres. O teste de componente conferiu o modelo selecionado e a distinção entre valores ausentes e custo zero.
