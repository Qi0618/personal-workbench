// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RunningWhaleTail } from '../src/client/chat/RunningWhaleTail.tsx'

afterEach(cleanup)

describe('RunningWhaleTail', () => {
  it('renders a decorative vector C1 mark without inline styles', () => {
    const view = render(<RunningWhaleTail />)
    const icon = view.container.firstElementChild!
    expect(icon.tagName).toBe('SPAN')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.children).toHaveLength(1)
    const svg = icon.querySelector('svg')!
    expect(icon.lastElementChild).toBe(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100')
    expect(svg.querySelectorAll('path')).toHaveLength(1)
    expect(svg.querySelector('path')?.getAttribute('d')).toContain('M8 0H63L47 100')
    expect(svg.querySelector('path')?.getAttribute('fill')).toBe('currentColor')
    expect(svg.querySelector('path')?.hasAttribute('stroke')).toBe(false)
    expect(view.container.querySelector('animate')).toBeNull()
    expect(view.container.querySelector('[style]')).toBeNull()
  })

  it('limits the pulse to ordinary-motion and ordinary-color preferences', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/client/chat/ChatView.module.css'), 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion: no-preference) and (forced-colors: none)')
    expect(css).toContain('animation: lumen-pulse')
    expect(css).not.toContain('running-whale@2x.png')
  })
})
