import { TimerPanel } from './components/TimerPanel'
import { useSettings } from './hooks/useSettings'
import { useTimer } from './hooks/useTimer'
import { stepDuration } from './lib/time'

export default function App() {
  const { settings, updateTimer } = useSettings()
  const [first, second] = settings.timers

  const timerOne = useTimer(first.durationMs)
  const timerTwo = useTimer(second.durationMs)

  return (
    // Side by side in landscape, stacked in portrait — a wall-mounted tablet
    // could be either way up, and two half-width panels in portrait would
    // squeeze the digits down to nothing.
    <div className="flex h-full w-full flex-col gap-3 p-3 landscape:flex-row">
      <TimerPanel
        accent={1}
        name={first.name}
        timer={timerOne}
        stepSeconds={settings.stepSeconds}
        onStepDuration={(delta) =>
          updateTimer(0, { durationMs: stepDuration(first.durationMs, delta) })
        }
      />
      <TimerPanel
        accent={2}
        name={second.name}
        timer={timerTwo}
        stepSeconds={settings.stepSeconds}
        onStepDuration={(delta) =>
          updateTimer(1, { durationMs: stepDuration(second.durationMs, delta) })
        }
      />
    </div>
  )
}
