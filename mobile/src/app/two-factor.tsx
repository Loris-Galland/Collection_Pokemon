import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { authClient } from '@/features/account/auth-client';
import { FormError } from '@/features/account/form-error';
import { leaveAccountScreen } from '@/features/account/use-account';
import { useAccountRequest } from '@/features/account/use-account-request';
import { Button, KeyboardScrollView, Text, TextField, colors, spacing } from '@/ui';

/** Second step of the sign in, with a code from the authenticator app or a backup code. */
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState('');
  const { error, setError, busy, send } = useAccountRequest();

  const submit = () =>
    useBackupCode
      ? send(() => authClient.twoFactor.verifyBackupCode({ code: code.trim() }), leaveAccountScreen)
      : send(() => authClient.twoFactor.verifyTotp({ code: code.trim() }), leaveAccountScreen);

  return (
    <KeyboardScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text variant="display">{t('account.twoFactorTitle')}</Text>
        <Text tone="muted">{useBackupCode ? t('account.backupCodeHint') : t('account.totpHint')}</Text>
      </View>

      <TextField
        label={useBackupCode ? t('account.backupCode') : t('account.code')}
        value={code}
        onChangeText={setCode}
        keyboardType={useBackupCode ? 'default' : 'number-pad'}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
      />

      <FormError message={error} />

      <Button label={busy ? t('common.wait') : t('common.confirm')} disabled={busy || !code.trim()} onPress={submit} />

      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        style={styles.switch}
        onPress={() => {
          setUseBackupCode(!useBackupCode);
          setCode('');
          setError(undefined);
        }}>
        <Text variant="caption" tone="muted">
          {useBackupCode ? t('account.useAuthenticator') : t('account.useBackupCode')}
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
  },
  heading: {
    gap: spacing.xs,
  },
  switch: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
});
