/** Actual-disk behavior for project documents and recoverable trash. */
import { mkdtemp, readdir, writeFile, symlink, rm, mkdir, readFile, rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi, onTestFinished } from 'vitest'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { SiminFiles, siminVersion } from '../src/simin-files.ts'
import { SiminProposals } from '../src/simin-proposals.ts'

let root: string
let files: SiminFiles
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'simin-files-')); files = new SiminFiles(root) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })

describe('Simin project files', () => {
  it('imports independent copies, preserves nested and binary files, and never deletes the source', async () => {
    const source = await mkdtemp(join(tmpdir(), 'simin-source-'))
    onTestFinished(() => rm(source, { recursive: true, force: true }))
    await mkdir(join(source, 'assets'))
    await writeFile(join(source, 'notes.md'), '# Source notes')
    await writeFile(join(source, 'assets', 'image.bin'), Buffer.from([0, 1, 2, 255]))
    const created = await files.create('Imported', source)
    expect(created.documents).toEqual(['notes.md'])
    expect(created.files[0]?.preview).toBe('Source notes')
    expect(await readFile(join(created.path, 'assets', 'image.bin'))).toEqual(Buffer.from([0, 1, 2, 255]))
    await writeFile(join(created.path, 'notes.md'), 'Changed copy')
    expect(await readFile(join(source, 'notes.md'), 'utf8')).toBe('# Source notes')
    await files.deleteProject(created.name, created.version)
    expect(await readFile(join(source, 'notes.md'), 'utf8')).toBe('# Source notes')
  })
  it('refuses imports that would recursively copy the project root into itself', async () => {
    await expect(files.create('Recursive', root)).rejects.toMatchObject({ code: 'invalidSourceFolder' })
    await expect(files.create('Relative', 'relative-folder')).rejects.toMatchObject({ code: 'invalidSourceFolder' })
    expect(await files.projects()).toEqual([])
  })
  it('rolls back a partial import when the source contains a symbolic link', async () => {
    const source = await mkdtemp(join(tmpdir(), 'simin-link-source-'))
    onTestFinished(() => rm(source, { recursive: true, force: true }))
    await mkdir(join(source, 'target'))
    await symlink(join(source, 'target'), join(source, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
    await expect(files.create('Linked', source)).rejects.toMatchObject({ code: 'sourceFolderLink' })
    expect(await files.projects()).toEqual([])
    expect((await readdir(root)).filter(name => name.startsWith('.creating-'))).toEqual([])
    expect(await readdir(source)).toContain('linked')
  })
  it('does not create a project for an already cancelled request', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(files.create('Cancelled', undefined, controller.signal)).rejects.toThrow()
    expect(await files.projects()).toEqual([])
  })
  it('creates an actually empty project and refuses a duplicate', async () => {
    const project = await files.create('需求梳理')
    expect(await readdir(project.path)).toEqual([])
    expect(project.documents).toEqual([])
    await expect(files.create('需求梳理')).rejects.toMatchObject({ code: 'duplicate', status: 409 })
  })
  it('reads real files and omits unrelated files and symbolic links', async () => {
    const project = { path: join(root, '产品') }
    await mkdir(project.path)
    await writeFile(join(project.path, '信息.md'), '# 已有证据\n真实正文')
    await writeFile(join(project.path, 'image.png'), 'not a document')
    await symlink(join(project.path, '信息.md'), join(project.path, '链接.md'))
    expect((await files.projects())[0]?.documents).toEqual(['信息.md'])
    expect((await files.projects())[0]?.files[0]?.preview).toContain('真实正文')
    await expect(files.read('产品', '链接.md')).rejects.toThrow()
  })
  it('rejects path traversal and linked project directories', async () => {
    await expect(files.create('../escape')).rejects.toMatchObject({ code: 'invalidName' })
    await mkdir(join(root, '产品'))
    await expect(files.read('产品', '../escape.md')).rejects.toMatchObject({ code: 'invalidName' })
    await symlink(join(root, '产品'), join(root, '链接'))
    await expect(files.read('链接', 'x.md')).rejects.toMatchObject({ code: 'invalidProject' })
  })
  it('creates on confirmation and refuses stale edits without changing the file', async () => {
    await mkdir(join(root, '产品'))
    const saved = await files.save('产品', '信息.md', '# 一', null)
    await writeFile(join(root, '产品', '信息.md'), '# 外部编辑')
    await expect(files.save('产品', '信息.md', '# 二', saved.version)).rejects.toMatchObject({ code: 'conflict', status: 409 })
    expect((await files.read('产品', '信息.md')).markdown).toBe('# 外部编辑')
    await expect(files.save('产品', '信息.md', 'overwrite', null)).rejects.toMatchObject({ code: 'conflict' })
  })
  it('serializes two creation requests so one wins and neither silently overwrites', async () => {
    await mkdir(join(root, '产品'))
    const results = await Promise.allSettled([files.save('产品', 'a.md', 'one', null), files.save('产品', 'a.md', 'two', null)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((await files.read('产品', 'a.md')).markdown).toBe('one')
  })
  it('renames a file and refuses an existing destination', async () => {
    await mkdir(join(root, '产品'))
    const saved = await files.save('产品', 'a.md', 'one', null)
    await files.save('产品', 'b.md', 'two', null)
    await expect(files.rename('产品', 'a.md', 'b.md', saved.version)).rejects.toMatchObject({ code: 'duplicate' })
    await files.rename('产品', 'a.md', '新的信息.md', saved.version)
    expect(await files.optional('产品', 'a.md')).toBeNull()
    expect((await files.read('产品', '新的信息.md')).markdown).toBe('one')
  })
  it('renames only the visible title and retains directory, documents and trash across restart', async () => {
    const project = await files.create('产品')
    const saved = await files.save(project.name, 'a.md', 'keep', null)
    const id = await files.trash(project.name, 'a.md', saved.version)
    const renamed = await files.renameProject(project.name, ' 新名称 ', project.version)
    expect(renamed).toEqual({ name: project.name, title: '新名称', path: project.path, version: project.version })
    const restarted = new SiminFiles(root)
    expect((await restarted.projects())[0]).toMatchObject(renamed)
    await restarted.restore(id, saved.version)
    expect((await restarted.read(project.name, 'a.md')).markdown).toBe('keep')
    const reused = await restarted.create('产品')
    expect(reused.title).toBe('产品')
    expect(reused.name).not.toBe(project.name)
    expect((await restarted.projects()).map(item => item.title).sort()).toEqual(['产品', '新名称'].sort())
  })
  it('refuses duplicate displayed titles during rename and creation without losing existing content', async () => {
    const one = await files.create('甲')
    const two = await files.create('乙')
    await files.save(one.name, 'a.md', 'keep', null)
    await files.renameProject(one.name, '新名称', one.version)
    await expect(files.renameProject(two.name, '新名称', two.version)).rejects.toMatchObject({ code: 'duplicate' })
    await expect(files.create('新名称')).rejects.toMatchObject({ code: 'duplicate' })
    expect((await files.read(one.name, 'a.md')).markdown).toBe('keep')
  })
  it('rejects stale project identities after a same-name directory replacement', async () => {
    const old = await files.create('产品')
    await rename(old.path, join(root, '.old-project'))
    await mkdir(old.path)
    await files.save(old.name, 'a.md', 'replacement', null)
    await expect(files.renameProject(old.name, '改名', old.version)).rejects.toMatchObject({ code: 'projectConflict' })
    await expect(files.deleteProject(old.name, old.version)).rejects.toMatchObject({ code: 'projectConflict' })
    expect((await files.read(old.name, 'a.md')).markdown).toBe('replacement')
  })
  it('uses a fresh workspace path when a deleted visible project title is reused', async () => {
    const original = await files.create('同名项目')
    await files.deleteProject(original.name, original.version)
    const replacement = await files.create('同名项目')
    expect(replacement.title).toBe(original.title)
    expect(replacement.name).not.toBe(original.name)
    expect(replacement.path).not.toBe(original.path)
    expect(replacement.version).not.toBe(original.version)
  })
  it('permanently deletes nested content and project trash while preserving linked targets and other projects', async () => {
    const project = await files.create('删除')
    const kept = await files.create('保留')
    await files.save(kept.name, 'a.md', 'untouched', null)
    await mkdir(join(project.path, 'nested'))
    await writeFile(join(project.path, 'nested', 'data.bin'), 'data')
    await symlink(kept.path, join(project.path, 'linked-directory'))
    const saved = await files.save(project.name, 'a.md', 'trash', null)
    await files.trash(project.name, 'a.md', saved.version)
    await files.deleteProject(project.name, project.version)
    expect((await files.projects()).map(item => item.name)).toEqual([kept.name])
    expect(await files.trashList()).toEqual([])
    expect((await files.read(kept.name, 'a.md')).markdown).toBe('untouched')
    await expect(files.optional(project.name, 'a.md')).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('rejects unsafe names and linked project deletion without touching the link target', async () => {
    const project = await files.create('保留')
    await symlink(project.path, join(root, '链接'))
    await expect(files.deleteProject('链接', project.version)).rejects.toMatchObject({ code: 'invalidProject' })
    await expect(files.renameProject(project.name, '../escape', project.version)).rejects.toMatchObject({ code: 'invalidName' })
    await expect(files.deleteProject('../escape', project.version)).rejects.toMatchObject({ code: 'invalidName' })
    expect(await readdir(project.path)).toEqual([])
  })
  it('checks trash metadata before removing project contents', async () => {
    const project = await files.create('产品')
    await files.save(project.name, 'a.md', 'keep', null)
    await mkdir(join(root, '.simin', 'trash'), { recursive: true })
    await writeFile(join(root, '.simin', 'trash', '12345678-1234-1234-1234-123456789abc.json'), '{}')
    await expect(files.deleteProject(project.name, project.version)).rejects.toMatchObject({ code: 'invalidData' })
    expect(await readFile(join(project.path, 'a.md'), 'utf8')).toBe('keep')
  })
  it('retains deleted content across restart and restores it to the original project', async () => {
    await mkdir(join(root, '产品'))
    const saved = await files.save('产品', 'a.md', 'keep me', null)
    const id = await files.trash('产品', 'a.md', saved.version)
    expect(await files.optional('产品', 'a.md')).toBeNull()
    const restarted = new SiminFiles(root)
    const item = (await restarted.trashList())[0]
    expect(item).toMatchObject({ id, project: '产品', file: 'a.md', markdown: 'keep me' })
    await restarted.restore(id, saved.version)
    expect((await restarted.read('产品', 'a.md')).markdown).toBe('keep me')
    expect(await restarted.trashList()).toEqual([])
  })
  it('keeps both files when restoration conflicts and purges only the confirmed trash item', async () => {
    await mkdir(join(root, '产品'))
    const saved = await files.save('产品', 'a.md', 'old', null)
    const id = await files.trash('产品', 'a.md', saved.version)
    await files.save('产品', 'a.md', 'new', null)
    await expect(files.restore(id, saved.version)).rejects.toMatchObject({ code: 'duplicate' })
    expect((await files.trashList())[0]?.markdown).toBe('old')
    expect((await files.read('产品', 'a.md')).markdown).toBe('new')
    await files.restore(id, saved.version, true)
    expect(await files.trashList()).toEqual([])
    expect((await files.read('产品', 'a.md')).markdown).toBe('new')
  })
})

describe('retained write previews', () => {
  async function pending(before: string | null = null) {
    await mkdir(join(root, '产品'))
    if (before !== null) await files.save('产品', 'a.md', before, null)
    const id = '12345678-1234-1234-1234-123456789abc'
    const item = { id, project: '产品', file: 'a.md', sessionId: 'fixture', before, after: 'proposed', version: before === null ? null : siminVersion(before), status: 'pending', createdAt: 1 }
    await writeFile(join(await files.metadata('proposals'), `${id}.json`), JSON.stringify(item))
    return id
  }
  it('marks abandoned tools interrupted and saves nothing until explicitly confirmed', async () => {
    const id = await pending()
    const proposals = new SiminProposals(files)
    expect((await proposals.list())[0]?.status).toBe('interrupted')
    expect(await files.optional('产品', 'a.md')).toBeNull()
    await proposals.decide(id, true)
    expect((await files.read('产品', 'a.md')).markdown).toBe('proposed')
    expect((await proposals.list())[0]?.status).toBe('saved')
    await expect(proposals.decide(id, true)).rejects.toMatchObject({ code: 'conflict' })
  })
  it('cancels without modifying the original content', async () => {
    const id = await pending('original')
    const proposals = new SiminProposals(files)
    await proposals.decide(id, false)
    expect((await files.read('产品', 'a.md')).markdown).toBe('original')
    expect((await proposals.list())[0]?.status).toBe('rejected')
  })
  it('accepts only one decision when confirmation and cancellation overlap', async () => {
    const id = await pending()
    const proposals = new SiminProposals(files)
    const results = await Promise.allSettled([proposals.decide(id, true), proposals.decide(id, false)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((await proposals.list())[0]?.status).toBe('saved')
    expect((await files.read('产品', 'a.md')).markdown).toBe('proposed')
  })
  it('refuses confirmation after an external edit and retains the preview', async () => {
    const id = await pending('original')
    await writeFile(join(root, '产品', 'a.md'), 'external')
    const proposals = new SiminProposals(files)
    await expect(proposals.decide(id, true)).rejects.toMatchObject({ code: 'conflict' })
    expect((await files.read('产品', 'a.md')).markdown).toBe('external')
    expect((await proposals.list())[0]?.after).toBe('proposed')
  })
  it('preserves an interrupted preview across title rename and removes it on project deletion', async () => {
    const id = await pending('original')
    const project = (await files.projects())[0]!
    const proposals = new SiminProposals(files)
    await proposals.renameProject(project.name, '新名称', project.version)
    expect((await proposals.list())[0]).toMatchObject({ id, project: project.name, status: 'interrupted' })
    await proposals.decide(id, true)
    expect((await files.read(project.name, 'a.md')).markdown).toBe('proposed')
    await proposals.deleteProject(project.name, project.version)
    expect(await proposals.list()).toEqual([])
    expect(await files.projects()).toEqual([])
    await expect(proposals.decide(id, true)).rejects.toMatchObject({ code: 'conflict' })
  })
  it('refuses deletion while a real write preview awaits confirmation and allows deletion after cancellation', async () => {
    const project = await files.create('产品')
    const proposals = new SiminProposals(files)
    const exec: ToolExecution = {
      callId: 'fixture' as ToolExecution['callId'], rootCallId: 'fixture' as ToolExecution['rootCallId'],
      token: Symbol('fixture') as ToolExecution['token'], name: 'write', arguments: { file_path: 'a.md', content: 'pending' },
      signal: new AbortController().signal,
      agent: { session: { header: { cwd: project.path }, id: 'fixture' } } as NonNullable<ToolExecution['agent']>,
    }
    const next = vi.fn(async () => ({ kind: 'allow' as const }))
    const running = proposals.gate(exec, next)
    try {
      await vi.waitFor(async () => { expect(await proposals.list()).toHaveLength(1) })
      await expect(proposals.deleteProject(project.name, project.version)).rejects.toMatchObject({ code: 'projectBusy' })
      await proposals.renameProject(project.name, '新名称', project.version)
      const item = (await proposals.list())[0]!
      await proposals.decide(item.id, false)
      expect(await running).toMatchObject({ kind: 'deny' })
      expect(next).not.toHaveBeenCalled()
      await proposals.deleteProject(project.name, project.version)
      expect(await proposals.list()).toEqual([])
    } finally { proposals.dispose(); await running }
  })
  it('cleans retained records older than the sixty-item preview limit', async () => {
    const project = await files.create('产品')
    const dir = await files.metadata('proposals')
    for (let index = 0; index < 62; index++) {
      const id = `12345678-1234-1234-1234-${String(index).padStart(12, '0')}`
      await writeFile(join(dir, `${id}.json`), JSON.stringify({ id, project: project.name, file: 'a.md', sessionId: 'fixture', before: null, after: 'pending', version: null, status: 'interrupted', createdAt: index }))
    }
    const proposals = new SiminProposals(files)
    expect(await proposals.list()).toHaveLength(60)
    await proposals.deleteProject(project.name, project.version)
    expect(await readdir(dir)).toEqual([])
  })
})
