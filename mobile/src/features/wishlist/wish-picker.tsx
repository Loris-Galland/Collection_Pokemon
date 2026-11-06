import { cleanWishlistName, WISHLIST_NAME_MAX_LENGTH } from '@collection/shared';
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRequireAccount } from '@/features/account/use-account';
import {
  Button,
  CheckIcon,
  HeartIcon,
  PlusIcon,
  Sheet,
  Text,
  TextField,
  Toast,
  colors,
  radius,
  spacing,
  useToast,
} from '@/ui';

import { useWishlist, useWishlistActions } from './wishlist-provider';

/** What the picker needs to know about a card. */
export interface WishCard {
  id: string;
  setId: string;
  name: string;
}

interface WishPicker {
  /**
   * Touch on a heart. An empty heart puts the card in the list used last and opens the lists to choose another one, or
   * asks to name a first list when there is none. A full heart removes the card from the wishes.
   */
  toggle: (card: WishCard) => void;
  /** Opens the lists for a card, to put it in one or move it. */
  choose: (card: WishCard) => void;
}

const PickerContext = createContext<WishPicker | null>(null);

/** Holds the sheet that sorts a card into a list, shared by every heart of the app. */
export function WishPickerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const wishlist = useWishlist();
  const { addWish, removeWish } = useWishlistActions();
  const requireAccount = useRequireAccount();
  const { toast, showToast } = useToast();
  const [card, setCard] = useState<WishCard>();
  const [open, setOpen] = useState(false);
  // Fixed when the sheet opens, so its content does not change while it slides away.
  const [session, setSession] = useState({ id: 0, firstList: false });

  // The hearts get stable actions, so a change in the wishes does not redraw every card of a set.
  const latest = useRef({ wishlist, requireAccount });
  useLayoutEffect(() => {
    latest.current = { wishlist, requireAccount };
  });

  const show = useCallback((next: WishCard) => {
    setCard(next);
    setSession((current) => ({ id: current.id + 1, firstList: latest.current.wishlist.wishlists.length === 0 }));
    setOpen(true);
  }, []);

  const picker = useMemo<WishPicker>(
    () => ({
      toggle: (next) => {
        const { wishlist: current, requireAccount: require } = latest.current;
        if (current.isWished(next.id)) {
          removeWish(next.id);
          showToast(t('wishlist.removed'));
          return;
        }
        require(() => {
          if (current.defaultWishlist) addWish(next.id, next.setId, current.defaultWishlist.id);
          show(next);
        });
      },
      choose: (next) => latest.current.requireAccount(() => show(next)),
    }),
    [addWish, removeWish, show, showToast, t],
  );

  return (
    <PickerContext.Provider value={picker}>
      {children}
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={session.firstList ? t('wishlist.firstListTitle') : t('wishlist.saveTo')}
        subtitle={card?.name}>
        {card && (
          <PickerContent
            // A fresh form each time the sheet opens.
            key={session.id}
            card={card}
            firstList={session.firstList}
            onDone={(message) => {
              setOpen(false);
              if (message) showToast(message);
            }}
          />
        )}
      </Sheet>
      <Toast toast={toast} />
    </PickerContext.Provider>
  );
}

function PickerContent({
  card,
  firstList,
  onDone,
}: {
  card: WishCard;
  firstList: boolean;
  onDone: (message?: string) => void;
}) {
  const { t } = useTranslation();
  const { wishlists, wishes, wishOf } = useWishlist();
  const { addWish, createWishlist, removeWish } = useWishlistActions();
  const [creating, setCreating] = useState(firstList);
  const [name, setName] = useState('');
  const current = wishOf(card.id);
  const cleanName = cleanWishlistName(name);

  const countOf = (wishlistId: string) => wishes.filter((wish) => wish.wishlistId === wishlistId).length;

  const create = () => {
    if (!cleanName) return;
    const id = createWishlist(cleanName);
    addWish(card.id, card.setId, id);
    onDone(t('wishlist.savedTo', { name: cleanName }));
  };

  return (
    <View style={styles.content}>
      {firstList && (
        <Text variant="caption" tone="muted">
          {t('wishlist.firstListText')}
        </Text>
      )}

      {!firstList && (
        <View accessibilityRole="radiogroup" style={styles.lists}>
          {wishlists.map((list, index) => {
            const checked = current?.wishlistId === list.id;
            return (
              <Pressable
                key={list.id}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                accessibilityLabel={t('wishlist.listLabel', { name: list.name, count: countOf(list.id) })}
                onPress={() => {
                  addWish(card.id, card.setId, list.id);
                  onDone(t('wishlist.savedTo', { name: list.name }));
                }}
                style={({ pressed }) => [styles.row, index > 0 && styles.separator, pressed && styles.pressed]}>
                <View style={[styles.cover, checked && styles.coverChecked]}>
                  <HeartIcon color={checked ? colors.wish : colors.textMuted} size={18} filled={checked} />
                </View>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={checked ? styles.checkedName : undefined}>
                    {list.name}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {t('common.cards', { count: countOf(list.id) })}
                  </Text>
                </View>
                {checked && <CheckIcon color={colors.wish} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {creating ? (
        <View style={styles.form}>
          <TextField
            label={t('wishlist.nameLabel')}
            placeholder={t('wishlist.namePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            autoFocus={!firstList}
            maxLength={WISHLIST_NAME_MAX_LENGTH}
            returnKeyType="done"
            onSubmitEditing={create}
          />
          <Button label={t('wishlist.createAndSave')} disabled={!cleanName} onPress={create} />
          {firstList && <Button label={t('common.cancel')} variant="secondary" onPress={() => onDone()} />}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setCreating(true)}
          style={({ pressed }) => [styles.newList, pressed && styles.pressed]}>
          <View style={styles.plus}>
            <PlusIcon color={colors.wish} />
          </View>
          <Text style={styles.newListLabel}>{t('wishlist.newList')}</Text>
        </Pressable>
      )}

      {current && (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            removeWish(card.id);
            onDone(t('wishlist.removed'));
          }}
          style={styles.remove}>
          <Text variant="caption" tone="muted">
            {t('wishlist.remove')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** The heart actions, shared by every screen. */
export function useWishPicker(): WishPicker {
  const picker = useContext(PickerContext);
  if (!picker) throw new Error('useWishPicker must be used inside <WishPickerProvider>');
  return picker;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  lists: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cover: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  coverChecked: {
    backgroundColor: 'rgba(255, 107, 157, 0.14)',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  checkedName: {
    color: colors.wish,
    fontWeight: '600',
  },
  form: {
    gap: spacing.md,
  },
  newList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 107, 157, 0.45)',
  },
  plus: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
  newListLabel: {
    color: colors.wish,
    fontWeight: '600',
  },
  remove: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
