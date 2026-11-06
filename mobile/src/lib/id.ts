/** Unique local id, good enough as long as copies and wishlists never leave the phone. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
