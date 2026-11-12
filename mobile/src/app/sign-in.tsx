import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { authClient } from '@/features/account/auth-client';
import { googleNotCompletedMessage, MIN_PASSWORD_LENGTH } from '@/features/account/auth-errors';
import { FormError } from '@/features/account/form-error';
import { leaveAccountScreen } from '@/features/account/use-account';
import { useAccountRequest } from '@/features/account/use-account-request';
import {
  Button,
  Checkbox,
  CreateAccountIcon,
  GoogleIcon,
  KeyboardScrollView,
  PasswordField,
  SegmentedControl,
  SignInIcon,
  Text,
  TextField,
  colors,
  spacing,
} from '@/ui';

// Keeps the next field and the button in view as soon as the first field is touched.
const ROOM_FOR_THE_FORM = 240;

/** Sign in or create an account, with an email and a password or with Google. */
export default function SignInScreen() {
  const { t } = useTranslation();
  const modes = [
    { value: 'sign-in', label: t('account.signIn'), icon: SignInIcon },
    { value: 'create', label: t('account.createAccount'), icon: CreateAccountIcon },
  ] as const;
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
        else setError(googleNotCompletedMessage());
      },
    );

  const incomplete = !email.trim() || !password || (creating && (!name.trim() || !acceptedTerms));

  return (
    <KeyboardScrollView style={styles.screen} contentContainerStyle={styles.content} roomUnderField={ROOM_FOR_THE_FORM}>
      <View style={styles.heading}>
        <Text variant="display">{creating ? t('account.createAccount') : t('account.signInTitle')}</Text>
        <Text tone="muted">{creating ? t('account.createHint') : t('account.signInHint')}</Text>
      </View>

      <SegmentedControl
        options={modes}
        value={creating ? 'create' : 'sign-in'}
        onChange={(mode) => {
          setCreating(mode === 'create');
          setError(undefined);
        }}
      />

      <Button label={t('account.google')} variant="secondary" icon={GoogleIcon} disabled={busy} onPress={signInWithGoogle} />

      <Text variant="caption" tone="faint">
        {t('account.googleNotice')}
      </Text>

      <View style={styles.separator}>
        <View style={styles.line} />
        <Text variant="caption" tone="faint">
          {t('account.or')}
        </Text>
        <View style={styles.line} />
      </View>

      {creating && (
        <TextField
          label={t('account.pseudoHint')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="username"
          textContentType="username"
        />
      )}
      <TextField
        label={t('account.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <PasswordField
        label={t('account.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete={creating ? 'new-password' : 'current-password'}
        textContentType={creating ? 'newPassword' : 'password'}
        onSubmitEditing={incomplete ? undefined : submit}
      />
      {creating && (
        <Text variant="caption" tone="faint">
          {t('account.passwordLength', { count: MIN_PASSWORD_LENGTH })}
        </Text>
      )}
      {creating && (
        <Checkbox
          label={t('account.terms')}
          checked={acceptedTerms}
          onChange={setAcceptedTerms}
        />
      )}

      <FormError message={error} />

      <Button
        label={busy ? t('common.wait') : creating ? t('account.createMine') : t('account.signIn')}
        icon={creating ? CreateAccountIcon : SignInIcon}
        disabled={busy || incomplete}
        onPress={submit}
      />

      <Pressable accessibilityRole="link" hitSlop={8} style={styles.privacyLink} onPress={() => router.push('/privacy')}>
        <Text variant="caption" tone="muted">
          {t('settings.privacyPolicy')}
        </Text>
      </Pressable>
    </KeyboardScrollView>
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
  privacyLink: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
});
