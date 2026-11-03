import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';
import { colors, radius, spacing } from './theme';

const TOAST_DURATION_MS = 2500;

interface ToastContent {
  id: number;
  message: string;
}

/** Holds the message of a toast and hides it after a moment. A new message restarts the delay. */
export function useToast() {
  const [toast, setToast] = useState<ToastContent>();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  return { toast, showToast };
}

/** Short confirmation over the bottom of the screen. It lets touches through, so it never blocks the screen. */
export function Toast({ toast }: { toast: ToastContent | undefined }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + spacing.lg }]}>
      {toast && (
        <Animated.View
          key={toast.id}
          accessibilityLiveRegion="polite"
          entering={FadeInDown.springify().damping(16)}
          exiting={FadeOut}
          style={styles.toast}>
          <Text variant="caption" style={{ color: colors.success }}>
            ✓ {toast.message}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.surfaceRaised,
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
  },
});
