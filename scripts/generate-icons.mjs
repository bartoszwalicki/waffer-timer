// Rasterises scripts/icon.svg into the PWA PNGs. Run manually with
// `npm run icons`; the output is committed so CI never needs sharp.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'scripts/icon.svg'))

const outputs = [
  { file: 'public/icons/icon-192.png', size: 192, padding: 0 },
  { file: 'public/icons/icon-512.png', size: 512, padding: 0 },
  { file: 'public/apple-touch-icon.png', size: 180, padding: 0 },
  // Maskable icons get cropped to a circle by the launcher, so the artwork
  // has to sit inside the safe zone (80% of the canvas).
  { file: 'public/icons/icon-maskable-512.png', size: 512, padding: 0.1 },
]

await mkdir(resolve(root, 'public/icons'), { recursive: true })

for (const { file, size, padding } of outputs) {
  const inner = Math.round(size * (1 - padding * 2))
  const png = await sharp(source)
    .resize(inner, inner)
    .extend({
      top: Math.round((size - inner) / 2),
      bottom: size - inner - Math.round((size - inner) / 2),
      left: Math.round((size - inner) / 2),
      right: size - inner - Math.round((size - inner) / 2),
      background: '#0a0e13',
    })
    .png()
    .toBuffer()
  await writeFile(resolve(root, file), png)
  console.log(`wrote ${file} (${size}x${size})`)
}

await writeFile(resolve(root, 'public/favicon.svg'), source)
console.log('wrote public/favicon.svg')
