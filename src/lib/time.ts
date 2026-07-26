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
  if (!Number.isFinite(totalSeconds)) return '00:00'
  // Truncated, so a stray fractional value can never render as '00:0.5'.
  const whole = Math.trunc(totalSeconds)
  const sign = whole < 0 ? '-' : ''
  const abs = Math.abs(whole)
  const minutes = Math.floor(abs / 60)
  const seconds = abs % 60
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Clamps a programmed duration into the settable range. */
export function clampDuration(ms: number): number {
  if (!Number.isFinite(ms)) return MIN_DURATION_MS
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(ms)))
}

export type TimerState = {
  remainingMs: number
  running: boolean
  overdue: boolean
  elapsedPastZeroMs: number
  /** Share of the programmed time still left, 0–1. */
  fractionRemaining: number
}

/**
 * Everything a panel needs, derived from a wall-clock deadline.
 *
 * Pure and separate from the hook so the zero crossing, restart-while-running
 * and duration-change-while-running paths can be tested exhaustively without
 * mounting React — this is the most safety-critical logic in the app.
 *
 * `overdue` uses `<= 0` so it turns on the instant `00:00` is displayed, which
 * is when the alarm must fire. `elapsedPastZeroMs` uses `< 0` so that at
 * exactly zero it is `0` rather than `-0`.
 */
export function deriveTimerState(
  durationMs: number,
  startedAt: number | null,
  now: number,
): TimerState {
  if (startedAt === null) {
    return {
      remainingMs: durationMs,
      running: false,
      overdue: false,
      elapsedPastZeroMs: 0,
      fractionRemaining: 1,
    }
  }

  const remainingMs = durationMs - (now - startedAt)
  const ratio = durationMs > 0 ? remainingMs / durationMs : 0
  return {
    remainingMs,
    running: true,
    overdue: remainingMs <= 0,
    elapsedPastZeroMs: remainingMs < 0 ? -remainingMs : 0,
    // A backwards device clock can push the ratio above 1; clamping keeps the
    // progress bar a valid width rather than emitting `width: 137%`.
    fractionRemaining: Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0,
  }
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
