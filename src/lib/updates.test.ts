import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * These assert on source text rather than behaviour, because the defect they
 * guard against is a wiring mistake that no amount of testing `reload-gate.ts`
 * can catch: the gate was fully correct and fully tested while being connected
 * to a callback the plugin never invokes.
 */
/** Comments stripped, so prose explaining the pitfall is not mistaken for it. */
const updatesSource = readFileSync(resolve(process.cwd(), 'src/lib/updates.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
const registerSource = readFileSync(
  resolve(process.cwd(), 'node_modules/vite-plugin-pwa/dist/client/build/register.js'),
  'utf8',
)

describe('service worker update wiring', () => {
  it('takes over the reload with onNeedReload', () => {
    expect(updatesSource).toContain('onNeedReload')
  })

  it('does not use onNeedRefresh, which autoUpdate mode never calls', () => {
    // The plugin only consults onNeedRefresh in its prompt branch. Using it
    // under registerType: 'autoUpdate' leaves the plugin's unconditional
    // window.location.reload() in place, which resets both timers mid-bake.
    expect(updatesSource).not.toContain('onNeedRefresh')
  })

  it('routes the reload through the gate rather than reloading directly', () => {
    expect(updatesSource).toMatch(/onNeedReload\(\)\s*\{\s*gate\.request\(/)
  })
})

describe("the plugin's own autoUpdate branch, which the wiring above depends on", () => {
  it('still reloads unconditionally when onNeedReload is absent', () => {
    // If a plugin upgrade ever changes this, the gate may no longer be needed
    // — or may no longer work. Either way it must be re-read, not assumed.
    expect(registerSource).toContain('if (onNeedReload)')
    expect(registerSource).toMatch(/else\s*window\.location\.reload\(\)/)
  })

  it('still ignores onNeedRefresh in the auto branch', () => {
    const autoBranch = registerSource.slice(
      registerSource.indexOf('if (auto) {'),
      registerSource.indexOf('} else {'),
    )
    expect(autoBranch.length).toBeGreaterThan(0)
    expect(autoBranch).not.toContain('onNeedRefresh')
  })
})
