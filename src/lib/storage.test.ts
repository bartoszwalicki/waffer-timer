import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  MAX_NAME_LENGTH,
  parseSettings,
  saveSettings,
  STORAGE_KEY,
} from './storage'
import { MAX_DURATION_MS, MIN_DURATION_MS } from './time'

describe('parseSettings', () => {
  it('falls back to defaults for anything that is not an object', () => {
    for (const input of [undefined, null, 'nope', 42, [], true]) {
      expect(parseSettings(input)).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('fills in every missing field', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps good fields and replaces only the bad ones', () => {
    const result = parseSettings({
      timers: [{ name: 'Thin', durationMs: 120_000 }],
      theme: 'nonsense',
      wakeLock: 'yes',
      beepDurationMs: 999,
      stepSeconds: 10,
    })
    expect(result.timers[0]).toEqual({ name: 'Thin', durationMs: 120_000 })
    // A one-element array must still yield two timers.
    expect(result.timers[1]).toEqual(DEFAULT_SETTINGS.timers[1])
    expect(result.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(result.wakeLock).toBe(DEFAULT_SETTINGS.wakeLock)
    // 999 is not one of the offered choices.
    expect(result.beepDurationMs).toBe(DEFAULT_SETTINGS.beepDurationMs)
    expect(result.stepSeconds).toBe(10)
  })

  it('clamps stored durations that are out of range', () => {
    const result = parseSettings({
      timers: [{ durationMs: -1 }, { durationMs: MAX_DURATION_MS * 10 }],
    })
    expect(result.timers[0].durationMs).toBe(MIN_DURATION_MS)
    expect(result.timers[1].durationMs).toBe(MAX_DURATION_MS)
  })

  it('truncates over-long names and rejects blank ones', () => {
    const result = parseSettings({
      timers: [{ name: 'x'.repeat(50) }, { name: '   ' }],
    })
    expect(result.timers[0].name).toHaveLength(MAX_NAME_LENGTH)
    expect(result.timers[1].name).toBe(DEFAULT_SETTINGS.timers[1].name)
  })

  it('accepts both themes', () => {
    expect(parseSettings({ theme: 'light' }).theme).toBe('light')
    expect(parseSettings({ theme: 'dark' }).theme).toBe('dark')
  })
})

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults for corrupt JSON rather than throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips a saved value', () => {
    const settings = { ...DEFAULT_SETTINGS, theme: 'light' as const, stepSeconds: 30 }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })
})

describe('index.html pre-paint theme script', () => {
  it('reads the same storage key this module owns', () => {
    // The inline script in index.html duplicates the key by necessity — it has
    // to run before any module loads. This is what stops the two desyncing.
    // process.cwd(), not import.meta.url: under happy-dom the module URL is
    // http:, which readFileSync rejects.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain(`'${STORAGE_KEY}'`)
  })
})
