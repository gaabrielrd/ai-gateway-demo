# AI Gateway Demo — requisitos do produto

**Primeira versão · Escopo aprovado em 25/11/2026**

## 1. Visão do produto

Quem escolhe um modelo de IA precisa saber se o ganho de qualidade em uma tarefa concreta compensa o custo e o tempo de espera. O AI Gateway Demo permite enviar o mesmo prompt a versões de modelos de diferentes provedores pelo Cloudflare AI Gateway e examinar as respostas com a mesma régua de avaliação. Duas demonstrações mostram como o gateway atende uma chamada pelo cache e como se recupera quando um destino falha.

## 2. Usuários

- **Desenvolvedor.** Consulta exemplos públicos para conhecer o gateway. Com acesso aprovado, compara modelos em uma tarefa própria e consulta seu histórico.
- **Visitante ou solicitante.** Explora resultados publicados. Após entrar com Google, pode pedir acesso e acompanhar a decisão.
- **Administrador.** Decide solicitações, escolhe o painel de juízes por tipo de tarefa e publica ou retira benchmarks feitos com seu próprio material.

## 3. Jornada principal

1. O desenvolvedor abre o comparador. Pode examinar um benchmark da galeria ou escrever um prompt.
2. Para executar, entra com Google e, se necessário, solicita acesso. Após a aprovação, escolhe a tarefa e os modelos compatíveis.
3. Confere o prompt, os critérios, o saldo do mês e o custo máximo previsto para gerar e avaliar as respostas. Ao iniciar, o sistema reserva o valor.
4. Acompanha as respostas à medida que ficam prontas. Compara a produção de cada modelo, os indicadores e os pareceres dos juízes. Pode repetir uma tentativa que falhou.
5. Reabre a comparação no histórico sem uma nova chamada ou cobrança.

## 4. Escopo da primeira versão

O produto inclui catálogo público, comparador, galeria, demos de cache e fallback, login com Google, solicitações de acesso, painel administrativo, orçamento individual e histórico privado. A cobertura de modelos acompanha os destinos habilitados no gateway e a compatibilidade com a tarefa.

## 5. Requisitos funcionais

| ID    | Capacidade         | Comportamento observável                                                                                                                                                                                                                                                                                           |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-01 | Catálogo e seleção | O catálogo lista os modelos habilitados. No comparador, a tarefa filtra as versões compatíveis. O usuário escolhe três ou prossegue com as disponíveis se houver menos de três. Sem modelo compatível, a tela explica o motivo e impede a execução.                                                                |
| RF-02 | Acesso             | Após login com Google, a pessoa envia uma solicitação com justificativa opcional e acompanha o estado pendente, aprovado ou rejeitado. O administrador aprova ou rejeita no painel. A consulta pública dispensa login.                                                                                             |
| RF-03 | Comparação         | O usuário aprovado fornece um prompt textual, inclusive texto colado para análise. Pode acrescentar gabarito e critério próprio. A mesma entrada segue para os modelos selecionados. Cada resultado aparece assim que termina, como texto ou na modalidade gerada.                                                 |
| RF-04 | Indicadores        | Cada resultado identifica provedor e versão que responderam, tempo total até a resposta completa, tokens de entrada e saída quando informados, unidade de cobrança aplicável e custo estimado em USD. A tela identifica dados ausentes como “não informado” e exibe o tempo e o custo do julgamento separadamente. |
| RF-05 | Julgamento         | O administrador escolhe três juízes por tipo de tarefa. Cada juiz recebe as gerações sem identificação dos modelos e justifica suas notas. Juízes de imagem precisam poder inspecionar a imagem. Com gabarito verificável, a tela também mostra os acertos verificáveis, como os campos corretos da fatura.        |
| RF-06 | Orçamento          | Antes da execução, a tela apresenta saldo e custo máximo previsto. A reserva cobre todas as chamadas previstas. Ao concluir, o sistema registra o gasto apurado e libera a diferença.                                                                                                                              |
| RF-07 | Falhas e repetição | Uma falha identifica a tentativa afetada e preserva as demais respostas. Duas gerações permitem comparação e uma permite avaliação individual. O usuário pode repetir apenas a tentativa que falhou, após ver o custo previsto da nova geração e da eventual reavaliação.                                          |
| RF-08 | Histórico          | O autor pode consultar e excluir seus testes privados. Uma consulta recupera o resultado registrado, inclusive as avaliações disponíveis.                                                                                                                                                                          |
| RF-09 | Galeria            | O administrador revisa e publica uma cópia de uma execução própria com material próprio. A estreia oferece extração de campos de uma fatura fictícia com gabarito, resumo de texto técnico com fatos a preservar e imagem gerada a partir de um briefing com elementos obrigatórios.                               |
| RF-10 | Cache              | O usuário aprovado executa um exemplo pronto e repete a chamada idêntica. Vê a origem indicada pelo gateway e a duração de cada tentativa, inclusive quando ambas chegam ao provedor.                                                                                                                              |
| RF-11 | Fallback           | Um cenário pronto provoca uma falha controlada no primeiro destino. A tela exibe a sequência efetiva de tentativas, seus estados e o modelo que entregou a resposta, se houver.                                                                                                                                    |

