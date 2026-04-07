import { createContext, startTransition, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setApiToken, type SessionUser } from './api';
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  setStoredSessionToken,
} from './storage';

type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  token: string | null;
  requestMagicLink: (email: string, redirectTo: string) => Promise<void>;
  completeMagicLink: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function clearSessionState() {
  setApiToken(null);
  await clearStoredSessionToken();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const storedToken = await getStoredSessionToken();
      if (!storedToken) {
        if (!mounted) return;
        startTransition(() => {
          setStatus('anonymous');
          setToken(null);
          setUser(null);
        });
        return;
      }

      setApiToken(storedToken);

      try {
        const currentUser = await api.getCurrentUser();
        if (!currentUser) {
          throw new Error('Missing current user');
        }

        if (!mounted) return;
        startTransition(() => {
          setToken(storedToken);
          setUser(currentUser);
          setStatus('authenticated');
        });
      } catch {
        await clearSessionState();
        if (!mounted) return;
        startTransition(() => {
          setToken(null);
          setUser(null);
          setStatus('anonymous');
        });
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      token,
      async requestMagicLink(email, redirectTo) {
        await api.sendMagicLink(email, redirectTo);
      },
      async completeMagicLink(nextToken) {
        setApiToken(nextToken);
        await setStoredSessionToken(nextToken);
        const currentUser = await api.getCurrentUser();
        if (!currentUser) {
          await clearSessionState();
          throw new Error('Unable to load session');
        }

        startTransition(() => {
          setToken(nextToken);
          setUser(currentUser);
          setStatus('authenticated');
        });
      },
      async signOut() {
        try {
          if (token) {
            await api.logout();
          }
        } finally {
          await clearSessionState();
          startTransition(() => {
            setToken(null);
            setUser(null);
            setStatus('anonymous');
          });
        }
      },
    }),
    [status, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return value;
}
