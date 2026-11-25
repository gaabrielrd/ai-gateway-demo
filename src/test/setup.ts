/// <reference types="vitest/globals" />

// Entrada específica do Vitest: além de registrar os matchers, ela aumenta os
// tipos de `expect` do Vitest. A entrada genérica aumenta os do Jest e deixa
// `toBeInTheDocument` sem tipo no Vitest 5.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// O jsdom não calcula layout. O Radix observa o tamanho do checkbox dentro de forms.
beforeEach(() =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  ),
);

// Desmonta a arvore, limpa o DOM e o localStorage apos cada teste.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
