import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSettings, saveSettings, type Settings } from '../lib/storage'
import { clampDuration } from '../lib/time'

export type UseSettings = {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /** Patches one machine's settings by index without disturbing the other. */
  updateTimer: (index: 0 | 1, patch: Partial<Settings['timers'][number]>) => void
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

  useEffect(() => {
    if (!touched.current) return
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  return { settings, update, updateTimer }
}
