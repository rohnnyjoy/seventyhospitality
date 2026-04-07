import { useState } from 'react';
import * as Linking from 'expo-linking';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '../../lib/session';
import { AppScreen } from '../../components/AppScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionCard } from '../../components/SectionCard';
import { colors, radius, spacing } from '../../theme/tokens';

const signInSchema = z.object({
  email: z.string().email(),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInScreen() {
  const { requestMagicLink, status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
    },
  });

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      const redirectTo = Linking.createURL('/auth/callback');
      await requestMagicLink(values.email, redirectTo);
      setMessage(`Magic link sent to ${values.email}`);
    } catch {
      setMessage(null);
      setErrorMessage('Unable to send the sign-in email right now.');
    }
  });

  return (
    <AppScreen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Seventy</Text>
        <Text style={styles.title}>Member Mobile</Text>
        <Text style={styles.subtitle}>
          Sign in with a magic link to access reservations, events, and membership controls.
        </Text>
      </View>

      <SectionCard title="Sign In">
        <Controller
          control={form.control}
          name="email"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <View style={styles.inputBlock}>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="member@seventy.club"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, fieldState.error ? styles.inputError : null]}
                value={value}
              />
              {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
            </View>
          )}
        />
        <PrimaryButton
          label="Send Magic Link"
          loading={form.formState.isSubmitting}
          onPress={() => void handleSubmit()}
        />
        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </SectionCard>

      <Text style={styles.footerCopy}>
        Open the email on this device. The link will return directly to the app.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.xs,
  },
  kicker: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  inputBlock: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  successText: {
    color: colors.accent,
    fontSize: 13,
  },
  footerCopy: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
