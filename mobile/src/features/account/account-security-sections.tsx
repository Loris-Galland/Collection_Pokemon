import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, PasswordField, Text, TextField, colors, radius, spacing } from '@/ui';

import { authClient, withTwoFactorCode } from './auth-client';
import { forgetAvatar } from './avatar';
import { FormError } from './form-error';
import { removeLocalData } from './local-data';
import { TwoFactorSetup } from './two-factor-setup';
import { leaveAccountScreen } from './use-account';
import { useAccountRequest } from './use-account-request';

function CurrentPasswordField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <PasswordField
      label={t('account.currentPassword')}
      value={value}
      onChangeText={onChangeText}
      autoComplete="current-password"
      textContentType="password"
    />
  );
}

function CodeField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <TextField
      label={t('account.sixDigitCode')}
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
    />
  );
}

/** Turns two-factor authentication on or off. A Google account manages it on Google instead. */
export function TwoFactorSection({ hasPassword, enabled }: { hasPassword: boolean; enabled: boolean }) {
  const { t } = useTranslation();
  const [settingUp, setSettingUp] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const { error, busy, send } = useAccountRequest();

  const disable = () =>
    send(
      () => authClient.twoFactor.disable({ password }, withTwoFactorCode(code)),
      () => {
        setPassword('');
        setCode('');
      },
    );

  let content;
  if (!hasPassword) {
    content = (
      <Text variant="caption" tone="muted">
        {t('account.twoFactorGoogle')}
      </Text>
    );
  } else if (settingUp) {
    content = <TwoFactorSetup />;
  } else if (enabled) {
    content = (
      <>
        <Text variant="caption" style={{ color: colors.success }}>
          {t('account.enabled')}
        </Text>
        <CurrentPasswordField value={password} onChangeText={setPassword} />
        <CodeField value={code} onChangeText={setCode} />
        <FormError message={error} />
        <Button label={t('account.disable')} variant="secondary" disabled={busy || !password || !code.trim()} onPress={disable} />
      </>
    );
  } else {
    content = (
      <>
        <Text variant="caption" tone="muted">
          {t('account.twoFactorPitch')}
        </Text>
        <Button label={t('account.enable')} variant="secondary" onPress={() => setSettingUp(true)} />
      </>
    );
  }

  return (
    <View style={styles.section}>
      <Text variant="heading">{t('account.twoFactor')}</Text>
      {content}
    </View>
  );
}

interface DeleteAccountSectionProps {
  userId: string;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
}

/** Deletes the account for good, along with what it saved on this phone. */
export function DeleteAccountSection({ userId, hasPassword, twoFactorEnabled }: DeleteAccountSectionProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const { error, busy, send } = useAccountRequest();

  const deleteAccount = () =>
    send(
      () => authClient.deleteUser(hasPassword ? { password } : {}, withTwoFactorCode(code)),
      async () => {
        forgetAvatar(userId);
        await removeLocalData(userId);
        leaveAccountScreen();
      },
    );

  const incomplete = (hasPassword && !password) || (twoFactorEnabled && !code.trim());

  return (
    <View style={styles.section}>
      <Text variant="heading">{t('account.deleteTitle')}</Text>
      <Text variant="caption" tone="muted">
        {t('account.deleteText')}
      </Text>
      {confirming ? (
        <>
          {hasPassword && <CurrentPasswordField value={password} onChangeText={setPassword} />}
          {twoFactorEnabled && <CodeField value={code} onChangeText={setCode} />}
          <FormError message={error} />
          <Button
            label={busy ? t('common.wait') : t('account.deleteForGood')}
            disabled={busy || incomplete}
            onPress={deleteAccount}
          />
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <Button label={t('account.deleteTitle')} variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
