# T19 — Publicação administrativa

Depois de revisar sua execução, o administrador dá um título ao benchmark e confirma a autoria do material. A galeria serve uma cópia independente dos resultados e das imagens. A retirada em Meu acesso → Gerenciar benchmarks encerra a leitura pública.

No emulador do Firestore, o teste verificou conta comum, tentativa de publicar execução de outro autor, declaração de autoria ausente e revisão incorreta. Simulou a falta da segunda imagem, verificou a limpeza da primeira e repetiu a publicação com sucesso. Depois apagou a origem, recuperou texto e imagem como visitante e confirmou que a retirada bloqueava as duas leituras. O teste usou um adaptador de Storage em memória.

A validação completa passou, incluindo 111 testes do Vitest, build e smoke test. A interface exigiu a confirmação de autoria e abriu a galeria pública sem solicitar sessão. A publicação de exemplos reais pertence à T20.
