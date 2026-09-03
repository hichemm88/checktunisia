/**
 * Sonde de diagnostic pour le pipeline MRZ local — désactivée par défaut.
 *
 * Contexte : plusieurs correctifs de vitesse/robustesse du scanner MRZ local
 * ont chacun été validés hors navigateur (Node), faute de pouvoir instrumenter
 * un vrai appareil. Sur le terrain, un cas a persisté (10+ s avant repli
 * vision, toujours sur la même photo) que ces vérifications ne pouvaient pas
 * expliquer — il fallait des données réelles, pas une hypothèse de plus.
 *
 * `setMrzDebugSink` permet à l'appelant (GuestScanPanel, derrière un drapeau
 * explicite — voir MRZ_DEBUG_PARAM) de capturer les mêmes messages que la
 * console pour les afficher à l'écran, copiables sans DevTools.
 */
export type MrzDebugSink = (line: string) => void;

let sink: MrzDebugSink | null = null;

export function setMrzDebugSink(next: MrzDebugSink | null): void {
  sink = next;
}

function format(args: unknown[]): string {
  return args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
}

export function dlog(...args: unknown[]): void {
  const line = format(args);
  console.log(line);
  sink?.(line);
}

export function dwarn(...args: unknown[]): void {
  const line = `⚠ ${format(args)}`;
  console.warn(line);
  sink?.(line);
}
