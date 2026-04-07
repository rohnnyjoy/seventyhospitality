import { useState } from 'react';
import { Input, Button, Text, Banner } from 'octahedron';
import { FormField } from '../components/FormField';
import { SeventyLogo } from '../components/SeventyLogo';
import { api } from '../lib/api';
import styles from './SignInPage.module.css';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.sendMagicLink(email);
      setSent(true);
    } catch {
      setError('Failed to send login link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <SeventyLogo size={48} />
          <Text variant="title">Sign in</Text>
        </div>

        {error && <Banner intent="danger">{error}</Banner>}

        {sent ? (
          <>
            <Banner intent="success">
              We sent a sign-in link to <strong>{email}</strong>.
            </Banner>
            <button type="button" className={styles.textButton} onClick={() => setSent(false)}>
              Use a different email
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <FormField label="Email address">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  fill
                />
              )}
            </FormField>
            <Button type="submit" color="primary" loading={loading} className={styles.submitButton}>
              Send magic link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
