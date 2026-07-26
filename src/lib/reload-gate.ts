/**
 * Holds a pending action until the app says it is safe to run.
 *
 * Used to stop a service-worker update reloading the page mid-bake: running
 * countdowns live only in memory, so a reload would silently reset both
 * machines with nobody watching. Separate from `updates.ts` so it can be
 * tested without pulling in the `virtual:pwa-register` module.
 */
export type ReloadGate = {
  /** Runs `action` now if allowed, otherwise holds it until the gate opens. */
  request: (action: () => void) => void
  /** Updates whether running is allowed, releasing any held action. */
  setAllowed: (allowed: boolean) => void
}

export function createReloadGate(initiallyAllowed = true): ReloadGate {
  let allowed = initiallyAllowed
  let pending: (() => void) | null = null

  const flush = () => {
    if (!allowed || !pending) return
    const action = pending
    // Cleared before running: the action reloads the page, and a re-entrant
    // call must not find it still queued.
    pending = null
    action()
  }

  return {
    request(action) {
      // Only ever one pending reload — a second update supersedes the first.
      pending = action
      flush()
    },
    setAllowed(next) {
      allowed = next
      flush()
    },
  }
}
