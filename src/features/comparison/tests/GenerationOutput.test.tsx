import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { GenerationOutput } from '../components/GenerationOutput';

it('apresenta texto literal e nome acessível para a imagem', () => {
  const { rerender } = render(
    <GenerationOutput model="Mistral" content={{ type: 'text', text: '<b>texto</b>' }} />,
  );
  expect(screen.getByText('<b>texto</b>')).toBeVisible();
  rerender(
    <GenerationOutput model="Lucid Origin" content={{ type: 'image', url: 'blob:preview' }} />,
  );
  expect(screen.getByRole('img', { name: 'Imagem gerada por Lucid Origin' })).toHaveAttribute(
    'src',
    'blob:preview',
  );
});
