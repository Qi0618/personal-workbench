/** The bundle's substance is its patch file: every Lumen plugin row, and the upstream rows it switches off. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { WELCOME_NOTICE_VERSION } from '@deepseek-ai/dsh-client-ui-settings-models/src/onboarding-copy.ts'

interface Row { id?: string; name?: string; disabled?: boolean; config?: Record<string, unknown>; insert?: Row[] }

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
  dsh: { bundle: { patch: string } }
}
const patches = yaml.load(readFileSync(resolve(root, manifest.dsh.bundle.patch), 'utf8'), { schema: entryListSchema }) as Row[]

describe('@lumen/bundle', () => {
  it('inserts every Lumen plugin it depends on', () => {
    const inserted = patches.flatMap(patch => patch.insert ?? [])
    expect(inserted.map(row => row.name).sort()).toEqual(Object.keys(manifest.dependencies).sort())
  })

  it('switches off the whale artwork and client HMR', () => {
    const disabled = patches.filter(patch => patch.disabled === true).map(patch => patch.id)
    expect(disabled).toEqual(['ui-brand-official', 'client-hmr'])
  })

  it('marks the current preview notice as read', () => {
    const general = patches.find(patch => patch.id === 'ui-settings-general')
    expect(general?.config).toEqual({ welcomeNoticeVersion: WELCOME_NOTICE_VERSION })
  })
})
