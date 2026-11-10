/** Unique id made on the phone. Two phones of the same account would need the same millisecond and random part to clash. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
