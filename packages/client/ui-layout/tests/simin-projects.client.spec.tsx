// @vitest-environment jsdom
/** Project actions use the real menu and modal over a mutable Host snapshot. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { SiminShell } from '../src/client/SiminShell.tsx'
import type { SiminProject, SiminSnapshot } from '../src/client/simin-api.ts'
import { siminZh } from '../src/client/simin-locales.ts'
import { loadSiminView, saveSiminView, SIMIN_OPEN_PROJECT_EVENT } from '../src/client/simin-state.ts'

const t = makeTranslate(siminZh)
const project = (name: string): SiminProject => ({ name, title: name, version: 'project-v1', path: `/projects/${name}`, documents: ['说明.md'], files: [{ name: '说明.md', modifiedAt: 1, bytes: 4, preview: '内容' }] })
let state: SiminSnapshot
let mutations: Record<string, unknown>[]
let mutationError: string | null

beforeEach(() => {
  localStorage.clear()
  state = { root: '/projects', projects: [project('妙想'), project('奇思')], trash: [], proposals: [] }
  mutations = []
  mutationError = null
  vi.stubGlobal('fetch', vi.fn(async (input: string, options?: RequestInit) => {
    if (input === '/aipm/state') return Response.json(state)
    if (input.startsWith('/aipm/file?')) return Response.json({ markdown: '内容', version: 'v1' })
    if (input !== '/aipm/mutate' || typeof options?.body !== 'string') throw new Error(`Unexpected request: ${input}`)
    const data: Record<string, unknown> = JSON.parse(options.body)
    mutations.push(data)
    if (mutationError !== null) return Response.json({ error: mutationError }, { status: 409 })
    if (data.op === 'renameProject' && typeof data.name === 'string') {
      const title = data.name.trim()
      state = { ...state, projects: state.projects.map(item => item.name === data.project ? { ...item, title } : item) }
      return Response.json({ ok: true, project: state.projects.find(item => item.name === data.project) })
    }
    if (data.op === 'deleteProject') {
      state = { ...state, projects: state.projects.filter(item => item.name !== data.project) }
      return Response.json({ ok: true })
    }
    throw new Error(`Unexpected operation: ${String(data.op)}`)
  }))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })

async function mount(): Promise<void> {
  render(<SiminShell chat={<div>Conversation</div>} nativeSettings={null} t={t} />)
  await screen.findByRole('button', { name: '项目操作：妙想' })
}
function openActions(name = '妙想'): HTMLElement {
  const trigger = screen.getByRole('button', { name: `项目操作：${name}` })
  trigger.focus()
  fireEvent.click(trigger)
  return trigger
}
function choose(label: '重命名项目' | '删除项目'): HTMLElement {
  openActions()
  fireEvent.click(screen.getByRole('menuitem', { name: label }))
  return screen.getByRole('dialog', { name: label })
}

describe('Simin project actions', () => {
  it('opens the project menu without navigating and returns keyboard focus on Escape', async () => {
    const open = vi.fn()
    window.addEventListener(SIMIN_OPEN_PROJECT_EVENT, open)
    try {
      await mount()
      const trigger = openActions()
      const rename = screen.getByRole('menuitem', { name: '重命名项目' })
      const remove = screen.getByRole('menuitem', { name: '删除项目' })
      expect([rename, remove].map(item => ({ label: item.textContent, destructive: item.className.includes('danger') }))).toMatchInlineSnapshot(`
        [
          {
            "destructive": false,
            "label": "重命名项目",
          },
          {
            "destructive": true,
            "label": "删除项目",
          },
        ]
      `)
      expect(document.querySelector('[data-simin-page]')?.getAttribute('data-simin-page')).toBe('home')
      expect(open).not.toHaveBeenCalled()
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      expect(document.activeElement).toBe(rename)
      fireEvent.keyDown(rename, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(remove)
      fireEvent.keyDown(remove, { key: 'Escape' })
      expect(screen.queryByRole('menu')).toBeNull()
      expect(document.activeElement).toBe(trigger)
      openActions()
      fireEvent.pointerDown(document.body)
      expect(screen.queryByRole('menu')).toBeNull()
      expect(mutations).toEqual([])
    } finally { window.removeEventListener(SIMIN_OPEN_PROJECT_EVENT, open) }
  })

  it('renames the visible card and navigation while retaining the directory, conversation and document selection', async () => {
    saveSiminView({ project: '妙想', file: '说明.md', page: 'home', tab: 'document' })
    const open = vi.fn()
    window.addEventListener(SIMIN_OPEN_PROJECT_EVENT, open)
    try {
      await mount()
      expect(open).toHaveBeenCalledTimes(1)
      const dialog = choose('重命名项目')
      const name = within(dialog).getByRole('textbox', { name: '项目名称' })
      expect((name as HTMLInputElement).value).toBe('妙想')
      fireEvent.change(name, { target: { value: '  新想法  ' } })
      fireEvent.click(within(dialog).getByRole('button', { name: '重命名项目' }))
      await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull() })
      expect(mutations).toEqual([{ op: 'renameProject', project: '妙想', name: '  新想法  ', version: 'project-v1' }])
      expect(screen.queryByRole('button', { name: '项目操作：妙想' })).toBeNull()
      expect(screen.getByRole('button', { name: '项目操作：新想法' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '新想法' })).toBeTruthy()
      expect(loadSiminView()).toMatchObject({ project: '妙想', file: '说明.md', page: 'home', tab: 'document' })
      expect(state.projects[0]).toMatchObject({ name: '妙想', title: '新想法', path: '/projects/妙想', version: 'project-v1' })
      expect(open).toHaveBeenCalledTimes(1)
    } finally { window.removeEventListener(SIMIN_OPEN_PROJECT_EVENT, open) }
  })

  it('retains the rename form and project when a duplicate name is refused', async () => {
    mutationError = 'duplicate'
    await mount()
    const dialog = choose('重命名项目')
    fireEvent.change(within(dialog).getByRole('textbox', { name: '项目名称' }), { target: { value: '奇思' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '重命名项目' }))
    await waitFor(() => { expect(within(dialog).getByRole('alert')).toBeTruthy() })
    expect(within(dialog).getByRole('alert').textContent).toBe(siminZh.duplicate)
    expect(screen.getByRole('button', { name: '项目操作：妙想' })).toBeTruthy()
    expect(state.projects.map(item => item.name)).toEqual(['妙想', '奇思'])
    expect((within(dialog).getByRole('textbox') as HTMLInputElement).value).toBe('奇思')
  })

  it('shows the named project and permanent deletion warning, and cancels without a request', async () => {
    await mount()
    const dialog = choose('删除项目')
    expect({
      title: dialog.getAttribute('aria-label'),
      project: within(dialog).getByRole('heading', { level: 3 }).textContent,
      warning: dialog.querySelector('p')?.textContent,
      initialFocus: document.activeElement?.textContent,
    }).toMatchInlineSnapshot(`
      {
        "initialFocus": "取消",
        "project": "妙想",
        "title": "删除项目",
        "warning": "将永久删除该项目及其中的全部文件，同时清除关联的回收站文档和保存记录，无法恢复",
      }
    `)
    expect(mutations).toEqual([])
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: '项目操作：妙想' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '项目操作：妙想' }))
    expect(mutations).toEqual([])
  })

  it('returns focus to the project actions trigger when rename is cancelled', async () => {
    await mount()
    const dialog = choose('重命名项目')
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '项目操作：妙想' }))
    expect(mutations).toEqual([])
  })

  it('deletes only the confirmed project and clears its remembered selection', async () => {
    saveSiminView({ project: '妙想', file: '说明.md', page: 'home', tab: 'document' })
    await mount()
    const dialog = choose('删除项目')
    fireEvent.click(within(dialog).getByRole('button', { name: '删除项目' }))
    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull() })
    expect(mutations).toEqual([{ op: 'deleteProject', project: '妙想', version: 'project-v1' }])
    expect(screen.queryByRole('button', { name: '项目操作：妙想' })).toBeNull()
    expect(screen.getByRole('button', { name: '项目操作：奇思' })).toBeTruthy()
    expect(loadSiminView()).toMatchObject({ project: null, file: null, page: 'home' })
    expect(document.querySelector('[data-simin-page]')?.getAttribute('data-simin-page')).toBe('home')
  })

  it('keeps another selected project when deleting a different card', async () => {
    saveSiminView({ project: '奇思', file: '说明.md', page: 'home', tab: 'document' })
    await mount()
    const dialog = choose('删除项目')
    fireEvent.click(within(dialog).getByRole('button', { name: '删除项目' }))
    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull() })
    expect(loadSiminView()).toMatchObject({ project: '奇思', file: '说明.md' })
    expect(screen.getByRole('button', { name: '项目操作：奇思' })).toBeTruthy()
  })

  it('retains the project and confirmation when deletion fails', async () => {
    mutationError = 'io'
    await mount()
    const dialog = choose('删除项目')
    fireEvent.click(within(dialog).getByRole('button', { name: '删除项目' }))
    await waitFor(() => { expect(within(dialog).getByRole('alert')).toBeTruthy() })
    expect(within(dialog).getByRole('alert').textContent).toBe(siminZh.io)
    expect(screen.getByRole('button', { name: '项目操作：妙想' })).toBeTruthy()
    expect(state.projects.map(item => item.name)).toEqual(['妙想', '奇思'])
  })

  it('sends the observed project identity and keeps the card when the Host rejects a stale confirmation', async () => {
    mutationError = 'projectConflict'
    await mount()
    const dialog = choose('删除项目')
    fireEvent.click(within(dialog).getByRole('button', { name: '删除项目' }))
    await waitFor(() => { expect(within(dialog).getByRole('alert')).toBeTruthy() })
    expect(mutations).toEqual([{ op: 'deleteProject', project: '妙想', version: 'project-v1' }])
    expect(within(dialog).getByRole('alert').textContent).toBe(siminZh.projectConflict)
    expect(screen.getByRole('button', { name: '项目操作：妙想' })).toBeTruthy()
    expect(state.projects.map(item => item.name)).toEqual(['妙想', '奇思'])
  })
})
