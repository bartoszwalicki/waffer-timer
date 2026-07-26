import { describe, expect, it } from 'vitest'
import { deriveTimerState, displaySeconds, formatMMSS } from './time'

const START = 1_000_000
/** What the panel would show at `now`. */
const shown = (durationMs: number, startedAt: number | null, now: number) =>
  formatMMSS(displaySeconds(deriveTimerState(durationMs, startedAt, now).remainingMs))

describe('deriveTimerState while idle', () => {
  it('shows the programmed value and a full bar, with no alarm state', () => {
    const state = deriveTimerState(210_000, null, START)
    expect(state).toEqual({
      remainingMs: 210_000,
      running: false,
      overdue: false,
      elapsedPastZeroMs: 0,
      fractionRemaining: 1,
    })
  })

  it('never reports overdue when idle, whatever the clock says', () => {
    expect(deriveTimerState(210_000, null, START + 10_000_000).overdue).toBe(false)
  })
})

describe('deriveTimerState zero crossing', () => {
  it('turns overdue on at exactly zero, when 00:00 is first displayed', () => {
    const justBefore = deriveTimerState(5000, START, START + 4999)
    expect(justBefore.overdue).toBe(false)
    expect(formatMMSS(displaySeconds(justBefore.remainingMs))).toBe('00:01')

    const atZero = deriveTimerState(5000, START, START + 5000)
    expect(atZero.overdue).toBe(true)
    expect(formatMMSS(displaySeconds(atZero.remainingMs))).toBe('00:00')
  })

  it('reports elapsedPastZeroMs as 0 at exactly zero, not -0', () => {
    const atZero = deriveTimerState(5000, START, START + 5000)
    expect(atZero.elapsedPastZeroMs).toBe(0)
    // -0 would pass toBe(0); this pins the sign.
    expect(Object.is(atZero.elapsedPastZeroMs, -0)).toBe(false)
  })

  it('accumulates elapsedPastZeroMs once past zero', () => {
    expect(deriveTimerState(5000, START, START + 5001).elapsedPastZeroMs).toBe(1)
    expect(deriveTimerState(5000, START, START + 20_000).elapsedPastZeroMs).toBe(15_000)
  })

  it('walks the display down one second at a time and never skips one', () => {
    // Sampled at the 200ms tick rate across the crossing, as the app does.
    const seen: string[] = []
    for (let t = 0; t <= 7000; t += 200) {
      const label = shown(5000, START, START + t)
      if (seen.at(-1) !== label) seen.push(label)
    }
    expect(seen).toEqual([
      '00:05',
      '00:04',
      '00:03',
      '00:02',
      '00:01',
      '00:00',
      '-00:01',
      '-00:02',
    ])
  })

  it('holds each displayed second for exactly five 200ms ticks', () => {
    const counts = new Map<string, number>()
    for (let t = 0; t < 5000; t += 200) {
      const label = shown(5000, START, START + t)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    expect([...counts.values()].every((n) => n === 5)).toBe(true)
  })
})

describe('deriveTimerState restart while running', () => {
  it('shows the full programmed value again on the first frame after restart', () => {
    // Overdue, then restarted: startedAt moves to the restart instant.
    expect(shown(210_000, START, START + 300_000)).toBe('-01:30')
    const restartAt = START + 300_000
    expect(shown(210_000, restartAt, restartAt)).toBe('03:30')
    expect(deriveTimerState(210_000, restartAt, restartAt).overdue).toBe(false)
    expect(deriveTimerState(210_000, restartAt, restartAt).fractionRemaining).toBe(1)
  })
})

describe('deriveTimerState duration change while running', () => {
  it('extends the run in progress, keeping the bar coherent', () => {
    const before = deriveTimerState(210_000, START, START + 180_000)
    expect(formatMMSS(displaySeconds(before.remainingMs))).toBe('00:30')

    const after = deriveTimerState(220_000, START, START + 180_000)
    expect(formatMMSS(displaySeconds(after.remainingMs))).toBe('00:40')
    expect(after.overdue).toBe(false)
    expect(after.fractionRemaining).toBeCloseTo(40 / 220, 5)
  })

  it('drops straight into overdue when trimmed below the elapsed time', () => {
    const trimmed = deriveTimerState(30_000, START, START + 180_000)
    expect(trimmed.overdue).toBe(true)
    expect(trimmed.elapsedPastZeroMs).toBe(150_000)
    expect(trimmed.fractionRemaining).toBe(0)
    expect(formatMMSS(displaySeconds(trimmed.remainingMs))).toBe('-02:30')
  })

  it('returns to baking when extended back above the elapsed time', () => {
    const extended = deriveTimerState(200_000, START, START + 180_000)
    expect(extended.overdue).toBe(false)
    expect(formatMMSS(displaySeconds(extended.remainingMs))).toBe('00:20')
    expect(extended.fractionRemaining).toBeGreaterThan(0)
  })
})

describe('deriveTimerState fractionRemaining', () => {
  it('stays within 0..1 even if the device clock jumps backwards', () => {
    // now < startedAt makes remainingMs exceed durationMs.
    const backwards = deriveTimerState(210_000, START, START - 60_000)
    expect(backwards.fractionRemaining).toBe(1)
    expect(backwards.overdue).toBe(false)
  })

  it('is 0, not NaN, if a zero duration ever reaches it', () => {
    const zero = deriveTimerState(0, START, START + 1000)
    expect(zero.fractionRemaining).toBe(0)
    expect(Number.isNaN(zero.fractionRemaining)).toBe(false)
    expect(zero.overdue).toBe(true)
  })
})

describe('the display label length, which drives the digit font size', () => {
  it('grows past six characters, which is why sizing cannot assume a fixed width', () => {
    expect(formatMMSS(displaySeconds(-5_999_000)).length).toBe(6) // -99:59
    expect(formatMMSS(displaySeconds(-6_000_000)).length).toBe(7) // -100:00
  })
})
