import { useEffect, useState } from 'react'

export type WakeLockStatus = {
  /** False where the browser has no Screen Wake Lock API at all. */
  supported: boolean
  /** True while a lock is actually held, not merely requested. */
  active: boolean
}

/**
 * Holds the screen awake while `enabled`.
 *
 * The sentinel is released by the browser whenever the tab is hidden, so it has
 * to be re-requested on every return to visible — otherwise the screen stays
 * awake until the first time someone switches away, and then never again.
 */
export function useWakeLock(enabled: boolean): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!supported || !enabled) {
      setActive(false)
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const release = () => {
      if (sentinel) {
        void sentinel.release().catch(() => {
          // Already released by the browser; nothing to do.
        })
        sentinel = null
      }
      setActive(false)
    }

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || sentinel) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release().catch(() => {})
          sentinel = null
          return
        }
        setActive(true)
        // Fires when the browser drops the lock on its own.
        sentinel.addEventListener('release', () => {
          sentinel = null
          setActive(false)
        })
      } catch {
        // Denied — typically a hidden document or a battery-saver policy.
        setActive(false)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      release()
    }
  }, [enabled, supported])

  return { supported, active }
}
