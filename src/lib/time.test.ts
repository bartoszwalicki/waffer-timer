import { describe, expect, it } from 'vitest'
import {
  clampDuration,
  displaySeconds,
  formatMMSS,
  MAX_DURATION_MS,
  MIN_DURATION_MS,
  stepDuration,
} from './time'

describe('formatMMSS', () => {
  it('zero-pads both fields', () => {
    expect(formatMMSS(0)).toBe('00:00')
    expect(formatMMSS(9)).toBe('00:09')
    expect(formatMMSS(210)).toBe('03:30')
  })

  it('prefixes overdue times with a minus', () => {
    expect(formatMMSS(-1)).toBe('-00:01')
    expect(formatMMSS(-65)).toBe('-01:05')
  })

  it('lets minutes run past 99 rather than wrapping', () => {
    expect(formatMMSS(6000)).toBe('100:00')
    expect(formatMMSS(-6000)).toBe('-100:00')
  })
})

describe('displaySeconds', () => {
  it('shows the full programmed value on the first frame of a run', () => {
    // Not 03:29 — ceil is what makes a fresh 3:30 read as 3:30.
    expect(formatMMSS(displaySeconds(210_000))).toBe('03:30')
    expect(formatMMSS(displaySeconds(209_999))).toBe('03:30')
  })

  it('counts the final second down as 00:01, reaching 00:00 exactly at zero', () => {
    expect(formatMMSS(displaySeconds(1000))).toBe('00:01')
    expect(formatMMSS(displaySeconds(500))).toBe('00:01')
    expect(formatMMSS(displaySeconds(1))).toBe('00:01')
    expect(formatMMSS(displaySeconds(0))).toBe('00:00')
  })

  it('holds 00:00 for the first second past zero, never showing -00:00', () => {
    // ceil of a small negative is -0, which must not print as "-00:00".
    expect(formatMMSS(displaySeconds(-1))).toBe('00:00')
    expect(formatMMSS(displaySeconds(-500))).toBe('00:00')
    expect(formatMMSS(displaySeconds(-999))).toBe('00:00')
  })

  it('starts counting overdue a full second after zero', () => {
    expect(formatMMSS(displaySeconds(-1000))).toBe('-00:01')
    expect(formatMMSS(displaySeconds(-1999))).toBe('-00:01')
    expect(formatMMSS(displaySeconds(-2000))).toBe('-00:02')
    expect(formatMMSS(displaySeconds(-65_000))).toBe('-01:05')
  })
})

describe('clampDuration', () => {
  it('holds the settable range at both ends', () => {
    expect(clampDuration(0)).toBe(MIN_DURATION_MS)
    expect(clampDuration(-5000)).toBe(MIN_DURATION_MS)
    expect(clampDuration(MAX_DURATION_MS + 1000)).toBe(MAX_DURATION_MS)
    expect(clampDuration(MAX_DURATION_MS)).toBe(MAX_DURATION_MS)
  })

  it('passes values inside the range through, rounded', () => {
    expect(clampDuration(210_000)).toBe(210_000)
    expect(clampDuration(210_000.6)).toBe(210_001)
  })

  it('falls back to the minimum for non-finite input', () => {
    expect(clampDuration(Number.NaN)).toBe(MIN_DURATION_MS)
    expect(clampDuration(Number.POSITIVE_INFINITY)).toBe(MIN_DURATION_MS)
  })
})

describe('stepDuration', () => {
  it('steps by whole increments from an aligned value', () => {
    expect(stepDuration(210_000, 10_000)).toBe(220_000)
    expect(stepDuration(210_000, -10_000)).toBe(200_000)
  })

  it('snaps a misaligned value onto the grid in the direction of travel', () => {
    // 03:05 stepped by a minute gives 03:00 / 04:00, not 02:05 / 04:05.
    expect(stepDuration(185_000, 60_000)).toBe(240_000)
    expect(stepDuration(185_000, -60_000)).toBe(180_000)
  })

  it('clamps instead of running past either end', () => {
    expect(stepDuration(MIN_DURATION_MS, -10_000)).toBe(MIN_DURATION_MS)
    expect(stepDuration(MAX_DURATION_MS, 10_000)).toBe(MAX_DURATION_MS)
  })

  it('treats a zero delta as a no-op', () => {
    expect(stepDuration(210_000, 0)).toBe(210_000)
  })
})
