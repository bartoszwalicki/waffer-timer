export type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Shown under the label — what the setting does, or why it is unavailable. */
  hint?: string
  disabled?: boolean
}

/**
 * A large on/off control. The whole row is the hit target, not just the track,
 * so it can be hit with a gloved thumb without aiming.
 */
export function Switch({ checked, onChange, label, hint, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[5rem] w-full items-center justify-between gap-4 rounded-2xl border-2 border-line bg-raised px-5 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-2xl font-bold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-base text-ink-dim">{hint}</span>}
      </span>

      {/* aria-hidden: the button itself already carries the switch semantics. */}
      <span
        aria-hidden="true"
        className={`relative h-12 w-[5.5rem] shrink-0 rounded-full transition-colors duration-150 ${
          checked ? 'bg-machine-2' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-1.5 h-9 w-9 rounded-full bg-ink transition-[left] duration-150 ${
            checked ? 'left-[2.75rem]' : 'left-1.5'
          }`}
        />
      </span>
    </button>
  )
}
