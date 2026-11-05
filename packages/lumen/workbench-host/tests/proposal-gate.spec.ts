/** Write-gate behavior that changed in the port onto upstream master. */
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { SiminFiles } from '../src/simin-files.ts'
import { SiminProposals } from '../src/simin-proposals.ts'

let root: string
let files: SiminFiles
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'lumen-gate-')); files = new SiminFiles(root) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })

function call(cwd: string, name: string, args: unknown): ToolExecution {
  return {
    callId: 'fixture' as ToolExecution['callId'], rootCallId: 'fixture' as ToolExecution['rootCallId'],
    token: Symbol('fixture') as ToolExecution['token'], name, arguments: args,
    signal: new AbortController().signal,
    agent: { session: { header: { cwd }, id: 'fixture' } } as NonNullable<ToolExecution['agent']>,
  }
}

describe('workbench write gate', () => {
  it.each(['pwsh', 'terminal_send', 'terminal_open', 'create_worktree'])('refuses %s inside a project', async (tool) => {
    const project = await files.create('产品')
    const next = vi.fn(async () => ({ kind: 'allow' as const }))
    const decision = await new SiminProposals(files).gate(call(project.path, tool, {}), next)
    expect(decision).toMatchObject({ kind: 'deny' })
    expect(next).not.toHaveBeenCalled()
  })

  it('resolves relative paths against the current working directory, not the original project', async () => {
    const project = await files.create('产品')
    const nested = join(project.path, 'sub')
    await mkdir(nested)
    const proposals = new SiminProposals(files, () => nested)
    const next = vi.fn(async () => ({ kind: 'allow' as const }))
    // `a.md` now lands in project/sub, which is not a top-level project document.
    const decision = await proposals.gate(call(project.path, 'write', { file_path: 'a.md', content: 'x' }), next)
    expect(decision).toMatchObject({ kind: 'deny' })
    expect(next).not.toHaveBeenCalled()
    expect(await proposals.list()).toEqual([])
  })

  it('passes tools through for Sessions outside the project root', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'lumen-outside-'))
    try {
      const next = vi.fn(async () => ({ kind: 'allow' as const }))
      expect(await new SiminProposals(files).gate(call(outside, 'bash', {}), next)).toEqual({ kind: 'allow' })
      expect(next).toHaveBeenCalledOnce()
    } finally { await rm(outside, { recursive: true, force: true }) }
  })
})
