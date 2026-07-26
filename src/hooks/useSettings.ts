import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSettings, saveSettings, type Settings } from '../lib/storage'
import { clampDuration, stepDuration } from '../lib/time'

/** Must match --color-surface for each theme in index.css. */
const THEME_COLORS: Record<Settings['theme'], string> = {
  dark: '#0a0e13',
  light: '#e8edf3',
}

export type UseSettings = {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /** Patches one machine's settings by index without disturbing the other. */
  updateTimer: (index: 0 | 1, patch: Partial<Settings['timers'][number]>) => void
  /** Steps one machine's duration by `deltaMs`, snapping onto the step grid. */
  stepTimerDuration: (index: 0 | 1, deltaMs: number) => void
}

/**
 * Settings state, written straight back to localStorage on every change.
 *
 * Writes are not debounced: hold-to-repeat on a stepper produces at most a few
 * per second, and a small synchronous localStorage write at that rate is far
 * cheaper than the risk of losing a value if the tablet is killed mid-service.
 */
export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  // Nothing is persisted until the operator actually changes something, so an
  // untouched install keeps following the OS colour preference instead of
  // freezing whatever theme it happened to boot with.
  const touched = useRef(false)

  const update = useCallback((patch: Partial<Settings>) => {
    touched.current = true
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const updateTimer = useCallback(
    (index: 0 | 1, patch: Partial<Settings['timers'][number]>) => {
      touched.current = true
      setSettings((current) => {
        const timers: Settings['timers'] = [...current.timers]
        timers[index] = {
          ...timers[index],
          ...patch,
          // Clamped here rather than trusting callers: an out-of-range duration
          // reaches the panel as a divide-by-zero in the progress bar.
          ...(patch.durationMs === undefined
            ? {}
            : { durationMs: clampDuration(patch.durationMs) }),
        }
        return { ...current, timers }
      })
    },
    [],
  )

  // The arithmetic happens inside the updater, reading `current` rather than a
  // value captured at render time. Steps that arrive faster than React can
  // re-render therefore accumulate instead of all computing the same result
  // from the same stale duration and collapsing into one.
  const stepTimerDuration = useCallback((index: 0 | 1, deltaMs: number) => {
    touched.current = true
    setSettings((current) => {
      const timers: Settings['timers'] = [...current.timers]
      timers[index] = {
        ...timers[index],
        durationMs: stepDuration(timers[index].durationMs, deltaMs),
      }
      return { ...current, timers }
    })
  }, [])

  useEffect(() => {
    if (!touched.current) return
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    // Keep the browser chrome, Android task switcher and splash screen in step
    // with the theme rather than stuck on the dark value from index.html.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[settings.theme])
  }, [settings.theme])

  return { settings, update, updateTimer, stepTimerDuration }
}
