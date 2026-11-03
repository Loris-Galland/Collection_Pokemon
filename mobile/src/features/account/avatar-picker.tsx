import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, PencilIcon, Text, colors, spacing } from '@/ui';

import { avatarUri, removeAvatar, saveAvatar, useAvatarUri } from './avatar';
import { FormError } from './form-error';

const AVATAR_WIDTH = 256;
const PREPARE_FAILURE = 'Cette photo n’a pas pu être préparée. Essaies-en une autre.';
const SAVE_FAILURE = 'La photo n’a pas pu être modifiée. Vérifie ta connexion, puis réessaie.';

/** Encoding the picture again makes it small, and leaves out its metadata such as the place it was taken. */
async function shrink(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: AVATAR_WIDTH }).renderAsync();
  const { base64 } = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!base64) throw new Error('The picture could not be encoded');
  return base64;
}

/** Shows the profile picture and lets the user choose one from the phone, check how it looks, and save or remove it. */
export function AvatarPicker({ userId, name }: { userId: string; name: string }) {
  const uri = useAvatarUri(userId);
  // The picture waiting for the user to confirm it, already cropped and reduced.
  const [draft, setDraft] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();

  const run = async (action: () => Promise<void>, failureMessage: string) => {
    setBusy(true);
    setError(undefined);
    setSaved(undefined);
    try {
      await action();
    } catch (failure) {
      console.warn('Could not change the profile picture', failure);
      setError(failureMessage);
    } finally {
      setBusy(false);
    }
  };

  const choose = () =>
    run(async () => {
      const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] });
      if (!picked.canceled) setDraft(await shrink(picked.assets[0].uri));
    }, PREPARE_FAILURE);

  const confirm = () =>
    run(async () => {
      if (!draft) return;
      await saveAvatar(userId, draft);
      setDraft(undefined);
      setSaved('✓ Photo enregistrée');
    }, SAVE_FAILURE);

  const remove = () =>
    run(async () => {
      await removeAvatar(userId);
      setSaved('✓ Photo retirée');
    }, SAVE_FAILURE);

  return (
    <View style={styles.picker}>
      <View style={styles.summary}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uri ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
          disabled={busy}
          onPress={choose}
          style={({ pressed }) => pressed && styles.pressed}>
          <Avatar name={name} uri={draft ? avatarUri(draft) : uri} size={72} />
          <View style={styles.editBadge}>
            <PencilIcon color={colors.accentText} size={13} />
          </View>
        </Pressable>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {draft
            ? 'Voici ta photo recadrée et réduite. Elle n’est enregistrée que si tu la valides.'
            : 'Facultative. Elle n’est visible que par toi et tu peux la retirer quand tu veux.'}
        </Text>
      </View>
      <FormError message={error} />
      {saved && (
        <Text variant="caption" style={{ color: colors.success }}>
          {saved}
        </Text>
      )}
      <View style={styles.actions}>
        {draft ? (
          <>
            <View style={styles.action}>
              <Button
                label="Annuler"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setDraft(undefined);
                  setError(undefined);
                }}
              />
            </View>
            <View style={styles.action}>
              <Button label={busy ? 'Un instant…' : 'Valider'} disabled={busy} onPress={confirm} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.action}>
              <Button
                label={busy ? 'Un instant…' : uri ? 'Changer' : 'Ajouter une photo'}
                variant="secondary"
                disabled={busy}
                onPress={choose}
              />
            </View>
            {uri && (
              <View style={styles.action}>
                <Button label="Retirer" variant="secondary" disabled={busy} onPress={remove} />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  hint: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
