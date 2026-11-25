# Fase 2 — Login, solicitações e administração

Permitir leitura pública e controlar no servidor quem pode executar e administrar.

**Dependências e cobertura** · Fase 1 · RF-02, RN-01 · CA-02

## Tarefas

- [x] **T04 — Integrar login Google.** Usar a feature de autenticação existente como ponto de partida. Validar a identidade nas Functions e testar login, retorno, expiração e saída sem perder a navegação pública.
- [x] **T05 — Implementar solicitação e acompanhamento.** Permitir justificativa opcional. Persistir e apresentar a situação do próprio pedido. Testar envio sem texto, reenvio da mesma requisição e acesso entre duas contas.
- [x] **T06 — Entregar a fila administrativa.** Configurar o primeiro administrador pelo servidor. Implementar consulta, aprovação e rejeição com verificação de papel. Testar duas decisões concorrentes e tentativa de decisão por conta comum.

## Critério de conclusão

Um visitante consulta conteúdo público. Uma conta pendente ou rejeitada não executa. Um administrador aprova um pedido e a conta aprovada passa a executar operações protegidas de teste.

## Risco principal

Login comprova identidade. A aprovação precisa ser consultada nas funções inclusive em chamadas diretas, independentemente dos controles exibidos pela interface.

## Homologação da T04

O login do aplicativo usa o popup Google gerenciado pelo Firebase e a sessão em memória. O passo manual com `client_secret` e o cadastro do callback OAuth foram substituídos pelo uso dos domínios autorizados do Firebase Authentication. O usuário confirmou em 25/11/2026 que o login com sua conta Google funcionou.
