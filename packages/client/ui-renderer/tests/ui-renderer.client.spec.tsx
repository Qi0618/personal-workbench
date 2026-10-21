// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { useState } from 'react'
import { SlotRegistry } from '../src/client/registry.ts'
import type { SlotScopeAdapter, StandardSourceBinding } from '../src/client/index.ts'
import { apply as nodeApply } from '@deepseek-ai/dsh-client-ui-renderer'
import * as UiRenderer from '../src/client/index.ts'

const mounted: (() => void)[] = []

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'renderer.failure-leaf': { kind: 'single'; scope: 'root' }
  }
}

afterEach(() => {
  act(() => { for (const unmount of mounted.splice(0)) unmount() })
  vi.restoreAllMocks()
  cleanup()
  document.body.innerHTML = ''
})

const stabilize = async (fn: () => void | Promise<void>): Promise<void> => {
  await act(async () => { await fn() })
}

async function bench(adapterInstalled = true) {
  const ctx = new Context()
  const fiber = ctx.plugin({ inject: [...UiRenderer.inject], apply: UiRenderer.apply })
  await fiber.await()
  const slots = ctx.get('slots') as SlotRegistry
  const absentBinding: StandardSourceBinding = {
    key: undefined,
    hooks: {},
    keyedHooks: {},
    props: {},
  }
  const current = {
    getSnapshot: () => absentBinding,
    subscribe: () => () => {},
  }
  const adapter: SlotScopeAdapter = {
    current,
    bindingSource: () => current,
  }
  const adapterOwner = adapterInstalled ? ctx.plugin({ inject: ['slots'], apply: (scope: Context) => {
    scope.slots.installScope('session', adapter)
  } }) : undefined
  await adapterOwner?.await()
  return { ctx, slots, fiber, adapterOwner }
}

function container(): HTMLElement {
  const el = document.createElement('div')
  document.body.append(el)
  return el
}

describe('UI renderer plugin', () => {
  it('provides no host-side behavior', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })

  it('installs the renderer and mounts the assembled application', async () => {
    const { ctx, slots } = await bench()
    slots.register({ name: 'root' }, () => <div data-testid="root-probe" />)
    const renderer = ctx.get('uiRenderer')
    expect(renderer).toBeDefined()
    const el = container()
    act(() => { mounted.push(renderer!.mount(el)) })
    expect(el.querySelector('[data-testid="root-probe"]')).toBeTruthy()
  })

  it('hydrates the boot page before switching to the assembled application', async () => {
    const { ctx, slots } = await bench()
    slots.register({ name: 'root' }, () => <div data-testid="root-probe" />)
    const el = container()
    el.innerHTML = '<div class="boot" data-dsh-boot=""><div><div class="spinner" data-dsh-boot-spinner="" style="--dsh-boot-arc: 180deg"></div><div>Loading plugins…</div></div></div>'
    const boot = el.firstElementChild
    const observer = new MutationObserver(() => {})
    observer.observe(el, { childList: true, subtree: true })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    act(() => { mounted.push(ctx.get('uiRenderer')!.mount(el)) })

    const records = observer.takeRecords()
    observer.disconnect()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
    expect(el.querySelector('[data-testid="root-probe"]')).toBeTruthy()
    expect(records.some(record => record.target === boot)).toBe(false)
  })

  it('returns an unmount disposer', async () => {
    const { ctx, slots } = await bench()
    slots.register({ name: 'root' }, () => <div data-testid="root-probe" />)
    const el = container()
    let unmount: () => void = () => {}
    act(() => { unmount = ctx.get('uiRenderer')!.mount(el) })
    act(() => { unmount() })
    expect(el.querySelector('[data-testid="root-probe"]')).toBeNull()
  })

  it.each([false, true])('reports assembly failure with boot hydration=%s', async (hydrate) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx } = await bench()
    const el = container()
    if (hydrate) el.innerHTML = '<div data-dsh-boot="">Loading plugins</div>'
    const failure = vi.fn()
    act(() => { mounted.push(ctx.get('uiRenderer')!.mount(el, failure)) })
    expect(failure).toHaveBeenCalledOnce()
    expect(String(failure.mock.calls[0]![0])).toContain("'root' has no registration")
  })

  it.each([false, true])('reports a missing scope adapter with boot hydration=%s', async (hydrate) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx, slots } = await bench(false)
    slots.register({ name: 'root' }, () => <div>Application</div>)
    const el = container()
    if (hydrate) el.innerHTML = '<div data-dsh-boot="">Loading plugins</div>'
    const failure = vi.fn()
    act(() => { mounted.push(ctx.get('uiRenderer')!.mount(el, failure)) })
    expect(failure).toHaveBeenCalledOnce()
    expect(String(failure.mock.calls[0]![0])).toContain("scope 'session-maybe' rendered without an installed adapter")
  })

  it('reports a root render failure after the application mounted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx, slots } = await bench()
    const error = new Error('root update failed')
    let crash: () => void = () => {}
    slots.register({ name: 'root' }, () => {
      const [failed, setFailed] = useState(false)
      crash = () => { setFailed(true) }
      if (failed) throw error
      return <div>Working application</div>
    })
    const failure = vi.fn()
    const el = container()
    act(() => { mounted.push(ctx.get('uiRenderer')!.mount(el, failure)) })
    expect(failure).not.toHaveBeenCalled()
    act(() => { crash() })
    expect(failure).toHaveBeenCalledExactlyOnceWith(error)
  })

  it('reports scope adapter removal after a successful mount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx, slots, adapterOwner } = await bench()
    slots.register({ name: 'root' }, () => <div>Working application</div>)
    const failure = vi.fn()
    const el = container()
    act(() => { mounted.push(ctx.get('uiRenderer')!.mount(el, failure)) })
    expect(el.textContent).toBe('Working application')
    expect(failure).not.toHaveBeenCalled()
    await stabilize(() => adapterOwner!.dispose())
    expect(failure).toHaveBeenCalledOnce()
    expect(String(failure.mock.calls[0]![0])).toContain("scope 'session-maybe' rendered without an installed adapter")
  })

  it('keeps leaf failures isolated from application recovery', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx, slots } = await bench()
    slots.register({ name: 'root', children: { 'renderer.failure-leaf': { kind: 'single', scope: 'root' } } }, props => (
      <div><span>Working application</span>{props.renderSlot('renderer.failure-leaf', {})}</div>
    ))
    slots.register({ name: 'renderer.failure-leaf' }, () => { throw new Error('leaf failed') })
    const failure = vi.fn()
    const el = container()
    act(() => { mounted.push(ctx.get('uiRenderer')!.mount(el, failure)) })
    expect(el.textContent).toContain('Working application')
    expect(failure).not.toHaveBeenCalled()
  })

  it('retracts the service and renderer with its fiber', async () => {
    const { ctx, slots, fiber } = await bench()
    await stabilize(() => fiber.dispose())
    expect(ctx.get('uiRenderer')).toBeUndefined()
    expect(() => slots.renderSlot('root', {})).toThrow('not installed')
  })
})
