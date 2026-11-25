import { initializeApp } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import type { Session } from '../model/session';

// Identificadores públicos do aplicativo Web registrado no Firebase.
const app = initializeApp(
  {
    projectId: 'timekeeper-d9a0a',
    authDomain: 'timekeeper-d9a0a.firebaseapp.com',
    apiKey: 'AIzaSyDBHSbxaaZjZWaNLtMt3VK6iSJsmtyXM28',
    appId: '1:190447151292:web:55a33bae57b824c2f688b9',
  },
  'ai-gateway-demo',
);

const auth = initializeAuth(app, { persistence: inMemoryPersistence });

async function sessionFor(user: User): Promise<Session | null> {
  const token = await user.getIdTokenResult();
  if (auth.currentUser !== user) return null;
  return {
    accessToken: token.token,
    expiresAt: Date.parse(token.expirationTime),
    refreshToken: undefined,
    subject: user.uid,
    scope: [],
  };
}

export async function enterWithGoogle(): Promise<Session | null> {
  const { user } = await signInWithPopup(
    auth,
    new GoogleAuthProvider(),
    browserPopupRedirectResolver,
  );
  return sessionFor(user);
}

export function currentFirebaseSession(): Promise<Session | null> {
  return auth.currentUser ? sessionFor(auth.currentUser) : Promise.resolve(null);
}

export function leaveFirebaseSession() {
  return signOut(auth);
}
