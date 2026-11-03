import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text, TextField, colors, radius, spacing } from '@/ui';

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
      setError('Aucune application d’authentification trouvée. Installes-en une, ou recopie la clé ci-dessous.');
    }
  };

  if (finishedCodes) {
    return (
      <View style={styles.block}>
        <Text variant="heading" style={{ color: colors.success }}>
          ✓ Validation en deux étapes activée
        </Text>
        <Text variant="caption" tone="muted">
          Note ces codes de secours en lieu sûr. Ils te permettent de te connecter si tu perds ton téléphone, et ils ne
          seront plus affichés.
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
          Ajoute Holo à ton application d’authentification (Google Authenticator, Authy…), puis saisis le code affiché.
        </Text>
        <Button label="Ouvrir mon application" variant="secondary" onPress={openAuthenticator} />
        <Text variant="caption" tone="faint">
          Ou recopie cette clé :
        </Text>
        <Text selectable style={styles.code}>
          {secretOf(pending.totpUri)}
        </Text>
        <TextField
          label="Code à 6 chiffres"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        <FormError message={error} />
        <Button label={busy ? 'Un instant…' : 'Activer'} disabled={busy || !code.trim()} onPress={confirm} />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text variant="caption" tone="muted">
        En plus de ton mot de passe, un code temporaire sera demandé à chaque connexion.
      </Text>
      <TextField
        label="Mot de passe actuel"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <FormError message={error} />
      <Button label={busy ? 'Un instant…' : 'Continuer'} disabled={busy || !password} onPress={start} />
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
