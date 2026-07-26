import { useEffect, useRef } from 'react'
import { alarmCycleSeconds, playAlarm, vibrate, type Voice } from '../lib/audio'
import type { Timer } from './useTimer'

/** Gap between the end of one alarm cycle and the start of the next. */
const REPEAT_GAP_MS = 900

/**
 * Sounds a machine's alarm from 00:00 until `beepDurationMs` has passed, then
 * falls silent while the panel keeps counting overdue.
 *
 * The alarm window is measured from the moment the *alarm* started, not from
 * the timer's zero crossing. Those differ: `elapsedPastZeroMs` is derived from
 * the programmed duration, so trimming a running timer below its elapsed time
 * rewrites the moment of zero retroactively and would land the first frame
 * already past the window — silently skipping the alarm entirely.
 *
 * Keying off the `overdue` edge instead means every transition into overdue
 * alarms exactly once, for the configured duration, however it was reached.
 */
export function useAlarm(timer: Timer, voice: Voice, beepDurationMs: number): void {
  const { overdue } = timer
  // Read through a ref so changing the setting mid-alarm does not restart it.
  const windowMs = useRef(beepDurationMs)
  windowMs.current = beepDurationMs

  useEffect(() => {
    if (!overdue) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    // performance.now(), not Date.now(): monotonic, so a backwards NTP step
    // cannot make the elapsed time negative and leave the alarm sounding until
    // the wall clock catches up. The countdown itself needs the opposite
    // trade-off and deliberately uses Date.now() — see useTimer.
    const startedAt = performance.now()

    const cycle = () => {
      if (cancelled) return
      if (performance.now() - startedAt >= windowMs.current) return

      playAlarm(voice)
      vibrate(voice)
      timeoutId = setTimeout(cycle, alarmCycleSeconds(voice) * 1000 + REPEAT_GAP_MS)
    }
    cycle()

    // Runs on reset, on restart, and on unmount — every way out of overdue.
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [overdue, voice])
}
