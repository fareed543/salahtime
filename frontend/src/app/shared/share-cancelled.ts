/**
 * True when a share failed only because the user closed the share sheet:
 * the Web Share API rejects with AbortError, Capacitor Share with "Share canceled".
 */
export function isShareCancelled(error: unknown): boolean {
  const failure = error as { name?: string; message?: string } | null;
  return failure?.name === 'AbortError' || /cancel/i.test(failure?.message ?? '');
}
