import type { CSSProperties } from 'react'
import { useHoldRepeat } from '../hooks/useHoldRepeat'
import type { Timer } from '../hooks/useTimer'
import { displaySeconds, formatMMSS } from '../lib/time'

/**
 * Every class name is written out in full. Tailwind resolves classes by
 * scanning source text, so a constructed `text-machine-${n}` would compile in
 * dev and then be missing from the production CSS.
 */
const ACCENTS = {
  1: {
    text: 'text-machine-1',
    border: 'border-machine-1',
    fill: 'bg-machine-1',
    glow: 'shadow-[0_0_60px_-15px_var(--color-machine-1)]',
  },
  2: {
    text: 'text-machine-2',
    border: 'border-machine-2',
    fill: 'bg-machine-2',
    glow: 'shadow-[0_0_60px_-15px_var(--color-machine-2)]',
  },
} as const

export type TimerPanelProps = {
  accent: 1 | 2
  name: string
  timer: Timer
  stepSeconds: number
  onStepDuration: (deltaMs: number) => void
}

export function TimerPanel({ accent, name, timer, stepSeconds, onStepDuration }: TimerPanelProps) {
  const { remainingMs, running, overdue, durationMs, fractionRemaining, start, reset } = timer
  const colors = ACCENTS[accent]

  const stepDown = useHoldRepeat(() => onStepDuration(-stepSeconds * 1000))
  const stepUp = useHoldRepeat(() => onStepDuration(stepSeconds * 1000))

  const seconds = displaySeconds(remainingMs)
  const label = formatMMSS(seconds)

  return (
    <section
      aria-label={name}
      className={`panel flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border-4 p-3 transition-colors duration-300 sm:gap-4 sm:p-4 ${
        overdue
          ? 'animate-overdue border-overdue'
          : `bg-panel ${colors.border} ${running ? colors.glow : ''}`
      }`}
    >
      {/* The name keeps its machine colour even while overdue. Turning the whole
          panel red otherwise made both machines identical in the one state where
          knowing which is which matters most. */}
      <h2
        className={`shrink-0 truncate text-center text-xl font-bold tracking-[0.2em] uppercase sm:text-2xl ${colors.text}`}
      >
        {name}
      </h2>

      {/* The whole face is the primary control: one tap starts or restarts. */}
      <button
        type="button"
        onClick={start}
        aria-label={`${name}: ${
          overdue ? `overdue by ${formatMMSS(Math.abs(seconds))}` : `${label} remaining`
        }. Tap to restart.`}
        className="flex min-h-0 flex-3 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-0 bg-transparent p-0 active:scale-[0.98] motion-safe:transition-transform"
      >
        {/* The label is not a fixed width — a timer left running reaches
            '-100:00' — so the font size has to know how many characters it is
            sizing. See the .digits rule. */}
        <span
          className={`digits block ${overdue ? 'text-overdue-ink' : colors.text}`}
          style={{ '--digit-chars': Math.max(6, label.length) } as CSSProperties}
        >
          {label}
        </span>
        <span
          className={`text-base font-semibold tracking-widest uppercase sm:text-lg ${
            overdue ? 'text-overdue-ink' : 'text-ink-dim'
          }`}
        >
          {overdue ? 'overdue' : running ? 'baking' : 'ready'}
          {/* While running the digits show the countdown, so the programmed
              value has to stay visible somewhere. Idle, they are the same
              number and repeating it is just noise. */}
          {running && (
            <>
              <span className="mx-2 opacity-40">•</span>
              set {formatMMSS(displaySeconds(durationMs))}
            </>
          )}
        </span>
      </button>

      {/* Readable from across the table without focusing on the digits: how
          much is left, as a shape. The digits already carry the number, so
          this is decorative to a screen reader. */}
      {/* Full-opacity track, not bg-line/50: at half opacity the light-theme
          fill only reached 2.6:1 against it, under the 3:1 floor for a
          graphical indicator with no text equivalent. */}
      <div aria-hidden="true" className="h-4 shrink-0 overflow-hidden rounded-full bg-line sm:h-5">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            overdue ? 'bg-overdue' : colors.fill
          }`}
          style={{ width: `${fractionRemaining * 100}%` }}
        />
      </div>

      {/* flex-2 against the face's flex-3: the buttons grow to fill the panel
          rather than leaving dead space, which makes them enormous targets. */}
      <div className="grid min-h-0 flex-2 grid-cols-2 grid-rows-2 gap-2 sm:gap-3">
        <button
          type="button"
          {...stepDown}
          aria-label={`Decrease ${name} by ${stepSeconds} seconds`}
          className="min-h-[3.25rem] rounded-2xl border-2 border-line bg-raised text-2xl font-bold text-ink active:bg-line sm:text-3xl"
        >
          −{stepSeconds}s
        </button>
        <button
          type="button"
          {...stepUp}
          aria-label={`Increase ${name} by ${stepSeconds} seconds`}
          className="min-h-[3.25rem] rounded-2xl border-2 border-line bg-raised text-2xl font-bold text-ink active:bg-line sm:text-3xl"
        >
          +{stepSeconds}s
        </button>

        {/* Named per machine: without this the page exposes two identical
            "Reset" and "Start" buttons. */}
        <button
          type="button"
          onClick={reset}
          aria-label={`Reset ${name}`}
          className="min-h-[3.25rem] rounded-2xl border-2 border-line bg-raised text-2xl font-extrabold tracking-widest text-ink uppercase active:bg-line sm:text-4xl"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={start}
          aria-label={`Start ${name}`}
          className={`min-h-[3.25rem] rounded-2xl text-2xl font-extrabold tracking-widest text-on-accent uppercase active:brightness-90 sm:text-4xl ${colors.fill}`}
        >
          Start
        </button>
      </div>
    </section>
  )
}
