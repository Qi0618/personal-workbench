// @vitest-environment jsdom
/** Creation follows the source-folder copy workflow without publishing incomplete input. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { CreateProjectDialog } from '../src/client/CreateProjectDialog.tsx'
import { siminZh } from '../src/client/simin-locales.ts'

const t = makeTranslate(siminZh)
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function mount(options: { busy?: boolean; error?: string } = {}) {
  const create = vi.fn()
  const close = vi.fn()
  const view = render(<CreateProjectDialog busy={options.busy ?? false} error={options.error ?? ''}
    onCreate={create} onClose={close} t={t} />)
  return { ...view, create, close }
}

describe('Create project dialog', () => {
  it('uses the window-owned Desktop picker and keeps its selection after native cancellation', async () => {
    const pick = vi.fn().mockResolvedValueOnce('/资料/桌面资料').mockResolvedValueOnce(null)
    const fetch = vi.fn()
    vi.stubGlobal('__DSH_DIRECTORY_PICKER__', { pick })
    vi.stubGlobal('fetch', fetch)
    const { create } = mount()
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('/资料/桌面资料')
    fireEvent.click(screen.getByRole('button', { name: '更换文件夹' }))
    await screen.findByRole('button', { name: '更换文件夹' })
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }))
    expect(create).toHaveBeenCalledWith({ name: '桌面资料', sourcePath: '/资料/桌面资料' })
    expect(pick).toHaveBeenCalledTimes(2)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('focuses the name, blocks empty names and composition Enter, and submits an empty project', () => {
    const { create } = mount()
    const input = screen.getByRole('textbox', { name: '项目名称' })
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: '创建项目' })
    expect(document.activeElement).toBe(input)
    expect(submit.disabled).toBe(true)
    expect({
      title: screen.getByRole('dialog').getAttribute('aria-label'),
      source: screen.getByRole('region').getAttribute('aria-label'),
      actions: screen.getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent),
    }).toMatchInlineSnapshot(`
      {
        "actions": [
          "关闭",
          "添加",
          "默认记忆",
          "创建项目",
        ],
        "source": "源文件夹",
        "title": "创建项目",
      }
    `)
    fireEvent.change(input, { target: { value: '  哥本哈根之旅  ' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(create).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(create).toHaveBeenCalledWith({ name: '哥本哈根之旅' })
    expect(screen.getByText(siminZh.sourceCopyHint)).toBeTruthy()
  })

  it('selects a folder, suggests its name, and submits its path for copying', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ path: '/资料/旅行资料' })))
    const { create } = mount()
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('/资料/旅行资料')
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('旅行资料')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '我的旅行' } })
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }))
    expect(create).toHaveBeenCalledWith({ name: '我的旅行', sourcePath: '/资料/旅行资料' })
    fireEvent.click(screen.getByRole('button', { name: '移除源文件夹' }))
    expect(screen.queryByText('/资料/旅行资料')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }))
    expect(create).toHaveBeenLastCalledWith({ name: '我的旅行' })
  })

  it('keeps a typed name and selected folder when replacement is cancelled or fails', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ path: '/资料/旅行资料' }))
      .mockResolvedValueOnce(Response.json({ path: null }))
      .mockResolvedValueOnce(Response.json({ error: 'sourceFolderUnavailable' }, { status: 400 }))
    vi.stubGlobal('fetch', fetch)
    mount()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '自定义名称' } })
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('/资料/旅行资料')
    fireEvent.click(screen.getByRole('button', { name: '更换文件夹' }))
    await screen.findByRole('button', { name: '更换文件夹' })
    fireEvent.click(screen.getByRole('button', { name: '更换文件夹' }))
    expect((await screen.findByRole('alert')).textContent).toBe(siminZh.sourceFolderUnavailable)
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('自定义名称')
    expect(screen.getByText('/资料/旅行资料')).toBeTruthy()
  })

  it('blocks submission while picking and aborts the chooser when the dialog unmounts', async () => {
    let requestSignal: AbortSignal | null | undefined
    vi.stubGlobal('fetch', vi.fn((_path: string, options: RequestInit) => {
      requestSignal = options.signal
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => { reject(new Error('cancelled')) }, { once: true })
      })
    }))
    const { create, unmount } = mount()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '项目' } })
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '创建项目' }).disabled).toBe(true)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(create).not.toHaveBeenCalled()
    unmount()
    await waitFor(() => { expect(requestSignal?.aborted).toBe(true) })
  })

  it('explains the supported memory behavior and closes its menu before the dialog on Escape', () => {
    const { close } = mount()
    fireEvent.click(screen.getByRole('button', { name: '默认记忆' }))
    expect(screen.getByText(siminZh.defaultMemoryHint)).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(close).not.toHaveBeenCalled()
  })

  it('retains creation errors and prevents dismissal during creation', () => {
    const { close } = mount({ busy: true, error: siminZh.duplicate })
    expect(screen.getByRole('alert').textContent).toBe(siminZh.duplicate)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '正在创建…' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '关闭' }).disabled).toBe(true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(close).not.toHaveBeenCalled()
  })
})
