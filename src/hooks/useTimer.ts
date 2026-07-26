import { useCallback, useEffect, useState } from 'react'

/** How often the display refreshes. Fast enough that no second is ever skipped. */
const TICK_MS = 200

export type Timer = {
  /** Programmed target, in ms. */
  durationMs: number
  /** Negative once overdue. */
  remainingMs: number
  running: boolean
  /** True from the moment remainingMs goes non-positive until reset. */
  overdue: boolean
  /** ms since the timer hit zero, or 0 while it has not. */
  elapsedPastZeroMs: number
  /** Resets to the programmed value and runs. Valid from any state. */
  start: () => void
  /** Returns to the programmed value and stops. Silences the alarm. */
  reset: () => void
}

/**
 * A single machine's countdown.
 *
 * Remaining time is always *derived* from a wall-clock deadline rather than
 * accumulated per tick. Tablet browsers throttle timers hard in background
 * tabs, so an accumulating counter would drift or stall; a derived one cannot.
 * The interval exists only to trigger re-renders.
 */
export function useTimer(durationMs: number): Timer {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const start = useCallback(() => {
    const t = Date.now()
    setStartedAt(t)
    setNow(t)
  }, [])

  const reset = useCallback(() => {
    setStartedAt(null)
    setNow(Date.now())
  }, [])

  // Only tick while running — an idle panel does no work.
  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [startedAt])

  // Returning from a backgrounded tab, snap straight to the truth rather than
  // waiting up to a throttled interval for the next tick.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Deriving from the live durationMs means a stepper tap adjusts the run in
  // progress, not just the next one: "this batch needs another 10 seconds" is
  // a normal call to make mid-bake, and the panel keeps showing the programmed
  // value alongside so the two are never confused. Trimming below the time
  // already elapsed drops straight into overdue, which is the honest answer.
  const running = startedAt !== null
  const remainingMs = running ? durationMs - (now - startedAt) : durationMs

  return {
    durationMs,
    remainingMs,
    running,
    overdue: running && remainingMs <= 0,
    elapsedPastZeroMs: running && remainingMs < 0 ? -remainingMs : 0,
    start,
    reset,
  }
}
