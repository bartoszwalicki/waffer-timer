import { clampDuration } from './time'

/**
 * Everything the app persists, under one key.
 *
 * Keep this key in sync with the pre-paint theme script in index.html —
 * storage.test.ts asserts that file still contains this exact string.
 */
export const STORAGE_KEY = 'waffer-timer:v1'

export type Theme = 'dark' | 'light'

export type TimerSettings = {
  name: string
  durationMs: number
}

export type Settings = {
  timers: [TimerSettings, TimerSettings]
  theme: Theme
  wakeLock: boolean
  beepDurationMs: number
  stepSeconds: number
}

export const DEFAULT_SETTINGS: Settings = {
  timers: [
    { name: 'Waffle 1', durationMs: 3 * 60 * 1000 },
    { name: 'Waffle 2', durationMs: 3 * 60 * 1000 + 30 * 1000 },
  ],
  theme: 'dark',
  wakeLock: true,
  beepDurationMs: 15 * 1000,
  stepSeconds: 10,
}

export const BEEP_DURATION_CHOICES_MS = [5_000, 10_000, 15_000, 30_000, 60_000]
export const STEP_SECONDS_CHOICES = [5, 10, 15, 30]
export const MAX_NAME_LENGTH = 14

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Trims, then truncates by code point rather than code unit — a plain
 * `slice` would cut an emoji in half and leave a lone surrogate rendering
 * as a replacement character.
 */
export function normaliseName(raw: string): string {
  return Array.from(raw.trim()).slice(0, MAX_NAME_LENGTH).join('')
}

/**
 * The name to show for a machine, falling back to the default when the
 * operator has cleared the field or typed only spaces. Needed because the
 * settings input is live-bound: the stored value is whatever is in the box
 * right now, including nothing.
 */
export function displayName(settings: Settings, index: 0 | 1): string {
  return settings.timers[index].name.trim() || DEFAULT_SETTINGS.timers[index].name
}

function pickTimer(raw: unknown, fallback: TimerSettings): TimerSettings {
  if (!isRecord(raw)) return fallback
  const name = typeof raw.name === 'string' ? normaliseName(raw.name) : ''
  const durationMs =
    typeof raw.durationMs === 'number' ? clampDuration(raw.durationMs) : fallback.durationMs
  return { name: name === '' ? fallback.name : name, durationMs }
}

function pickFromChoices(raw: unknown, choices: number[], fallback: number): number {
  return typeof raw === 'number' && choices.includes(raw) ? raw : fallback
}

/**
 * Merges stored values over the defaults, field by field. Anything missing,
 * corrupt, or of the wrong type falls back rather than propagating — a bad
 * write must never leave the station staring at a blank screen.
 */
export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULT_SETTINGS

  const timers = Array.isArray(raw.timers) ? raw.timers : []

  return {
    timers: [
      pickTimer(timers[0], DEFAULT_SETTINGS.timers[0]),
      pickTimer(timers[1], DEFAULT_SETTINGS.timers[1]),
    ],
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : DEFAULT_SETTINGS.theme,
    wakeLock: typeof raw.wakeLock === 'boolean' ? raw.wakeLock : DEFAULT_SETTINGS.wakeLock,
    beepDurationMs: pickFromChoices(
      raw.beepDurationMs,
      BEEP_DURATION_CHOICES_MS,
      DEFAULT_SETTINGS.beepDurationMs,
    ),
    stepSeconds: pickFromChoices(
      raw.stepSeconds,
      STEP_SECONDS_CHOICES,
      DEFAULT_SETTINGS.stepSeconds,
    ),
  }
}

/** The theme to use before the operator has ever picked one. */
export function osTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/**
 * Loads settings, falling back to the OS colour preference until the operator
 * chooses a theme.
 *
 * This has to agree with the pre-paint script in index.html, which applies the
 * same rule before React boots. If this returned a hardcoded dark default
 * instead, a light-preference tablet would paint light and then snap to dark.
 */
export function loadSettings(): Settings {
  const withOsTheme = (settings: Settings): Settings => ({ ...settings, theme: osTheme() })

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return withOsTheme(DEFAULT_SETTINGS)

    const raw: unknown = JSON.parse(stored)
    const parsed = parseSettings(raw)
    const themeWasChosen = isRecord(raw) && (raw.theme === 'light' || raw.theme === 'dark')
    return themeWasChosen ? parsed : withOsTheme(parsed)
  } catch {
    // Corrupt JSON, or storage blocked entirely (private browsing).
    return withOsTheme(DEFAULT_SETTINGS)
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or blocked. The app stays usable for this session; losing
    // a persisted preference is not worth interrupting service over.
  }
}
