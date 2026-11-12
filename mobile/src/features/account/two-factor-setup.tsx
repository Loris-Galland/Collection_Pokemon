import * as Linking from 'expo-linking';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, PasswordField, Text, TextField, colors, radius, spacing } from '@/ui';

import { authClient } from './auth-client';
import { FormError } from './form-error';
import { useAccountRequest } from './use-account-request';

interface PendingSetup {
  totpUri: string;
  backupCodes: string[];
}

/** The key inside an otpauth link, for those who type it into their authenticator app. */
function secretOf(totpUri: string): string {
  return /[?&]secret=([^&]+)/.exec(totpUri)?.[1] ?? '';
}

/**
 * Turns on two-factor authentication in three steps. The password confirms it is the owner, the authenticator app gives
 * a first code, and the backup codes are shown only once that code proves the app works.
 */
export function TwoFactorSetup() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<PendingSetup>();
  const [finishedCodes, setFinishedCodes] = useState<string[]>();
  const { error, setError, busy, send } = useAccountRequest();

  const start = () =>
    send(
      () => authClient.twoFactor.enable({ password, method: 'totp' }),
      (data) => {
        if (data.method !== 'totp') return;
        setPending({ totpUri: data.totpURI, backupCodes: data.backupCodes });
        setPassword('');
      },
    );

  const confirm = () =>
    send(
      () => authClient.twoFactor.verifyTotp({ code: code.trim() }),
      () => setFinishedCodes(pending?.backupCodes),
    );

  const openAuthenticator = async () => {
    if (!pending) return;
    try {
      await Linking.openURL(pending.totpUri);
    } catch {
      setError(t('account.noAuthenticator'));
    }
  };

  if (finishedCodes) {
    return (
      <View style={styles.block}>
        <Text variant="heading" style={{ color: colors.success }}>
          {t('account.twoFactorDone')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('account.backupCodesNotice')}
        </Text>
        <View style={styles.codes}>
          {finishedCodes.map((backupCode) => (
            <Text key={backupCode} selectable style={styles.code}>
              {backupCode}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (pending) {
    return (
      <View style={styles.block}>
        <Text variant="caption" tone="muted">
          {t('account.addToAuthenticator')}
        </Text>
        <Button label={t('account.openAuthenticator')} variant="secondary" onPress={openAuthenticator} />
        <Text variant="caption" tone="faint">
          {t('account.copyKey')}
        </Text>
        <Text selectable style={styles.code}>
          {secretOf(pending.totpUri)}
        </Text>
        <TextField
          label={t('account.sixDigitCode')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        <FormError message={error} />
        <Button label={busy ? t('common.wait') : t('account.enable')} disabled={busy || !code.trim()} onPress={confirm} />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text variant="caption" tone="muted">
        {t('account.twoFactorStart')}
      </Text>
      <PasswordField
        label={t('account.currentPassword')}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
      />
      <FormError message={error} />
      <Button label={busy ? t('common.wait') : t('common.continue')} disabled={busy || !password} onPress={start} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  codes: {
    gap: spacing.xs,
  },
  code: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
