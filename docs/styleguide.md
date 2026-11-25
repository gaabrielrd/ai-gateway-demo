# Base visual

Este projeto **não usa** o kit `@vitru/styleguide`. A base visual é local e
pertence ao projeto.

A direção desktop usa fundo grafite, destaque âmbar, títulos em serifa e IBM Plex Mono local nas tabelas e nos dados dos cards. A [referência visual](../DESIGN.md) descreve a composição.

## Onde cada coisa está

- **Tokens** (cor, tipografia, espaçamento, forma, movimento):
  `src/styles/tokens.css`
- **Primitivos reutilizáveis**: `src/shared/ui`
- **Estilo de um componente**: CSS Module ao lado do próprio componente

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

Se um dia o projeto adotar um kit compartilhado, ligue a capacidade de volta e
a verificação volta com ela.
