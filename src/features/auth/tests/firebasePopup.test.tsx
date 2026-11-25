import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { FirebaseAuthProvider } from '../components/FirebaseAuthProvider';
import { GoogleAccountButton } from '../components/GoogleAccountButton';
import { enterWithGoogle, leaveFirebaseSession } from '../services/firebaseSession';

vi.mock('../services/firebaseSession', () => ({
  enterWithGoogle: vi.fn(),
  leaveFirebaseSession: vi.fn(),
  currentFirebaseSession: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

function openLogin() {
  render(
    <MemoryRouter>
      <FirebaseAuthProvider>
        <GoogleAccountButton />
      </FirebaseAuthProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }));
}

test('abre a conta no popup e volta ao estado anônimo ao sair', async () => {
  vi.mocked(leaveFirebaseSession).mockResolvedValue(undefined);
  vi.mocked(enterWithGoogle).mockResolvedValue({
    subject: 'uid',
    accessToken: 'id',
    expiresAt: Date.now() + 60000,
    scope: [],
    refreshToken: undefined,
  });
  openLogin();
  fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));
  expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeEnabled();
  expect(leaveFirebaseSession).toHaveBeenCalledOnce();
});

test('permite tentar de novo quando o navegador bloqueia o popup', async () => {
  vi.mocked(enterWithGoogle).mockRejectedValue(
    Object.assign(new Error(), { code: 'auth/popup-blocked' }),
  );
  openLogin();
  expect(await screen.findByRole('alert')).toHaveTextContent('Permita popups');
  expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled();
});