## 6. Regras de negócio

- **RN-01.** Toda execução que aciona o gateway exige login e aprovação, inclusive repetições, benchmarks e demos.
- **RN-02.** A cota é de US$ 5 por usuário a cada mês-calendário no fuso de Brasília. O saldo disponível desconta gastos e reservas em curso. Saldo insuficiente ou preço desconhecido impede iniciar a chamada. Apagar o teste mantém o consumo do mês.
- **RN-03.** Os juízes atribuem de 0 a 4 a cumprimento do pedido, completude, critério específico da tarefa e critério próprio quando fornecido. As justificativas se apoiam na geração e na referência disponível. Quando faltar evidência, o parecer marca o critério como “não verificável”.
- **RN-04.** A nota de cada critério é a mediana das três notas. A média das medianas, com pesos iguais, determina a classificação geral de qualidade. Médias iguais dividem a posição. Custo e tempo são indicadores independentes.
- **RN-05.** Parecer ausente ou critério sem verificação suficiente para comparar todos os participantes deixa o ranking parcial. A tela preserva os pareceres e indica o que falta. Falha de geração aparece como erro e fica fora da pontuação.
- **RN-06.** O histórico privado expira em 30 dias e admite exclusão antecipada pelo autor. A cópia publicada permanece disponível até um administrador retirá-la.

## 7. Dados e arquivos

| Registro            | Conteúdo e origem                                                                                            | Acesso e ciclo de vida                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Solicitação         | Identidade Google, justificativa textual opcional e decisão administrativa                                   | Solicitante acompanha a própria situação. Administradores decidem.                                        |
| Execução privada    | Prompt, tarefa, referências opcionais, versões, saídas geradas, indicadores, painel, critérios e pareceres   | Visível ao autor por até 30 dias, com exclusão antecipada. A regra abrange textos e imagens do histórico. |
| Orçamento           | Mês de referência, usuário, reservas e consumo das chamadas                                                  | Controle no servidor, independente do conteúdo do teste.                                                  |
| Benchmark publicado | Cópia da entrada, gabarito quando aplicável, configurações, versões, resultados, custos, tempos e avaliações | Leitura pública até retirada administrativa. Sobrevive à expiração do teste de origem.                    |

A entrada do usuário é textual. Imagens são saídas geradas e podem compor uma publicação.

## 8. Integrações e dependências

O Google identifica a pessoa. Se o login falhar, ela mantém acesso à parte pública e pode tentar entrar novamente. O Firebase Hosting entrega a aplicação. As Cloud Functions conferem permissão e orçamento antes de chamar o Cloudflare AI Gateway, que encaminha gerações e julgamentos aos provedores. Uma falha de serviço deve ser identificada na operação afetada, preservando os resultados já recebidos.

## 9. Interface e estados

