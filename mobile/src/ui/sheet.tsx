import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';
import { colors, radius, spacing } from './theme';

const CLOSE_DURATION_MS = 200;
const OPEN_SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** A short line under the title. */
  subtitle?: string;
  children: ReactNode;
}

/** Height of the keyboard while it is open, so the sheet can sit above it. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * Panel that slides up from the bottom of the screen over a dimmed backdrop. Touching the backdrop or the back button
 * closes it. It stays mounted while it slides away, so closing is animated too.
 */
export function Sheet({ visible, onClose, title, subtitle, children }: SheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  // Mounted as soon as it must show, and unmounted only once it has slid away.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(withSpring(1, OPEN_SPRING));
      return;
    }
    progress.set(withTiming(0, { duration: CLOSE_DURATION_MS, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(() => setMounted(false), CLOSE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * screenHeight * 0.6 }],
  }));

  return (
    <Modal visible={mounted} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            { maxHeight: screenHeight * 0.85 - keyboardHeight, marginBottom: keyboardHeight },
            { paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + spacing.lg },
            panelStyle,
          ]}>
          <View style={styles.handle} />
          {(title || subtitle) && (
            <View style={styles.header}>
              {title && <Text variant="title">{title}</Text>}
              {subtitle && (
                <Text variant="caption" tone="muted">
                  {subtitle}
                </Text>
              )}
            </View>
          )}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: '0 -12px 32px rgba(0, 0, 0, 0.45)',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: spacing.md,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
