/**
 * Render every Lumen brand file that replaces an upstream asset: web favicons, Desktop application icons, the Desktop welcome wordmark and
 * the Windows installer artwork. All of them derive from `src/mark.ts`.
 *
 *   pnpm --filter @lumen/brand render-assets
 *
 * Upstream's own scripts then derive the rest from the new SVGs:
 *   pnpm --filter @deepseek-ai/dsh-desktop render:tray-icon   (Windows tray icon)
 *   pnpm --filter @deepseek-ai/dsh-web-frontend render:app-icons   (web install icons)
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { BRAND_COLORS, MARK_LEFT_PATH, MARK_RIGHT_PATH, MARK_VIEWBOX, PRODUCT_NAME } from '../src/mark.ts'

const ROOT = resolve(import.meta.dirname, '../../../..')
const WEB = resolve(ROOT, 'apps/web/public')
const DESKTOP = resolve(ROOT, 'apps/desktop')

const FONT = '-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial, sans-serif'

/**
 * The mark as SVG elements, centered at (cx, cy) with the given disc diameter.
 * @param cx - center x.
 * @param cy - center y.
 * @param diameter - disc diameter in output units.
 * @param ink - left-half color.
 * @param accent - right-half color.
 * @returns SVG markup.
 */
function mark(cx: number, cy: number, diameter: number, ink: string, accent: string): string {
  // The disc spans 18 of the mark's 24 units.
  const scale = diameter / 18
  const half = MARK_VIEWBOX / 2
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-half} ${-half})">`
    + `<path d="${MARK_LEFT_PATH}" fill="${ink}"/><path d="${MARK_RIGHT_PATH}" fill="${accent}"/></g>`
}

/**
 * One application tile in upstream's icon coordinate space: a 1024 tile at
 * (40, 32) of a 1104 canvas. Upstream tooling relies on this layout:
 * - `apps/web/scripts/render-app-icons.ts` crops the shadow group
 *   `filter0_d_1637_371` and rescales the artwork group `filter1_ddi_1637_371`;
 * - `render-tray-icon.ts` scales `#tray-glyph` about the tile center (552, 544).
 * @param radius - tile corner radius (0 for the square master).
 * @param trayGlyph - whether to tag the artwork group for the tray renderer.
 * @returns tile markup including its `<defs>`.
 */
function tile(radius: number, trayGlyph = false): string {
  const glyphId = trayGlyph ? 'id="tray-glyph" ' : ''
  return `<g filter="url(#filter0_d_1637_371)">
<rect x="40" y="32" width="1024" height="1024" rx="${radius}" fill="url(#lumen-tile)"/>
<g ${glyphId}filter="url(#filter1_ddi_1637_371)">${mark(552, 544, 560, BRAND_COLORS.ink, BRAND_COLORS.accent)}</g>
</g>
<defs>
<filter id="filter0_d_1637_371" x="-8" y="-16" width="1120" height="1120" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#1c1f2a" flood-opacity="0.18"/>
</filter>
<filter id="filter1_ddi_1637_371" x="200" y="200" width="704" height="704" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#1c1f2a" flood-opacity="0.12"/>
</filter>
<linearGradient id="lumen-tile" x1="552" y1="32" x2="552" y2="1056" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef0f6"/>
</linearGradient>
</defs>`
}

/** The square master (1104 canvas); also the source of upstream's web install icons. */
const ICON_SVG = `<svg width="1104" height="1104" viewBox="0 0 1104 1104" fill="none" xmlns="http://www.w3.org/2000/svg">
${tile(0)}
</svg>
`

/**
 * A platform icon: the master tile scaled into a 1024 canvas with platform margins.
 * @param inset - margin around the tile in output pixels.
 * @param radius - tile corner radius in tile units.
 * @param trayGlyph - whether the tray renderer reads this file.
 * @returns SVG markup.
 */
function platformIcon(inset: number, radius: number, trayGlyph = false): string {
  const scale = (1024 - inset * 2) / 1024
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${inset} ${inset}) scale(${scale}) translate(-40 -32)">${tile(radius, trayGlyph)}</g>
</svg>
`
}

/**
 * Browser-tab icon: the bare mark, no tile.
 * @param ink - left-half color for this color scheme.
 * @param accent - right-half color.
 * @returns SVG markup.
 */
function favicon(ink: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
${mark(25, 25, 44, ink, accent)}
</svg>
`
}

