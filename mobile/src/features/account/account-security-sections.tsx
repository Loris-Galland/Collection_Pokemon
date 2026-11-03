import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text, TextField, colors, radius, spacing } from '@/ui';

import { authClient, withTwoFactorCode } from './auth-client';
import { forgetAvatar } from './avatar';
import { FormError } from './form-error';
import { removeLocalData } from './local-data';
import { TwoFactorSetup } from './two-factor-setup';
import { leaveAccountScreen } from './use-account';
import { useAccountRequest } from './use-account-request';

function PasswordField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <TextField
      label="Mot de passe actuel"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry
      autoComplete="current-password"
      textContentType="password"
    />
  );
}

function CodeField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <TextField
      label="Code à 6 chiffres"
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
        Tu te connectes avec Google. Active la validation en deux étapes directement sur ton compte Google.
      </Text>
    );
  } else if (settingUp) {
    content = <TwoFactorSetup />;
  } else if (enabled) {
    content = (
      <>
        <Text variant="caption" style={{ color: colors.success }}>
          ✓ Activée
        </Text>
        <PasswordField value={password} onChangeText={setPassword} />
        <CodeField value={code} onChangeText={setCode} />
        <FormError message={error} />
        <Button label="Désactiver" variant="secondary" disabled={busy || !password || !code.trim()} onPress={disable} />
      </>
    );
  } else {
    content = (
      <>
        <Text variant="caption" tone="muted">
          Protège ton compte avec un code temporaire en plus de ton mot de passe.
        </Text>
        <Button label="Activer" variant="secondary" onPress={() => setSettingUp(true)} />
      </>
    );
  }

  return (
    <View style={styles.section}>
      <Text variant="heading">Validation en deux étapes</Text>
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
      <Text variant="heading">Supprimer mon compte</Text>
      <Text variant="caption" tone="muted">
        Ton compte et ce qu’il a enregistré sur ce téléphone seront supprimés définitivement. Cette action est
        irréversible.
      </Text>
      {confirming ? (
        <>
          {hasPassword && <PasswordField value={password} onChangeText={setPassword} />}
          {twoFactorEnabled && <CodeField value={code} onChangeText={setCode} />}
          <FormError message={error} />
          <Button
            label={busy ? 'Un instant…' : 'Supprimer définitivement'}
            disabled={busy || incomplete}
            onPress={deleteAccount}
          />
          <Button label="Annuler" variant="secondary" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <Button label="Supprimer mon compte" variant="secondary" onPress={() => setConfirming(true)} />
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
