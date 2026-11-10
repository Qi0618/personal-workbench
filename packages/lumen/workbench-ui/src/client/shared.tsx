/** Icons, the injected face type, and small helpers shared by the workbench surfaces. */
import type { ReactNode } from 'react'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkbenchNavigator, WorkbenchState } from './controller.ts'

/** The Session-list fields the workbench reads. */
export interface SessionRows {
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, {
    readonly cwd?: string
    readonly updatedAt: number
    readonly blank: boolean
    readonly origin?: string
    readonly displayTitle?: string
  } | undefined>>
}

/** What every workbench slot entry receives through `inject`. */
export interface WorkbenchFace {
  readonly hooks: {
    readonly workbench: HostObservable<WorkbenchState>
    readonly sessionRows: HostObservable<SessionRows>
    readonly onScreen: HostObservable<string | undefined>
    readonly activePanel: HostObservable<string | null>
  }
  readonly nav: WorkbenchNavigator
}

/**
 * A project's root conversations, newest first.
 * @param rows - Session list.
 * @param path - project directory.
 * @returns Session ids with their row.
 */
export function projectSessions(rows: SessionRows, path: string): { id: string; title: string; updatedAt: number }[] {
  return rows.ids.flatMap((id) => {
    const row = rows.byId[id]
    if (row === undefined || row.cwd !== path || row.origin === 'subagent' || row.blank) return []
    return [{ id, title: row.displayTitle ?? '未命名对话', updatedAt: row.updatedAt }]
  }).sort((left, right) => right.updatedAt - left.updatedAt)
}

function Stroke({ size = 16, children, width = 1.8 }: { size?: number | undefined; children: ReactNode; width?: number | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  )
}

export const IconGrid = ({ size }: { size?: number | undefined }) => <Stroke size={size}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Stroke>
export const IconHome = ({ size }: { size?: number | undefined }) => <Stroke size={size}><path d="M4 11l8-7 8 7v9H4z" /></Stroke>
export const IconChat = ({ size }: { size?: number | undefined }) => <Stroke size={size}><path d="M5 5h14v10H9l-4 4z" /></Stroke>
export const IconDoc = ({ size }: { size?: number | undefined }) => <Stroke size={size}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></Stroke>
export const IconDocLines = ({ size }: { size?: number | undefined }) => <Stroke size={size}><path d="M7 3h7l5 5v13H7z" /><path d="M10 13h6M10 17h4" /></Stroke>
export const IconPlus = ({ size }: { size?: number | undefined }) => <Stroke size={size} width={2.2}><path d="M12 5v14M5 12h14" /></Stroke>
export const IconBack = ({ size }: { size?: number | undefined }) => <Stroke size={size} width={2}><path d="M15 6l-6 6 6 6" /></Stroke>
export const IconCheck = ({ size }: { size?: number | undefined }) => <Stroke size={size} width={3}><path d="M5 12l5 5 9-10" /></Stroke>
export const IconClose = ({ size }: { size?: number | undefined }) => <Stroke size={size} width={2}><path d="M6 6l12 12M18 6L6 18" /></Stroke>

/**
 * Stable tone (0–2) for a project, so its badge and card colour never change.
 * @param key - project directory name.
 * @returns tone index.
 */
export function toneOf(key: string): number {
  let hash = 0
  for (const char of key) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return hash % 3
}

/**
 * First visible character of a title, for the coloured badge.
 * @param title - project title.
 * @returns one character.
 */
export function initialOf(title: string): string {
  const first = new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(title.trim())[Symbol.iterator]().next()
  return first.done === true ? '·' : first.value.segment
}

/**
 * Short relative date for list rows.
 * @param time - epoch milliseconds.
 * @returns e.g. 今天 14:20, 昨天, 11 月 3 日.
 */
export function shortDate(time: number): string {
  const date = new Date(time)
  const now = new Date()
  const day = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diff = Math.round((day(now) - day(date)) / 86_400_000)
  if (diff === 0) return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  if (diff === 1) return '昨天'
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

/** Labels the upstream Markdown and diff primitives need. */
export const MARKDOWN_LABELS = { code: { copyLabel: '复制', copiedLabel: '已复制' }, footnotes: '注释' }
export const DIFF_LABELS = {
  codeLabel: '差异', wrapLabel: '自动换行', unwrapLabel: '取消换行', copy: '复制', copied: '已复制',
  collapseAria: '收起', expandAria: (hidden: number) => `展开其余 ${hidden} 行`, collapse: '收起', expand: (hidden: number) => `展开其余 ${hidden} 行`,
}
