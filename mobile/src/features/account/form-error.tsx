import { Text, colors } from '@/ui';

/** The reason a form failed, announced by screen readers. Shows nothing when there is no error. */
export function FormError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <Text variant="caption" accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
      {message}
    </Text>
  );
}
