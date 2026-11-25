# Fase 1 — Fundação e ambiente local

Preparar o caminho entre a aplicação web e uma função de servidor antes de integrar provedores.

**Dependências e cobertura** · Base inicial

## Tarefas

- [ ] **T01 — Conferir a base existente.** Mapear a autenticação OIDC, rotas, configuração de ambiente, tokens visuais, testes e publicação herdada. Identificar o que reaproveitar e registrar as diferenças para Firebase Hosting.
- [ ] **T02 — Definir persistência e contratos.** Comparar as opções de armazenamento transacional e de mídia no Firebase. Documentar identidade, autorização, execução, tentativa, parecer, reserva e publicação, com autoria e prazos. Registrar a escolha e o motivo na arquitetura.
- [ ] **T03 — Preparar Firebase e testes locais.** Configurar Hosting para a SPA, Cloud Functions, ambiente local de testes e acesso a segredos no servidor. Conferir compatibilidade com Node 24. Integrar os testes do servidor à validação e exercitar uma chamada sem custo.

## Critério de conclusão

A aplicação e uma função de teste rodam localmente. Atualizar diretamente uma rota do app funciona. O bundle público não contém credenciais.

## Risco principal

A configuração de GitHub Pages pertence ao template. Verificar base de rotas, retorno do login e separação entre configuração pública e segredos antes do primeiro deploy.