| Área                   | Estados que a pessoa vê                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo e galeria     | Carregamento, lista disponível, ausência de itens e falha de consulta com opção de tentar novamente.                                                        |
| Acesso e administração | Entrar com Google, solicitar acesso, acompanhar pedido e consultar decisão. O painel mostra pedidos pendentes, lista vazia e resultado ou falha da decisão. |
| Comparador e demos     | Seleção inicial, ausência de modelos compatíveis, saldo e previsão, bloqueio explicado, execução em andamento, resultado completo, parcial ou falho.        |
| Histórico              | Carregamento, lista privada ou vazia, detalhe salvo, exclusão e confirmação ou erro da operação.                                                            |

## 10. Plataformas e distribuição

Aplicação web acessada por URL em navegadores de desktop, publicada no Firebase Hosting. As execuções dependem de conexão com as Cloud Functions e o gateway.

## 11. Restrições e qualidade

Interface em português do Brasil, com navegação completa por teclado, foco visível e estados identificados por texto. Os resultados aparecem lado a lado no desktop. A duração é medida para cada geração e para o julgamento. O escopo aprovado não estabelece um prazo máximo de resposta dos provedores.

## 12. Critérios de sucesso

Na aceitação da versão, um visitante consegue examinar os três benchmarks sem disparar chamadas. Um desenvolvedor aprovado consegue escolher um modelo para sua tarefa consultando a geração, a nota explicada, o custo e a duração na mesma comparação. Nas demos, consegue identificar a origem de cada resposta e o destino que assumiu a chamada após a falha.

## 13. Critérios de aceite

- **CA-01.** Um visitante abre os três benchmarks, lê as avaliações e consulta custos e tempos sem login ou cobrança. Tentar executar conduz ao fluxo de acesso.
- **CA-02.** Uma pessoa envia um pedido sem preencher a justificativa, acompanha a decisão e só consegue executar após aprovação. Uma conta comum não consegue aprovar pedidos nem publicar.
- **CA-03.** Para uma tarefa com três versões, as três recebem o mesmo prompt. Com duas compatíveis, a seleção explica a limitação e aceita as duas. Cada resposta identifica a versão efetiva. Um indicador indisponível aparece como “não informado”.
- **CA-04.** Com US$ 1 disponível, duas execuções simultâneas que exigem US$ 0,70 cada permitem apenas uma reserva. Se ela consumir US$ 0,50, restam US$ 0,50. Um modelo sem preço conhecido é bloqueado antes da chamada.
- **CA-05.** Notas individuais 1, 3 e 4 produzem mediana 3. Medianas 4, 3 e 2 produzem nota geral 3/4. Dois modelos com essa média dividem a posição mesmo com custos diferentes. É possível consultar cada justificativa.
- **CA-06.** Se faltar um parecer ou um critério for não verificável, as avaliações disponíveis ficam visíveis com a razão do ranking parcial. Se uma geração falhar, só a tentativa escolhida é repetida e o usuário vê o novo custo previsto.
- **CA-07.** Duas chamadas idênticas da demo de cache mostram as origens efetivas e seus tempos. A demo de fallback mostra a falha preparada e a versão que respondeu.
- **CA-08.** O autor reabre um resultado sem consumo adicional. Ao excluí-lo, o item desaparece e o consumo permanece. Após 30 dias, o teste privado expira e sua eventual cópia pública continua acessível até retirada.
- **CA-09.** A jornada de seleção, execução e consulta de pareceres funciona por teclado. A mesma comparação apresenta as gerações lado a lado no desktop.

## 14. Não escopo

Upload de arquivos, execução por visitantes ou contas sem aprovação, compartilhamento público de testes pessoais, escolha dos juízes pelo usuário e criação de sequências próprias de fallback. A primeira versão demonstra variedade de modelos e provedores, cache e fallback.

## 15. Decisões e motivos

A entrada pública pela galeria permite explorar evidências sem gastar. A reserva antes da chamada protege o orçamento inclusive quando há execuções simultâneas. O painel definido por tarefa permite repetir comparações com os mesmos critérios. A publicação de uma cópia preserva a execução revisada independentemente do prazo do histórico.

## 16. Decisões em aberto

Nenhuma.
