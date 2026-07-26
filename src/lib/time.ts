/** Longest programmable time: 99:59. */
export const MAX_DURATION_MS = (99 * 60 + 59) * 1000

/** Shortest programmable time. Below this a stepper tap is more likely a slip. */
export const MIN_DURATION_MS = 5 * 1000

/**
 * Seconds to show for a given remaining time.
 *
 * `Math.ceil` is deliberately used for both signs, which gives one rule for
 * the whole timeline: a fresh 3:30 reads `03:30` rather than `03:29`, and
 * `-00:01` appears a full second after zero rather than instantly.
 */
export function displaySeconds(remainingMs: number): number {
  return Math.ceil(remainingMs / 1000)
}

/**
 * Formats seconds as `mm:ss`, negative values prefixed with `-`.
 * Minutes are allowed past 99 so a forgotten waffle still reads correctly.
 */
export function formatMMSS(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : ''
  const abs = Math.abs(totalSeconds)
  const minutes = Math.floor(abs / 60)
  const seconds = abs % 60
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Clamps a programmed duration into the settable range. */
export function clampDuration(ms: number): number {
  if (!Number.isFinite(ms)) return MIN_DURATION_MS
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(ms)))
}

/**
 * Snaps to the nearest multiple of `stepMs` in the direction of travel, so
 * stepping 03:05 by a minute gives 03:00 / 04:00 rather than 02:05 / 04:05.
 */
export function stepDuration(currentMs: number, deltaMs: number): number {
  const step = Math.abs(deltaMs)
  if (step === 0) return clampDuration(currentMs)
  const next =
    deltaMs > 0
      ? Math.floor(currentMs / step) * step + step
      : Math.ceil(currentMs / step) * step - step
  return clampDuration(next)
}
