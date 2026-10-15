/** Render the selected C1 identity into the desktop, installer, and Web assets. */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const resources = fileURLToPath(new URL('../resources/', import.meta.url))
const repository = fileURLToPath(new URL('../../../', import.meta.url))
const artwork = readFileSync(join(resources, 'lumen-mark.svg'), 'utf8')
const path = artwork.match(/<path d="([^"]+)"/)?.[1]
if (path === undefined) throw new Error('Lumen vector source has no mark')
const ink = '#152033'
const ivory = '#F3F2EE'
const mark = (fill) => `<path d="${path}" fill="${fill}"/>`
const document = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${body}</svg>\n`
const tile = (x, y, size) => `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.22}" fill="${ink}"/><g transform="translate(${x + size * 0.1875} ${y + size * 0.1875}) scale(${size * 0.00625})">${mark(ivory)}</g>`
const app = document(1024, 1024, `<rect x="64" y="64" width="896" height="896" rx="197" fill="${ink}"/><g id="tray-glyph"><g transform="translate(232 232) scale(5.6)">${mark(ivory)}</g></g>`)
const appPng = await sharp(Buffer.from(app)).png().toBuffer()
for (const name of ['icon', 'icon-macos', 'icon-windows']) {
  writeFileSync(join(resources, `${name}.svg`), app)
  writeFileSync(join(resources, `${name}.png`), appPng)
}
writeFileSync(join(resources, 'simin.svg'), app)
writeFileSync(join(resources, 'simin-avatar.png'), appPng)
for (const [name, fill] of [['favicon.svg', '#000'], ['favicon-dark.svg', '#fff']]) {
  writeFileSync(join(repository, 'apps/web/public', name), document(100, 100, mark(fill)))
}
writeFileSync(join(repository, 'website/public/favicon.svg'), document(100, 100, mark(ink)))

const installer = fileURLToPath(new URL('../installer/assets/', import.meta.url))
for (const [name, fill] of [['brand', ink], ['brand-dark', ivory]]) {
  const svg = document(600, 196, `${tile(256, 10, 88)}<text x="300" y="158" text-anchor="middle" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="600" letter-spacing="-0.5">Lumen</text>`)
  for (const scale of [1, 2]) {
    await sharp(Buffer.from(svg), { density: 72 * scale }).png().toFile(join(installer, `${name}${scale === 2 ? '-2x' : ''}.png`))
  }
}
await sharp(Buffer.from(document(164, 314, `<rect width="164" height="314" fill="${ivory}"/>${tile(34, 64, 96)}<text x="82" y="205" text-anchor="middle" fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600" letter-spacing="-0.5">Lumen</text>`))).png().toFile(join(installer, 'uninstaller-sidebar.png'))

if (process.platform === 'darwin') {
  const iconset = join(resources, '../.desktop-build/lumen.iconset')
  mkdirSync(iconset, { recursive: true })
  for (const logical of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const size = logical * scale
      await sharp(Buffer.from(app), { density: 72 * size / 1024 }).resize(size, size).png().toFile(join(iconset, `icon_${logical}x${logical}${scale === 2 ? '@2x' : ''}.png`))
    }
  }
  execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', join(resources, 'simin.icns')])
}

const outputs = process.argv[2]
if (outputs !== undefined) {
  mkdirSync(outputs, { recursive: true })
  copyFileSync(join(resources, 'lumen-mark.svg'), join(outputs, 'lumen-mark.svg'))
  writeFileSync(join(outputs, 'lumen-app-icon.svg'), app)
  writeFileSync(join(outputs, 'lumen-app-icon.png'), appPng)
  if (process.platform === 'darwin') copyFileSync(join(resources, 'simin.icns'), join(outputs, 'lumen.icns'))
}
console.log('Rendered Lumen C1 desktop, installer, favicon, and icon assets.')
