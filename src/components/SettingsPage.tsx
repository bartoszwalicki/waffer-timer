import { useEffect, useState, type ReactNode } from 'react'
import type { WakeLockStatus } from '../hooks/useWakeLock'
import {
  BEEP_DURATION_CHOICES_MS,
  DEFAULT_SETTINGS,
  displayName,
  MAX_NAME_LENGTH,
  STEP_SECONDS_CHOICES,
  type Settings,
} from '../lib/storage'
import { BackIcon } from './icons'
import { Switch } from './Switch'

export type SettingsPageProps = {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
  onUpdateTimer: (index: 0 | 1, patch: Partial<Settings['timers'][number]>) => void
  wakeLock: WakeLockStatus
  onClose: () => void
  /** Plays the machine's alarm so it can be picked out by ear before service. */
  onTestAlarm: (voice: 1 | 2) => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold tracking-[0.2em] text-ink-dim uppercase">{title}</h2>
      {children}
    </section>
  )
}

/**
 * A row of mutually exclusive choices. Preferred over a slider or a numeric
 * input: there is nothing to drag accurately and nothing to type.
 */
function ChoiceRow<T extends number>({
  label,
  value,
  choices,
  format,
  onChange,
}: {
  label: string
  value: T
  choices: readonly T[]
  format: (choice: T) => string
  onChange: (choice: T) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-raised p-4">
      <span className="text-2xl font-bold text-ink">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const selected = choice === value
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(choice)}
              className={`min-h-[3.75rem] min-w-[5.5rem] flex-1 rounded-xl border-2 text-2xl font-bold ${
                selected
                  ? 'border-machine-2 bg-machine-2 text-on-accent'
                  : 'border-line bg-panel text-ink active:bg-line'
              }`}
            >
              {format(choice)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SettingsPage({
  settings,
  onUpdate,
  onUpdateTimer,
  wakeLock,
  onClose,
  onTestAlarm,
}: SettingsPageProps) {
  const [confirmingReset, setConfirmingReset] = useState(false)

  // Disarm on its own, so a half-pressed reset cannot lie in wait for whoever
  // opens settings next.
  useEffect(() => {
    if (!confirmingReset) return
    const id = setTimeout(() => setConfirmingReset(false), 4000)
    return () => clearTimeout(id)
  }, [confirmingReset])

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {/* Sticky: on the viewports where this page has to scroll, a static
          header took the only way out off-screen with it. */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-4 bg-surface pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to timers"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-raised text-ink active:bg-line"
        >
          <BackIcon />
        </button>
        <h1 className="text-3xl font-bold tracking-wide text-ink">Settings</h1>
      </header>

      {/* Two columns in landscape so every setting is reachable without
          scrolling on a mounted tablet; overflow-y-auto is the safety net.
          Two independent flex columns rather than a grid, because a grid would
          equalise row heights and leave a gap under the shorter section. */}
      <div className="flex flex-col gap-3 landscape:flex-row landscape:items-start">
        <div className="flex flex-1 flex-col gap-3">
          <Section title="Alarm">
            <ChoiceRow
              label="Beep for"
              value={settings.beepDurationMs}
              choices={BEEP_DURATION_CHOICES_MS}
              format={(ms) => (ms >= 60_000 ? `${ms / 60_000} min` : `${ms / 1000}s`)}
              onChange={(beepDurationMs) => onUpdate({ beepDurationMs })}
            />
            <div className="flex flex-wrap gap-2">
              {([1, 2] as const).map((voice) => (
                <button
                  key={voice}
                  type="button"
                  onClick={() => onTestAlarm(voice)}
                  className={`min-h-[4.5rem] flex-1 rounded-2xl text-xl font-bold tracking-wide text-on-accent uppercase active:brightness-90 ${
                    voice === 1 ? 'bg-machine-1' : 'bg-machine-2'
                  }`}
                >
                  Test {displayName(settings, (voice - 1) as 0 | 1)}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Display">
            <Switch
              label="Keep screen awake"
              // Reports whether the lock is actually held, not merely asked
              // for: a battery-saver policy can deny it, and a switch that
              // still reads ON while the screen sleeps means a missed alarm.
              hint={
                !wakeLock.supported
                  ? 'Not supported by this browser'
                  : !settings.wakeLock
                    ? 'Stops the tablet sleeping during service'
                    : wakeLock.active
                      ? 'Active — the screen will stay on'
                      : 'Requested, but the system has not granted it'
              }
              disabled={!wakeLock.supported}
              checked={settings.wakeLock}
              onChange={(value) => onUpdate({ wakeLock: value })}
            />
            <Switch
              label="Light theme"
              hint="For a brightly lit station"
              checked={settings.theme === 'light'}
              onChange={(light) => onUpdate({ theme: light ? 'light' : 'dark' })}
            />
          </Section>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <Section title="Timers">
            <ChoiceRow
              label="Stepper size"
              value={settings.stepSeconds}
              choices={STEP_SECONDS_CHOICES}
              format={(s) => `${s}s`}
              onChange={(stepSeconds) => onUpdate({ stepSeconds })}
            />
            {settings.timers.map((timer, index) => (
              <label
                key={index}
                className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-raised p-4"
              >
                <span className="text-2xl font-bold text-ink">Machine {index + 1} name</span>
                <input
                  type="text"
                  value={timer.name}
                  maxLength={MAX_NAME_LENGTH}
                  // A shared station tablet: no autocomplete history, and no
                  // spellcheck squiggles under words like "stroopwafel".
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  onChange={(event) => onUpdateTimer(index as 0 | 1, { name: event.target.value })}
                  className="min-h-[4rem] w-full rounded-xl border-2 border-line bg-panel px-4 text-2xl font-bold text-ink"
                />
              </label>
            ))}
          </Section>

          <Section title="Reset">
            {/* Two taps, because one tap wipes both names, both durations, the
                theme and the alarm window — and it sits directly under the name
                fields. Arms for 4s, then goes back to being inert. */}
            <button
              type="button"
              onClick={() => {
                if (!confirmingReset) {
                  setConfirmingReset(true)
                  return
                }
                setConfirmingReset(false)
                onUpdate(DEFAULT_SETTINGS)
              }}
              className={`min-h-[5rem] rounded-2xl border-2 border-overdue text-2xl font-bold tracking-wide uppercase ${
                confirmingReset
                  ? 'bg-overdue text-on-accent'
                  : 'bg-transparent text-overdue active:bg-overdue/20'
              }`}
            >
              {confirmingReset ? 'Tap again to confirm' : 'Restore defaults'}
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}
