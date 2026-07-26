import { describe, expect, it, vi } from 'vitest'
import { createReloadGate } from './reload-gate'

describe('createReloadGate', () => {
  it('runs immediately when allowed', () => {
    const gate = createReloadGate(true)
    const reload = vi.fn()
    gate.request(reload)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('holds the action while blocked, then runs it once released', () => {
    // The whole point: a deploy landing mid-bake must not reset both machines.
    const gate = createReloadGate(false)
    const reload = vi.fn()
    gate.request(reload)
    expect(reload).not.toHaveBeenCalled()

    gate.setAllowed(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not re-run a held action when the gate is toggled again', () => {
    const gate = createReloadGate(false)
    const reload = vi.fn()
    gate.request(reload)
    gate.setAllowed(true)
    gate.setAllowed(false)
    gate.setAllowed(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does nothing when the gate opens with no action pending', () => {
    const gate = createReloadGate(false)
    expect(() => gate.setAllowed(true)).not.toThrow()
  })

  it('supersedes an earlier pending action rather than running both', () => {
    const gate = createReloadGate(false)
    const first = vi.fn()
    const second = vi.fn()
    gate.request(first)
    gate.request(second)
    gate.setAllowed(true)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it('stays quiet while blocked no matter how many updates arrive', () => {
    const gate = createReloadGate(false)
    const reload = vi.fn()
    for (let i = 0; i < 5; i++) gate.request(reload)
    expect(reload).not.toHaveBeenCalled()
    gate.setAllowed(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('clears the pending action before running it, so a re-entrant request is not lost', () => {
    const gate = createReloadGate(true)
    const later = vi.fn()
    // An action that requests again while running must queue the new one
    // rather than have it wiped by the outer flush.
    gate.request(() => {
      gate.setAllowed(false)
      gate.request(later)
    })
    expect(later).not.toHaveBeenCalled()
    gate.setAllowed(true)
    expect(later).toHaveBeenCalledOnce()
  })
})
