/**
 * iOS launch images (apple-touch-startup-image).
 *
 * When the app is opened from the home screen, iOS shows this picture instantly, before
 * any of our code exists. Without it iOS shows plain white, and a dark-mode phone gets a
 * white flash. These are solid Chalk & Signal backgrounds (same colours as the loading
 * splash in server/assets/splash.html) so the hand-off to the splash is invisible.
 *
 * One file per phone screen size x theme. iOS picks the file by exact screen size, so
 * a new iPhone size needs one line in DEVICES, then `npm run launch-images` and commit
 * the PNGs. nuxt.config.ts builds the <link> tags from this same list.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

// Copies of --vf-color-bg (main.css) for light and dark.
export const LAUNCH_COLORS = { light: '#F1F3F2', dark: '#0E1110' }

// CSS screen size (portrait) and pixel ratio. Picture size = CSS size x ratio.
export const DEVICES = [
  { w: 320, h: 568, r: 2 }, // iPhone SE (1st gen)
  { w: 375, h: 667, r: 2 }, // iPhone SE (2nd/3rd gen), 8
  { w: 414, h: 736, r: 3 }, // iPhone 8 Plus
  { w: 375, h: 812, r: 3 }, // iPhone X, XS, 11 Pro
  { w: 414, h: 896, r: 2 }, // iPhone XR, 11
  { w: 414, h: 896, r: 3 }, // iPhone XS Max, 11 Pro Max
  { w: 360, h: 780, r: 3 }, // iPhone 12 mini, 13 mini
  { w: 390, h: 844, r: 3 }, // iPhone 12, 12 Pro, 13, 13 Pro, 14
  { w: 428, h: 926, r: 3 }, // iPhone 12/13 Pro Max, 14 Plus
  { w: 393, h: 852, r: 3 }, // iPhone 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, r: 3 }, // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 402, h: 874, r: 3 }, // iPhone 16 Pro, 17, 17 Pro
  { w: 420, h: 912, r: 3 }, // iPhone Air
  { w: 440, h: 956, r: 3 }, // iPhone 16 Pro Max, 17 Pro Max
]

export const LAUNCH_DIR = '/splash/ios'
export const launchFileName = (d, theme) => `launch-${d.w * d.r}x${d.h * d.r}-${theme}.png`

/** The <link> tags for nuxt.config.ts `app.head.link`. */
export const launchImageLinks = () =>
  DEVICES.flatMap((d) =>
    ['light', 'dark'].map((theme) => ({
      rel: 'apple-touch-startup-image',
      href: `${LAUNCH_DIR}/${launchFileName(d, theme)}`,
      media:
        `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.r})` +
        ` and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
    })),
  )

// ---- Generator (dependency-free solid-colour PNG). Runs only via `npm run launch-images`. ----

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
const solidPng = (width, height, hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.set([8, 2, 0, 0, 0], 8) // 8-bit RGB, no interlace
  const row = Buffer.alloc(1 + width * 3)
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3)
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', LAUNCH_DIR)
  mkdirSync(dir, { recursive: true })
  for (const d of DEVICES) {
    for (const [theme, hex] of Object.entries(LAUNCH_COLORS)) {
      writeFileSync(join(dir, launchFileName(d, theme)), solidPng(d.w * d.r, d.h * d.r, hex))
    }
  }
  console.log(`Wrote ${DEVICES.length * 2} launch images to public${LAUNCH_DIR}`)
}
