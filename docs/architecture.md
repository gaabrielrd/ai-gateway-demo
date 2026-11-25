# Arquitetura

Este documento descreve como o código do `AI Gateway Demo` é organizado e as regras que mantêm o projeto simples e sustentável.

## Princípios

- Organização por funcionalidades (features), não por camadas técnicas.
- Cada parte tem uma responsabilidade clara.
- Simplicidade primeiro: só adicione abstração quando houver necessidade real.
- Regra de negócio fica nas features; a base (`app` e `shared`) permanece neutra.

## Documentos de produto e arquitetura

O [PRD da primeira versão](prd.md) registra o escopo aprovado e seus critérios de aceite. As decisões abaixo orientam a implementação. As seções sobre a estrutura atual descrevem a base existente do repositório.

## Decisões do produto

### Fronteiras e distribuição

O Firebase Hosting servirá o bundle estático produzido pelo Vite. O navegador apresentará o comparador em português do Brasil, com resultados lado a lado no desktop e empilhados no celular. A navegação, a seleção dos modelos e a leitura dos pareceres devem funcionar por teclado. A publicação por GitHub Pages descrita no fim deste documento pertence à base do template. O destino do produto é o Firebase Hosting.

As Cloud Functions formarão a fronteira de servidor aprovada para o produto. Receberão o ID token do Firebase Authentication obtido pelo popup Google, verificarão a assinatura, a audiência e o provedor de login com o Firebase Admin SDK e consultarão a autorização do usuário antes de aceitar uma execução. A decisão de acesso, as reservas, o histórico e as publicações terão persistência controlada pelo servidor. As credenciais do gateway e dos provedores permanecem fora do bundle. O navegador consultará os serviços da aplicação. As funções encaminharão gerações e julgamentos pelo Cloudflare AI Gateway.

### Mapa de capacidades

| Capacidade             | Responsabilidade                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Acesso e administração | Integrar o login Google à feature de autenticação, acompanhar solicitações, decidir pedidos e configurar juízes por tarefa. Verificar no servidor o papel exigido por cada operação. |
| Catálogo e comparação  | Expor modelos e versões habilitados, modalidades e unidades de cobrança. Filtrar destinos pela tarefa e compor os resultados por tentativa.                                          |
| Avaliação              | Registrar o painel e os critérios usados na execução, preparar entradas sem identificação dos candidatos, validar os pareceres e calcular medianas, média e empates.                 |
| Orçamento              | Controlar no servidor o saldo mensal, a reserva e a contabilização de chamadas de geração e julgamento.                                                                              |
| Histórico e galeria    | Restringir o histórico ao autor, aplicar a retenção e manter uma cópia pública independente para cada benchmark publicado.                                                           |
| Demos do gateway       | Executar os exemplos aprovados e expor a origem informada pelo gateway, os tempos e a sequência efetiva de destinos.                                                                 |

Em `src/features`, o `model/` de cada capacidade concentra regras puras, os `services/` encapsulam chamadas às funções e os `components/` apresentam formulários, estados e resultados. As rotas em `app/routes/` compõem as interfaces públicas das features. Formulários e seleção ficam no estado local da tela. Permissões, consumo, publicação e resultados confirmados têm o servidor como fonte de verdade.

### Persistência e contratos de servidor

