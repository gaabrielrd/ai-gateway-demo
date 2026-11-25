# Fase 8 — Aceite integrado e publicação

Conferir a jornada real de cada papel e publicar a primeira versão no Firebase.

**Dependências e cobertura** · Fases 1–7 · CA-01–09

## Tarefas

- [ ] **T24 — Validar jornadas e acessibilidade.** Cobrir em E2E visitante, solicitante, aprovado e administrador. Exercitar carregamento, vazio, erro, resultado parcial e sucesso. Conferir português do Brasil, foco, operação por teclado e layouts desktop e celular.
- [ ] **T25 — Homologar as integrações.** Usar ambiente controlado com provedores habilitados para comprovar texto, imagem, julgamento, cache e fallback reais. Conferir consumo por execução e privacidade. Manter os testes automatizados repetíveis com respostas controladas.
- [ ] **T26 — Publicar e verificar a versão.** Rodar npm run validate e npm run test:e2e. Publicar Functions e Hosting com configuração do ambiente, conferir rotas diretas, login, consulta anônima, cotas e galeria de estreia. Registrar em docs/entregas os resultados reais e a versão entregue.

## Critério de conclusão

Os nove critérios do PRD têm evidência. A URL do Firebase abre o comparador, aceita o retorno do Google e permite consultar os três benchmarks sem gastos.

## Risco principal

A passagem local com respostas controladas não comprova a configuração do ambiente publicado. Reservar saldo e preparar credenciais para a homologação antes da estreia.
