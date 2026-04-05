import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.getMe().then((user) => {
      if (!user) {
        navigate('/sign-in', { replace: true });
      } else {
        setReady(true);
      }
    }).catch(() => {
      navigate('/sign-in', { replace: true });
    });
  }, [navigate]);

  if (!ready) return null;
  return <>{children}</>;
}
