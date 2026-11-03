import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { authClient } from '@/features/account/auth-client';
import { GOOGLE_NOT_COMPLETED_MESSAGE, MIN_PASSWORD_LENGTH } from '@/features/account/auth-errors';
import { FormError } from '@/features/account/form-error';
import { leaveAccountScreen } from '@/features/account/use-account';
import { useAccountRequest } from '@/features/account/use-account-request';
import { Button, Checkbox, Text, TextField, colors, spacing } from '@/ui';

/** Sign in or create an account, with an email and a password or with Google. */
export default function SignInScreen() {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { error, setError, busy, send } = useAccountRequest();

  const submit = () =>
    creating
      ? send(() => authClient.signUp.email({ name: name.trim(), email: email.trim(), password }), leaveAccountScreen)
      : send(
          () => authClient.signIn.email({ email: email.trim(), password }),
          (data) => {
            if ('twoFactorRedirect' in data && data.twoFactorRedirect) router.replace('/two-factor');
            else leaveAccountScreen();
          },
        );

  const signInWithGoogle = () =>
    send(
      () => authClient.signIn.social({ provider: 'google', callbackURL: '/', errorCallbackURL: '/sign-in' }),
      // On a phone the sign in happens in a browser and does not navigate back by itself.
      async () => {
        const session = await authClient.getSession();
        if (session.data) leaveAccountScreen();
        else setError(GOOGLE_NOT_COMPLETED_MESSAGE);
      },
    );

  const incomplete = !email.trim() || !password || (creating && (!name.trim() || !acceptedTerms));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text variant="display">{creating ? 'Créer un compte' : 'Connexion'}</Text>
          <Text tone="muted">
            {creating
              ? 'Crée ton compte pour commencer ta collection et tes envies.'
              : 'Retrouve ta collection et tes envies.'}
          </Text>
        </View>

        <Button label="Continuer avec Google" variant="secondary" disabled={busy} onPress={signInWithGoogle} />

        <Text variant="caption" tone="faint">
          Si c’est ta première connexion avec Google, tu confirmes avoir au moins 15 ans et avoir lu la politique de
          confidentialité. Google nous transmet ton nom et ton e-mail.
        </Text>

        <View style={styles.separator}>
          <View style={styles.line} />
          <Text variant="caption" tone="faint">
            ou
          </Text>
          <View style={styles.line} />
        </View>

        {creating && (
          <TextField
            label="Pseudo (pas besoin de ton vrai nom)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="username"
            textContentType="username"
          />
        )}
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={creating ? 'new-password' : 'current-password'}
          textContentType={creating ? 'newPassword' : 'password'}
          onSubmitEditing={incomplete ? undefined : submit}
        />
        {creating && (
          <Text variant="caption" tone="faint">
            Au moins {MIN_PASSWORD_LENGTH} caractères.
          </Text>
        )}
        {creating && (
          <Checkbox
            label="J’ai au moins 15 ans et j’ai lu la politique de confidentialité."
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
          />
        )}

        <FormError message={error} />

        <Button
          label={busy ? 'Un instant…' : creating ? 'Créer mon compte' : 'Se connecter'}
          disabled={busy || incomplete}
          onPress={submit}
        />

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={styles.switch}
          onPress={() => {
            setCreating(!creating);
            setError(undefined);
          }}>
          <Text variant="caption" tone="muted">
            {creating ? 'J’ai déjà un compte' : 'Pas encore de compte ? En créer un'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="link" hitSlop={8} style={styles.switch} onPress={() => router.push('/privacy')}>
          <Text variant="caption" tone="muted">
            Politique de confidentialité
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    gap: spacing.xs,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  switch: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
});
