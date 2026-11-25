# ADR 0018 — Componentes shadcn/ui com tema próprio

Aceita em 25 de novembro de 2026.

As telas compartilham controles de formulário, ações, apresentação de resultados e estados de erro. A aplicação adota os componentes do registro shadcn/ui em `src/shared/ui`. As features consomem a interface pública dessa pasta. Lucide React fornece os ícones.

O plugin Tailwind do Vite compila as classes dos primitivos. Os utilitários clsx e tailwind-merge compõem as classes, e class-variance-authority define as variantes. Radix fornece associação entre abas e painéis, controle dos expansíveis, seleção e composição por `asChild`. As cores semânticas vêm dos tokens do projeto. O layout específico das telas continua nos CSS Modules.

Ao atualizar um componente do registro, revise as adaptações de tema, semântica e acessibilidade antes de aplicar a mudança. A capacidade `styleguide` do template verifica o kit Vitru e segue desligada. [Instalação manual do shadcn/ui](https://ui.shadcn.com/docs/installation/manual).
