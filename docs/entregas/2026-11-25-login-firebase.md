# T04 — Login Google pelo Firebase

O botão de login abre o popup Google gerenciado pelo Firebase e mantém a sessão em memória. O SDK renova o ID token usado pela API. A Function verifica a identidade Firebase e o provedor Google.

O Chromium abriu o popup em `accounts.google.com`. Os emuladores de Authentication, Functions e Hosting confirmaram que um ID token emitido para uma identidade Google simulada retorna seu UID em `GET /api/session` com HTTP 200. Os testes de componente cobrem entrada, saída e popup bloqueado. O comando `npm run validate` terminou com “Validação concluída.”

Em 25/11/2026, o usuário confirmou o login com uma conta Google real no popup. O projeto já autoriza os dois hostnames locais. Os domínios do site `cf-ai-gateway` precisam ser autorizados antes da homologação publicada.
