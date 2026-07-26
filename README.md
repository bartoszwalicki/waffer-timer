# Waffle Timer

A fullscreen PWA for a waffle station with two machines. Two large side-by-side timers, each
with its own programmed time, colour and alarm sound. Runs entirely in the browser — no backend.

**Live: https://bartoszwalicki.github.io/waffer-timer/**

## What it does

- Two independent `mm:ss` timers, side by side, one colour each.
- Each timer's target time is set with `−`/`+` steppers and persisted to `localStorage`.
- Tap a timer face, or its **START** button, to restart the countdown from the programmed value.
- At `00:00` the timer alarms with a sound unique to that machine, then keeps counting
  **negative** so you can see how overdue a waffle is.
- **RESET** returns a timer to its programmed value and silences the alarm.
- Settings (cog): alarm duration (default 15 s), screen wake lock (default on), stepper size,
  machine names.
- Light and dark themes for different ambient light.
- Installable and fully offline-capable.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests for the timer/storage logic
npm run typecheck  # tsc -b
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons from scripts/icon.svg (needs sharp)
```

## Stack

Vite + React + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config in
`src/index.css`), `vite-plugin-pwa` for the manifest and service worker. Alarm tones are
synthesised with the Web Audio API, so there are no audio assets to load.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which type-checks, tests, builds and
publishes `dist/` to GitHub Pages.

`vite.config.ts` sets `base: '/waffer-timer/'` to match the repository name — asset URLs break
if that ever diverges.
