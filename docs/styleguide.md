# Base visual

A aplicação usa shadcn/ui com tema próprio e ícones de `lucide-react`. Os componentes do registro oficial ficam versionados em `src/shared/ui` e as features os importam de `@/shared/ui`.

A direção desktop usa fundo grafite, destaque âmbar, títulos em serifa e IBM Plex Mono local nas tabelas e nos dados dos cards. A [referência visual](../DESIGN.md) descreve a composição.

## Onde cada coisa está

- **Tokens** (cor, tipografia, espaçamento, forma, movimento):
  `src/styles/tokens.css`
- **Primitivos reutilizáveis**: `src/shared/ui`
- **Tema shadcn/ui**: `src/styles/shadcn.css` conecta as cores semânticas aos tokens locais.
- **Layout de uma feature**: CSS Module ao lado do próprio componente

## Regras

1. Cor, espaçamento, tipografia, raio, sombra e transição vêm dos tokens.
2. CSS de componente não declara cor literal.
3. A biblioteca de ícones é `lucide-react`.
4. Estilo de feature permanece em CSS Module próprio.
5. Toda tela com dados cobre carregando, vazio, erro e sucesso.
6. Trocar a identidade visual é trocar os valores dos tokens, não os
   componentes.

## Acessibilidade

- contraste mínimo AA;
- foco visível preservado;
- movimento reduzido respeitado;
- ícones decorativos com `aria-hidden="true"`;
- ícone sem texto exige nome acessível no controle.

## Verificação

A capacidade `styleguide` está desligada em `.template-state.json`, então
`npm run check:styleguide` não roda neste projeto. O que continua valendo é o
lint, o typecheck e os testes:

```bash
npm run validate
```

Para adicionar componentes, use o registro do shadcn/ui com as configurações de `components.json`, revise as dependências e exporte o componente em `src/shared/ui/index.ts`. Para links de ação, use `Button asChild` com o link do roteador. A navegação por teclado e os nomes acessíveis são verificados no Chromium.

## Telas de operação

Galeria, histórico, acesso, demonstrações e configuração de juízes compartilham um cabeçalho com título em serifa, descrição curta e divisor. Galeria e histórico usam uma linha por registro. No comparador desktop, o catálogo e a seleção ficam lado a lado para manter a contagem visível durante a escolha. Em janelas estreitas, a seleção acompanha a lista em uma coluna.

O benchmark exibe a coluna de campos quando há conferência de gabarito. A conclusão respeita os empates e a classificação parcial. Nos fluxos privados, o botão de login junto à tarefa abre o popup na própria página.

Os seletores de provedor e modelo abrem painéis de busca com ícones Lucide. O primeiro apresenta quantas versões são elegíveis para a tarefa. O segundo permite marcar várias versões e consultar tarifas e restrições por opção. O diagrama ao lado mostra as vagas disponíveis e liga cada versão escolhida ao prompt. A conexão muda de cor imediatamente e recebe uma animação curta quando a preferência de movimento permite.
