import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { useCopies } from '@/features/collection/collection-provider';
import { useWishlist } from '@/features/wishlist/wishlist-provider';
import { Button, Text, TextField, colors, radius, spacing } from '@/ui';

import { authClient } from './auth-client';
import { loadAvatar } from './avatar';
import { AvatarPicker } from './avatar-picker';
import { FormError } from './form-error';
import { useAccountRequest } from './use-account-request';

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  twoFactorEnabled?: boolean | null;
}

/** Changes the pseudo. The email stays fixed until addresses can be verified by email. */
export function ProfileSection({ user }: { user: ProfileUser }) {
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const { error, busy, send } = useAccountRequest();

  const trimmed = name.trim();
  const save = () => {
    setSaved(false);
    return send(
      () => authClient.updateUser({ name: trimmed }),
      () => setSaved(true),
    );
  };

  return (
    <View style={styles.section}>
      <Text variant="heading">Mon profil</Text>
      <AvatarPicker userId={user.id} name={user.name} />
      <Text variant="caption" tone="muted">
        {user.email}
      </Text>
      <TextField
        label="Pseudo"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setSaved(false);
        }}
        autoCapitalize="words"
        autoComplete="username"
        textContentType="username"
      />
      <FormError message={error} />
      {saved && (
        <Text variant="caption" style={{ color: colors.success }}>
          ✓ Pseudo enregistré
        </Text>
      )}
      <Button
        label={busy ? 'Un instant…' : 'Enregistrer'}
        variant="secondary"
        disabled={busy || !trimmed || trimmed === user.name}
        onPress={save}
      />
    </View>
  );
}

/** Gives the user a copy of their data, as JSON, through the share sheet of the phone. */
export function ExportSection({ user }: { user: ProfileUser }) {
  const copies = useCopies();
  const { wishlist } = useWishlist();
  const [failed, setFailed] = useState(false);

  const exportData = async () => {
    setFailed(false);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
          avatarJpegBase64: await loadAvatar(user.id),
        },
        collection: copies,
        wishlist,
      };
      await Share.share({ title: 'Mes données Holo', message: JSON.stringify(data, null, 2) });
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={styles.section}>
      <Text variant="heading">Mes données</Text>
      <Text variant="caption" tone="muted">
        Récupère une copie de ton compte, de ta photo, de ta collection et de tes envies au format JSON.
      </Text>
      {failed && <FormError message="L’export n’a pas pu se faire. Vérifie ta connexion, puis réessaie." />}
      <Button label="Exporter mes données" variant="secondary" onPress={exportData} />
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
