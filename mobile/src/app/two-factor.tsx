import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { authClient } from '@/features/account/auth-client';
import { FormError } from '@/features/account/form-error';
import { leaveAccountScreen } from '@/features/account/use-account';
import { useAccountRequest } from '@/features/account/use-account-request';
import { Button, KeyboardScrollView, Text, TextField, colors, spacing } from '@/ui';

/** Second step of the sign in, with a code from the authenticator app or a backup code. */
export default function TwoFactorScreen() {
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
        <Text variant="display">Validation</Text>
        <Text tone="muted">
          {useBackupCode
            ? 'Saisis un de tes codes de secours. Chaque code ne sert qu’une fois.'
            : 'Saisis le code à 6 chiffres affiché par ton application d’authentification.'}
        </Text>
      </View>

      <TextField
        label={useBackupCode ? 'Code de secours' : 'Code'}
        value={code}
        onChangeText={setCode}
        keyboardType={useBackupCode ? 'default' : 'number-pad'}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
      />

      <FormError message={error} />

      <Button label={busy ? 'Un instant…' : 'Valider'} disabled={busy || !code.trim()} onPress={submit} />

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
          {useBackupCode ? 'Utiliser mon application d’authentification' : 'Utiliser un code de secours'}
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
