/**
 * Collision-resistant id generator.
 *
 * `crypto.randomUUID` is not available on all React Native runtimes, so this
 * combines a timestamp with randomness — enough for local, single-device ids.
 */
export function createId(prefix = ''): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${time}${random}`;
}
