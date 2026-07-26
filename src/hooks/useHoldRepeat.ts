import { useCallback, useEffect, useRef } from 'react'

/** Pause before a hold starts repeating, so a normal tap fires exactly once. */
const INITIAL_DELAY_MS = 450
const START_INTERVAL_MS = 220
const MIN_INTERVAL_MS = 60
/** Each repeat shortens the gap, so a long hold covers minutes quickly. */
const ACCELERATION = 0.82

/**
 * Fires `action` on press, then repeatedly (and ever faster) while held.
 *
 * Without this, programming 00:30 up to 04:00 in 10-second steps is 21 taps.
 * Uses pointer events so it behaves identically for touch and mouse. A finger
 * dragged off the button stops the repeat via pointercancel — implicit pointer
 * capture means pointerleave does not fire for touch, so both are handled.
 */
export function useHoldRepeat(action: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef(START_INTERVAL_MS)
  const callback = useRef(action)
  callback.current = action

  const stop = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    intervalRef.current = START_INTERVAL_MS
  }, [])

  // A component unmounting mid-hold (e.g. opening settings) must not keep firing.
  useEffect(() => stop, [stop])

  // Belt and braces for the one case where no pointer event arrives to end the
  // hold: the tablet locking or the app being backgrounded with a finger down.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') stop()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [stop])

  const start = useCallback(() => {
    stop()
    callback.current()

    const scheduleNext = (delay: number) => {
      timeoutRef.current = setTimeout(() => {
        callback.current()
        intervalRef.current = Math.max(MIN_INTERVAL_MS, intervalRef.current * ACCELERATION)
        scheduleNext(intervalRef.current)
      }, delay)
    }
    scheduleNext(INITIAL_DELAY_MS)
  }, [stop])

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
  }
}