As Functions usarão Cloud Firestore para registros consultáveis e transações que atualizam juntos o orçamento mensal e a reserva da execução. Realtime Database também oferece transações, mas sua árvore JSON exigiria organizar os dados em torno de um ancestral comum para essas atualizações. Os documentos independentes do Firestore atendem também às consultas por autor, situação do pedido e publicação. Cloud Storage guardará imagens e saídas grandes como objetos, preservando tipo de conteúdo e tamanho. Cada documento aponta para um objeto sob controle do servidor. [Comparação das bases Firebase](https://firebase.google.com/docs/database/rtdb-vs-firestore) e [Cloud Storage](https://firebase.google.com/docs/storage).

| Registro                 | Chave e campos essenciais                                                                                                                                                | Acesso e consistência                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade e autorização | Identificador estável derivado da identidade Google verificada, papel, estado do pedido, justificativa opcional, datas e responsável pela decisão                        | O servidor obtém a identidade da sessão. O solicitante lê o próprio estado. Uma decisão administrativa atualiza o pedido e a autorização de forma atômica.            |
| Execução                 | ID, autor, chave de idempotência, tarefa, prompt, referência, critérios, versões solicitadas, composição do painel, estado, criação e expiração                          | O autor lê seu resultado. O mesmo pedido técnico recupera a execução existente. A expiração é calculada a partir da criação.                                          |
| Tentativa                | ID ligado à execução, candidato ou juiz, versão solicitada e efetiva, estado, início e fim, origem, resultado ou erro, uso e custo                                       | Escrita pelo servidor. Uso desconhecido é registrado como ausente. Uma repetição solicitada ganha ID próprio e mantém o vínculo à tentativa anterior.                 |
| Parecer                  | Execução, juiz, versão, candidato anônimo, nota e justificativa por critério, estado de verificabilidade                                                                 | Integrante do histórico da execução. O julgamento recebe as saídas anônimas. A aplicação conserva a associação para exibir o resultado final.                         |
| Orçamento e reserva      | Usuário e mês de Brasília, consumo e reservas em unidades inteiras de USD com precisão subcentavo. Cada operação registra ID, mês original, teto, valor apurado e estado | A transação confere o disponível e grava a reserva antes de despachar. A liquidação usa o mesmo mês e a mesma chave. Uma cobrança incerta permanece em reconciliação. |
| Publicação               | ID próprio, autor administrativo, origem, instantâneo de entradas, configurações, resultados e pareceres, referências de mídia pública e estado                          | Publicar somente após copiar todas as mídias para objetos independentes. A retirada interrompe o acesso público à cópia.                                              |

Os contratos HTTP distinguem consultas sem custo de comandos com efeito. A criação recebe intenção, versões, entrada e chave da operação. A resposta identifica a execução. A consulta devolve o estado por tentativa, os indicadores disponíveis e o andamento do painel. Identidade, papel, preço e saldo usados para decidir a operação vêm do servidor.

As leituras privadas conferem autoria e expiração, inclusive para mídia. Exclusão manual ou expiração aos 30 dias remove documentos filhos e objetos correspondentes. O orçamento retém somente os registros necessários à contabilização, sem conteúdo do teste. A cópia pública tem ciclo próprio. Operações interrompidas de limpeza e publicação podem ser retomadas pela mesma chave.

### Fluxo de uma comparação

1. O cliente envia tarefa, versões escolhidas, prompt textual e os campos opcionais de referência e critério. O servidor valida acesso, compatibilidade, preços e limites de geração suficientes para calcular um teto, incluindo a avaliação.
2. As funções reservam o teto de forma atômica no orçamento do usuário para o mês-calendário de Brasília. O saldo disponível considera gasto e reservas em aberto. Uma repetição técnica da mesma solicitação precisa recuperar a operação existente para evitar chamadas ou débitos duplicados.
3. A execução acompanha cada tentativa de forma independente. Registra provedor e versão efetivos, saída textual ou mídia gerada, estado, duração até a resposta completa, uso reportado e custo estimado com sua unidade. O cliente pode exibir cada resultado concluído enquanto os demais estão em andamento.
4. Três juízes configurados para a modalidade recebem o prompt, referências, critérios e saídas identificadas de forma anônima. A aplicação guarda notas e justificativas, resultados verificáveis contra o gabarito e o estado de cada parecer. A classificação segue RN-03 a RN-05 do PRD. O tempo e o custo da avaliação são registrados separadamente dos de geração.
5. O servidor contabiliza o uso e libera a parcela não utilizada da reserva. Falhas parciais preservam tentativas concluídas. Uma nova execução pedida pelo usuário para repetir uma tentativa falha exige sua própria previsão e reserva, considerando eventual reavaliação.

### Privacidade, retenção e operação

A leitura pública do catálogo e de publicações recupera dados já registrados. A consulta ao histórico exige verificar a autoria. Os conteúdos privados, inclusive mídias e pareceres, expiram em 30 dias ou são excluídos antes pelo autor. O registro de consumo é independente para preservar o saldo mensal. A publicação administrativa copia dados e mídias de uma execução própria revisada, com seus indicadores e configurações. A cópia continua disponível após a exclusão ou expiração da origem e pode ser retirada por um administrador.

Os exemplos de cache repetem a mesma entrada e exibem a origem observada em cada tentativa. O cenário de fallback provoca uma falha controlada no primeiro destino e registra as tentativas seguintes. Ambas as demos usam a mesma verificação de acesso e reserva de orçamento do comparador.

## Árvore de pastas

```
src/
├── app/          # composição geral: providers, rotas, layout — sem regra de negócio
│   ├── components/  # telas de erro e não encontrado usadas pelas rotas
│   ├── routes/      # definição das rotas e o router
│   └── tests/       # smoke test da composição
├── features/     # cada capacidade do produto em sua própria pasta
│   └── notes/    # demonstração canônica; removida por --remove-example
├── shared/       # reutilizável e neutro: config, hooks, lib, types
├── test/         # setup.ts e render.tsx (utilidades de teste)
└── main.tsx      # ponto de entrada da aplicação
```

Uma feature típica:

```
features/minha-feature/
├── components/   # componentes de tela desta feature
├── model/        # tipos e lógica de negócio
├── services/     # acesso a APIs e persistência
├── tests/        # testes desta feature
└── index.ts      # interface pública da feature
```

## Responsabilidades

- **app/**: monta a aplicação. Providers, rotas e layout. Não contém regra de negócio.
- **features/**: cada capacidade do produto (ex.: "cadastro de clientes"). Reúne tudo que aquela funcionalidade precisa.
- **shared/**: peças reutilizáveis e neutras (botões, hooks genéricos, utilitários, estilos, tipos). Não conhece nenhuma feature específica.
- **test/**: configuração e utilitários compartilhados de teste.

## Regras de dependência

1. Cada funcionalidade tem sua própria pasta em `features/`.
2. Uma feature não importa arquivos internos de outra feature.
3. Uma feature expõe sua interface pública pelo `index.ts`.
4. Chamadas HTTP ficam em serviços/clientes, não nos componentes.
5. Acesso a `localStorage` fica em adaptadores/repositórios.
6. Componentes de apresentação não conhecem detalhes de persistência.
7. `shared` é neutro: não depende de nenhuma feature.
8. Não crie abstrações sem necessidade concreta.
9. Sem gerenciador global de estado por padrão.
10. Sem biblioteca de requisições se `fetch` já resolve.
11. Nenhuma credencial no código.
12. Estados de tela explícitos: carregando, vazio, sucesso e erro.
13. Toda mudança de comportamento considera os testes.
14. Toda decisão relevante atualiza a documentação ou gera um ADR.
15. Imports externos usam apenas o `index.ts` da feature; `npm run check:architecture` verifica essa fronteira.
16. `fetch` e armazenamento do navegador só aparecem em `services/`,
    `adapters/` ou `repositories/`, dentro de uma feature ou de `shared`.
17. `import.meta.env` só aparece em `shared/config/env.ts`.

## Acesso a APIs

Todo acesso a APIs passa por `services/`, `adapters/` ou `repositories/` dentro
da feature. Uma infraestrutura neutra e realmente compartilhada pode usar as
mesmas pastas dentro de `shared`. Os componentes chamam essa fronteira; nunca
fazem `fetch` diretamente. Isso concentra o tratamento de erros e facilita
substituir a fonte por dados fake nos testes. Veja [integrations.md](integrations.md).

## Armazenamento

Persistência local (ex.: `localStorage`) fica isolada em `services/`,
`adapters/` ou `repositories/`. Dados lidos na fronteira são validados antes de
entrar no modelo. O exemplo de notas grava um envelope versionado com revisão
monotônica, migra automaticamente o array legado, preserva dados inválidos em
uma chave de backup e rejeita gravações feitas sobre uma revisão antiga. Eventos
de `storage` sincronizam abas abertas. Falhas de leitura, conflito e escrita têm
códigos estáveis e são apresentadas pela interface; uma operação nunca confirma
sucesso antes da persistência terminar.

A orquestração da lista demonstrativa fica em um hook interno da feature. O
componente `NoteList` cuida da composição visual e semântica, enquanto o hook
coordena validação, revisões e sincronização sem expor detalhes pela interface
pública da feature.

Novas versões do formato persistido devem ter migração explícita e teste do formato anterior. Nunca apague silenciosamente dados que não puderem ser interpretados.

## Rotas e falhas

As rotas ficam em `app/routes`, que exporta `routes` (a árvore, montável com `createMemoryRouter` nos testes) e `router` (o router de produção). Importe sempre de `react-router`.

A rota raiz registra um `errorElement`, então um erro de renderização no layout ou em qualquer rota filha vira uma tela de falha, nunca tela branca. Uma rota curinga (`path: '*'`) atende endereços desconhecidos dentro do layout — mantenha-a como último filho ao acrescentar rotas.

O `ErrorBoundary` de `@vitru/styleguide` não envolve o `<Outlet />`, para não sombrear o `errorElement`. Use-o para isolar um widget arriscado dentro de uma página.

## Configuração de ambiente

Toda leitura de `import.meta.env` passa por `shared/config/env.ts`. As variáveis são declaradas em `ImportMetaEnv` (`src/vite-env.d.ts`) e validadas no boot: ausência ou formato inválido falha imediatamente, nomeando a variável. Nada que chegue ao browser é secreto.

## Estilo e identidade visual

Estilização por CSS Modules ([ADR 0005](decisions/0005-css-modules.md)), com os
valores vindos de `src/styles/tokens.css`. Cor, tipografia, espaçamento,
raio, sombra e movimento vêm de tokens; nenhum CSS de componente declara cor
literal.

Os primitivos reutilizáveis ficam em `src/shared/ui` e são a base das telas.
`shared/ui` é neutro em relação ao domínio, como o resto de `shared`: ele
não conhece nenhuma feature. As regras completas estão em
[styleguide.md](styleguide.md).

## Estado

O estado é local aos componentes ou às features. Não usamos gerenciador global de estado por padrão. Se, no futuro, a complexidade justificar, a decisão deve ser registrada em um ADR.

## Testes

Os testes ficam colocalizados dentro da feature, na pasta `tests/`. Testam o
comportamento observável da funcionalidade. Os scripts de arquitetura usam a AST
do TypeScript para cobrir imports estáticos, reexports, imports dinâmicos e o uso
de `fetch`, `localStorage` e `import.meta.env` fora das fronteiras permitidas.
Detalhes em [testing.md](testing.md).

## Evolução incremental

O template começa simples de propósito. Adicione estrutura, bibliotecas ou camadas apenas quando um problema real aparecer, e registre a mudança em um ADR (`docs/decisions/`).

## Página inicial e resultados

As rotas `/` e `/comparar` abrem o catálogo e o formulário de comparação. A seleção completa permite consultar o saldo e o teto. Após a confirmação, a página `/execucoes/:id` consulta a API autenticada enquanto houver gerações em andamento. Cada resposta concluída é exibida imediatamente. A consulta é cancelada ao sair da página ou trocar de conta. As imagens são buscadas com o token de sessão e suas URLs locais são liberadas ao desmontar a tela.

O header compartilhado ocupa a largura disponível. O limite `--layout-max`
fica no conteúdo das páginas comuns, preservando a largura da página inicial.
Na rota `/styleguide`, o conteúdo usa toda a largura disponível e o limite
interno do showcase é removido por um estilo restrito a essa rota.

## Base de publicação

A configuração de ambiente expõe `baseUrl` a partir de `BASE_URL` do Vite.
O router usa essa base como `basename` e a marca do layout usa a mesma base
para o favicon. `build:pages` fornece a base ao Vite e gera entradas estáticas
para as rotas públicas; o build local padrão continua na raiz. O contrato e o
workflow estão descritos em [deployment.md](deployment.md).

### Previsão de custo

`POST /api/budget/quote` consulta o painel em `judgePanels/{task}` e o orçamento em `users/{uid}/budgets/{AAAA-MM}` no banco dedicado. O documento mensal mantém `spentMicroUsd` e `reservedMicroUsd`. Cada unidade equivale a um milionésimo de USD. O servidor escolhe as tarifas e os limites de cada tentativa. A consulta informa saldo, teto e eventual bloqueio. Os critérios e as fontes dos limites usados na homologação estão na [entrega T09](entregas/2026-11-25-t09-orcamento.md).

As reservas ficam em `users/{uid}/reservations/{executionId}`. Uma transação cria a reserva e atualiza o total retido do mês. Cada tentativa guarda seu teto e passa de reservada a despachada antes da chamada externa. O reenvio com o mesmo ID e hash recupera a operação. A liquidação registra o gasto apurado e libera o teto daquela tentativa no mês original. Tentativas sem confirmação de cobrança continuam retidas para reconciliação.

O cliente de geração em `functions/gateway.mjs` usa `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_GATEWAY_ID` e o segredo `CLOUDFLARE_API_TOKEN`. Envia texto ao endpoint de chat e imagens ao endpoint do modelo no Workers AI. O retorno de imagem contém bytes e tipo de mídia para armazenamento privado. A interface usa o componente `GenerationOutput` para exibir texto literal ou a URL privada da imagem. O conector mede a duração até a leitura do corpo completo. Somente os metadados efetivamente recebidos identificam o modelo que respondeu e o uso.

### Execução do comparador

`POST /api/executions` aceita uma chave de execução, tarefa, modelos, prompt, referência, critério e teto confirmado em milionésimos de USD. A Function verifica o acesso, recalcula o plano e grava a reserva, o documento de execução e os documentos de geração juntos. O gatilho de criação de cada tentativa obtém o direito de despacho em uma transação, atualiza o resultado e liquida o custo conhecido. A ausência de informação suficiente para contabilizar mantém a reserva daquela tentativa.

`GET /api/executions/{id}` devolve o estado de cada tentativa da conta autenticada. A imagem fica no Storage e é servida por `GET /api/executions/{id}/media/{index}` após verificar autor e expiração. A referência e o critério ficam disponíveis ao julgamento. Os três modelos candidatos recebem o mesmo prompt.

### Repetição individual

Na execução privada, cada tentativa com falha oferece uma nova previsão. `POST /api/executions/{id}/attempts/{index}/quote` consulta o saldo atual e calcula o teto de uma geração com o painel da execução. A confirmação em `/retry` grava a nova reserva, a ligação entre as tentativas e o próximo índice em uma transação. Reenviar a confirmação para a mesma tentativa devolve o índice já criado. A URL da comparação e os resultados dos demais modelos são preservados.

O trabalhador tem limite de 180 segundos. Se uma tentativa despachada continuar em andamento após cinco minutos, a consulta a apresenta como interrompida. A cobrança anterior permanece em reconciliação. O usuário pode confirmar uma nova tentativa com orçamento próprio.

### Configuração dos juízes

A administração em `/admin/juizes` usa `GET` e `POST /api/admin/panels`. A Function verifica o papel administrativo e aceita três IDs distintos e compatíveis por tarefa. O catálogo registra janela de contexto e capacidade de inspecionar imagens verificada no gateway. A previsão identifica os juízes e os critérios. O comparador envia os IDs confirmados e, se eles mudarem, o servidor pede uma nova previsão. Cada execução preserva as versões dos juízes e a lista de critérios, inclusive o critério próprio informado pelo autor.

### Rodadas de julgamento

Cada reserva cria uma rodada com os índices das gerações incluídas. Uma repetição substitui somente o índice do modelo repetido na composição da nova rodada. O gatilho de atualização de tentativas espera todas as gerações da rodada terminarem e distribui as concluídas aos três juízes. O payload contém identificadores anônimos, prompt, referência, critérios e o conteúdo das respostas. Imagens privadas seguem diretamente do Storage para o juiz visual.

Os pareceres são persistidos separadamente em `rounds/{reserva}/reviews/{slot}`. A tomada de cada slot usa a reserva antes do despacho. Um erro de formato preserva os outros pareceres e contabiliza o uso informado. Uma falha de leitura anterior ao despacho libera a parcela. A consulta privada retorna a rodada mais recente com pareceres e a conferência campo a campo quando o gabarito de extração é um objeto JSON.

### Classificação de qualidade

A leitura privada calcula a classificação para os índices da rodada mais recente. Cada critério precisa das três notas do painel para formar uma mediana. A média das medianas considera também o critério próprio e determina as posições. Empates compartilham posição. A classificação parcial preserva as notas existentes, explica as lacunas e apresenta cada justificativa. O tempo do painel mede o intervalo entre o primeiro início e o último término. O custo reúne as três chamadas da rodada quando os valores estão disponíveis.

### Histórico privado

Em `/historico`, a conta autenticada lista e exclui execuções pelo próprio UID. O servidor aplica o prazo de 30 dias na listagem, no detalhe e na leitura de mídia. Excluir antecipa a expiração imediatamente. A função agendada `purgePrivateHistory` consulta o índice de grupo de coleções a cada cinco minutos e aguarda cinco minutos desde a expiração para que trabalhadores em andamento possam liquidar seus custos. Ela remove o prefixo privado no Storage e as subcoleções antes do documento principal. Uma falha deixa o documento elegível para nova tentativa. O gasto e as reservas financeiras ficam em coleções independentes. A limpeza libera apenas a parte reservada para chamadas que nunca foram despachadas.

### Publicação e retirada de benchmarks

O administrador revisa a rodada finalizada em sua execução e confirma a autoria do material. A Function verifica o UID, a validade da origem e a revisão. Ela copia as imagens e grava um instantâneo JSON em um prefixo independente do Storage. Uma transação no Firestore torna a cópia visível depois de conferir a origem novamente. Cada tentativa usa um prefixo próprio e descarta a cópia incompleta se houver falha. O identificador da publicação deriva do autor, da execução e da revisão.

A galeria lê o catálogo de publicações e serve o instantâneo e as imagens por rotas públicas com verificação de visibilidade. A retirada desativa a publicação antes de limpar seu prefixo. A limpeza do histórico privado atua somente nos caminhos do autor.

### Demonstração de cache

A página `/demos/cache` consulta a previsão e pede confirmação para duas chamadas pelo mesmo destino. A Function confere aprovação e reserva o teto mensal. Um evento do Firestore dispara as chamadas em sequência com o mesmo corpo e TTL de 300 segundos. A chave da reserva e o registro de despacho evitam repetir uma chamada após um reenvio. Cada resultado registra o indicador de cache, o tempo, os tokens e o identificador do log retornados pelo gateway. Um HIT liquida a parcela por zero. Um MISS com uso conhecido liquida o custo estimado. Uma origem ausente deixa o custo em reconciliação.

### Rota isolada de fallback

A demo usa a rota dinâmica `dynamic/demo_fallback` do gateway. Na versão `8b652044e3ec`, o nó primário lê `metadata.demoPrimary` e sua saída de fallback leva ao Llama 3.3 70B FP8 Fast. As Functions fixam esse metadado em um identificador fictício de Workers AI e limitam a saída a 64 tokens. Somente o destino de recuperação tem capacidade de gerar e entra na reserva. A tela registra a duração total e reconhece a recuperação quando a resposta identifica o modelo desse segundo nó. Em caso de falha da rota, mostra o status HTTP disponível e mantém o uso desconhecido em reconciliação. [Rotas dinâmicas da Cloudflare](https://developers.cloudflare.com/ai-gateway/features/routing/dynamic-routing/).
