import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../lib/session';
import { AppScreen } from '../../components/AppScreen';
import { colors, spacing } from '../../theme/tokens';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string;
    error?: string;
  }>();
  const { completeMagicLink } = useSession();
  const [message, setMessage] = useState('Completing sign in...');

  const token = getSingleParam(params.token);
  const error = getSingleParam(params.error);

  useEffect(() => {
    let mounted = true;

    async function complete() {
      if (error) {
        if (!mounted) return;
        setMessage(`Sign-in failed: ${error}`);
        return;
      }

      if (!token) {
        if (!mounted) return;
        setMessage('This sign-in link is missing a session token.');
        return;
      }

      try {
        await completeMagicLink(token);
        router.replace('/');
      } catch {
        if (!mounted) return;
        setMessage('Unable to establish a session from this link.');
      }
    }

    void complete();

    return () => {
      mounted = false;
    };
  }, [completeMagicLink, error, router, token]);

  return (
    <AppScreen scroll={false}>
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
