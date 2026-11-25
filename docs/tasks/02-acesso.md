# Fase 2 — Login, solicitações e administração

Permitir leitura pública e controlar no servidor quem pode executar e administrar.

**Dependências e cobertura** · Fase 1 · RF-02, RN-01 · CA-02

## Tarefas

- [ ] **T04 — Integrar login Google.** Usar a feature de autenticação existente como ponto de partida. Validar a identidade nas Functions e testar login, retorno, expiração e saída sem perder a navegação pública.
- [ ] **T05 — Implementar solicitação e acompanhamento.** Permitir justificativa opcional. Persistir e apresentar a situação do próprio pedido. Testar envio sem texto, reenvio da mesma requisição e acesso entre duas contas.
- [ ] **T06 — Entregar a fila administrativa.** Configurar o primeiro administrador pelo servidor. Implementar consulta, aprovação e rejeição com verificação de papel. Testar duas decisões concorrentes e tentativa de decisão por conta comum.

## Critério de conclusão

Um visitante consulta conteúdo público. Uma conta pendente ou rejeitada não executa. Um administrador aprova um pedido e a conta aprovada passa a executar operações protegidas de teste.

## Risco principal

Login comprova identidade. A aprovação precisa ser consultada nas funções inclusive em chamadas diretas, independentemente dos controles exibidos pela interface.

## Homologação da T04

O cliente Google habilitado em `timekeeper-d9a0a` respondeu `redirect_uri_mismatch` para o callback local do Hosting em 25/11/2026. O fluxo com PKCE, a troca na Function, a guarda em memória e a validação da identidade já têm implementação. Os testes locais passaram. A homologação com conta real aguarda o cadastro de `http://127.0.0.1:5500/auth/callback` no cliente OAuth e a configuração do segredo no ambiente das Functions. O site do app é `cf-ai-gateway`.
