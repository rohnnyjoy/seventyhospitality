import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { TabButton, Button, AppIcon } from 'octahedron';
import { api } from '../lib/api';
import { SeventyLogo } from './SeventyLogo';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { href: '/members', label: 'Members' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/facilities', label: 'Facilities' },
  { href: '/events', label: 'Events' },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('seventy-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('seventy-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, useCallback(() => setDark((d) => !d), [])] as const;
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, toggleDark] = useDarkMode();

  async function handleLogout() {
    try { await api.logout(); } catch { /* session may already be expired */ }
    navigate('/sign-in');
  }

  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Link to="/" className={styles.logoButton} aria-label="Home">
            <SeventyLogo size={20} className={styles.logoImage} />
          </Link>
          <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <TabButton
                key={item.href}
                active={pathname.startsWith(item.href)}
                aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                onClick={() => navigate(item.href)}
              >
                {item.label}
              </TabButton>
            ))}
          </nav>
        </div>
        <div className={styles.nav}>
          <Button
            ariaLabel="Settings"
            icon={<AppIcon name="settings" />}
            variant="ghost"
            onClick={() => navigate('/settings')}
          />
          <Button
            ariaLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            icon={<AppIcon name={dark ? 'sun' : 'moon'} />}
            variant="ghost"
            onClick={toggleDark}
          />
          <Button variant="ghost" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
