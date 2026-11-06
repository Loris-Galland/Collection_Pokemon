import { cleanWishlistName, WISHLIST_NAME_MAX_LENGTH } from '@collection/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, TextField, spacing } from '@/ui';

interface WishlistNameSheetProps {
  visible: boolean;
  title: string;
  /** The current name, when renaming. */
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** Sheet that asks for the name of a list, to create one or rename it. */
export function WishlistNameSheet({ visible, title, initialName = '', submitLabel, onSubmit, onClose }: WishlistNameSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {/* A fresh field each time the sheet opens. */}
      {visible && <WishlistNameForm initialName={initialName} submitLabel={submitLabel} onSubmit={onSubmit} />}
    </Sheet>
  );
}

/** The name field and its button, for a sheet that also shows other things. */
export function WishlistNameForm({
  initialName,
  submitLabel,
  onSubmit,
}: {
  initialName: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const clean = cleanWishlistName(name);
  const submit = () => clean && onSubmit(clean);

  return (
    <View style={styles.form}>
      <TextField
        label={t('wishlist.nameLabel')}
        placeholder={t('wishlist.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        autoFocus
        selectTextOnFocus
        maxLength={WISHLIST_NAME_MAX_LENGTH}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button label={submitLabel} disabled={!clean || clean === initialName} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});