/** Desktop welcome wordmark: same 472×40 box as upstream, mark and name centered. */
const WELCOME_SVG = `<svg width="472" height="40" viewBox="0 0 472 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<style>
  .ink { fill: ${BRAND_COLORS.ink}; }
  .accent { fill: ${BRAND_COLORS.accent}; }
  @media (prefers-color-scheme: dark) {
    .ink { fill: ${BRAND_COLORS.inkDark}; }
    .accent { fill: ${BRAND_COLORS.accentDark}; }
  }
</style>
<g transform="translate(176 20) scale(${36 / 18}) translate(-12 -12)">
<path class="ink" d="${MARK_LEFT_PATH}"/><path class="accent" d="${MARK_RIGHT_PATH}"/>
</g>
<text class="ink" x="206" y="31" font-family="${FONT}" font-size="32" font-weight="600" letter-spacing="-0.5">${PRODUCT_NAME}</text>
</svg>
`

/**
 * Windows installer header artwork.
 * @param width - bitmap width.
 * @param height - bitmap height.
 * @param dark - dark installer theme.
 * @returns SVG markup.
 */
function installerBrand(width: number, height: number, dark: boolean): string {
  const unit = height / 196
  const ink = dark ? BRAND_COLORS.inkDark : BRAND_COLORS.ink
  const accent = dark ? BRAND_COLORS.accentDark : BRAND_COLORS.accent
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${mark(width / 2 - 84 * unit, height / 2, 64 * unit, ink, accent)}
<text x="${width / 2 - 38 * unit}" y="${height / 2 + 20 * unit}" fill="${ink}" font-family="${FONT}" font-size="${56 * unit}" font-weight="600">${PRODUCT_NAME}</text>
</svg>`
}

/** Windows uninstaller sidebar artwork (164×314). */
const UNINSTALLER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
<rect width="164" height="314" fill="${BRAND_COLORS.tile}"/>
${mark(82, 130, 72, BRAND_COLORS.ink, BRAND_COLORS.accent)}
<text x="82" y="204" text-anchor="middle" fill="${BRAND_COLORS.ink}" font-family="${FONT}" font-size="26" font-weight="600">${PRODUCT_NAME}</text>
</svg>`

async function png(svg: string, path: string, size?: number): Promise<void> {
  const image = sharp(Buffer.from(svg))
  await (size === undefined ? image : image.resize(size, size)).png().toFile(path)
}

async function main(): Promise<void> {
  const text: [string, string][] = [
    [resolve(WEB, 'favicon.svg'), favicon(BRAND_COLORS.ink, BRAND_COLORS.accent)],
    [resolve(WEB, 'favicon-dark.svg'), favicon(BRAND_COLORS.inkDark, BRAND_COLORS.accentDark)],
    [resolve(DESKTOP, 'resources/icon.svg'), ICON_SVG],
    [resolve(DESKTOP, 'resources/icon-macos.svg'), platformIcon(100, 230)],
    [resolve(DESKTOP, 'resources/icon-windows.svg'), platformIcon(32, 192, true)],
    [resolve(DESKTOP, 'renderer/assets/welcome-brand.svg'), WELCOME_SVG],
  ]
  for (const [path, content] of text) await writeFile(path, content)

  await png(ICON_SVG, resolve(DESKTOP, 'resources/icon.png'))
  await png(platformIcon(100, 230), resolve(DESKTOP, 'resources/icon-macos.png'))
  await png(platformIcon(32, 192, true), resolve(DESKTOP, 'resources/icon-windows.png'))

  const installer = resolve(DESKTOP, 'installer/assets')
  await png(installerBrand(600, 196, false), resolve(installer, 'brand.png'))
  await png(installerBrand(1200, 392, false), resolve(installer, 'brand-2x.png'))
  await png(installerBrand(600, 196, true), resolve(installer, 'brand-dark.png'))
  await png(installerBrand(1200, 392, true), resolve(installer, 'brand-dark-2x.png'))
  await png(UNINSTALLER_SVG, resolve(installer, 'uninstaller-sidebar.png'))
  console.log('lumen: brand assets written')
}

await main()
