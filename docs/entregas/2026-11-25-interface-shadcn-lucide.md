# Interface com shadcn/ui e Lucide React

Entrega local de 25/11/2026 na branch `codex/interface-shadcn-lucide`, conforme o plano de migração apresentado na conversa.

## Funcionalidades e critérios de aceite

- [x] O catálogo, a comparação, as demos, a galeria, o histórico e a administração usam a mesma base de botões, campos e feedback. As ações têm rótulos em português e ícones Lucide.
- [x] As abas de resposta e pareceres aceitam as setas do teclado. Os controles de expansão anunciam seu estado. Os cartões privados conservam a semântica de artigo.
- [x] O tema grafite e âmbar é compartilhado pelos componentes. O diagrama usa Lucide para as setas e SVG para desenhar os caminhos entre modelos e resultados.

## Arquivos alterados

Os primitivos ficam em `src/shared/ui`, com configuração em `components.json`, tema em `src/styles/shadcn.css` e integração de build em `vite.config.ts`. O shell e as features consomem esses componentes. A [ADR 0018](../decisions/0018-shadcn-ui.md) e o [guia visual](../styleguide.md) descrevem a convenção.

## Testes e validação

| Comando                                         | Resultado observado                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                              | Validação concluída. 114 testes Vitest passaram. A suíte Node registrou 81 aprovados e 12 pulados. Build e smoke test passaram. |
| `npm run test:e2e`                              | 6 passed (8.2s) no Chromium. As jornadas verificam catálogo, acesso, orçamento, execução, galeria e leitura por teclado.        |
| `npm run test:functions` com Firestore Emulator | 23 aprovados, sem falhas nem testes pulados. Inclui os oito cenários que dependem do emulador.                                  |

Os outros quatro testes condicionais do gate pertencem ao kit Vitru, desativado no perfil do projeto. O Vite sinalizou o tamanho do JavaScript principal, 536,50 kB minificado e 165,14 kB com gzip.

## Verificação manual

Em `/comparar`, escolha uma tarefa, selecione versões com a barra de espaço e confira o contador. Em um benchmark publicado, escolha o modelo na tabela, mova o foco para a aba Resposta e pressione a seta para a direita. A aba Pareceres deve ativar. Use Enter em um juiz para expandir o parecer.
