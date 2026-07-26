import { useCallback, useEffect, useState } from 'react'
import { loadSettings, saveSettings, type Settings } from '../lib/storage'

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

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const updateTimer = useCallback(
    (index: 0 | 1, patch: Partial<Settings['timers'][number]>) => {
      setSettings((current) => {
        const timers: Settings['timers'] = [...current.timers]
        timers[index] = { ...timers[index], ...patch }
        return { ...current, timers }
      })
    },
    [],
  )

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  return { settings, update, updateTimer }
}
