/**
 * Reviewing proposed document writes: the right-pane «待确认» tab shows the full
 * change, and a card above the composer offers the same decision in place.
 * Saving goes through `/aipm/decide`; the Host writes the file only then.
 */
import { useState } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { DiffBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LumenProposal } from './api.ts'
import { openProposals } from './controller.ts'
import { DIFF_LABELS, IconDocLines, type WorkbenchFace } from './shared.tsx'
import css from './workbench.module.css'

type ReviewProps = InjectFace<WorkbenchFace> & { readonly sessionId: string }

function lineCount(text: string): number {
  return text === '' ? 0 : text.split('\n').length
}

function useDecision(nav: WorkbenchFace['nav']) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const decide = async (proposal: LumenProposal, allow: boolean): Promise<void> => {
    setBusy(proposal.id)
    setError('')
    try { await nav.decide(proposal.id, allow) } catch {
      setError(allow ? '保存失败：文档可能已经变化，请让助手重新读取后再提交。' : '操作失败，请稍后再试。')
    } finally { setBusy(null) }
  }
  return { busy, error, decide }
}

function Change({ proposal }: { proposal: LumenProposal }) {
  if (proposal.before !== null) {
    const diffs = [{ path: proposal.file, oldText: proposal.before, newText: proposal.after }]
    return <DiffBlock diffs={diffs} labels={DIFF_LABELS} maxLines={80} />
  }
  return (
    <div className={css.newFile}>
      {proposal.after.split('\n').map((line, index) => (
        // Lines of one immutable proposal never reorder.
        <div key={index}><i>{index + 1}</i><span>+ {line}</span></div>
      ))}
    </div>
  )
}

/**
 * Right-pane page listing the waiting writes of the conversation's project.
 * @param props - injected workbench hooks, navigator and the tab's Session.
 * @returns the review page.
 */
export function ReviewTab({ useWorkbench, useSessionRows, nav, sessionId }: ReviewProps) {
  const snapshot = useWorkbench(state => state.snapshot)
  const cwd = useSessionRows(rows => rows.byId[sessionId]?.cwd)
  const project = snapshot.projects.find(item => item.path === cwd)
  const items = project === undefined ? [] : openProposals(snapshot, project.name)
  const { busy, error, decide } = useDecision(nav)
  return (
    <div className={`${css.root} ${css.review}`}>
      {items.length === 0 && <div className={css.empty}>没有等待确认的修改。助手提出写入文档时，会在这里显示完整内容。</div>}
      {error && <p className={css.error} role="alert">{error}</p>}
      {items.map(item => (
        <section key={item.id} className={css.reviewCard} aria-label={item.file}>
          <div className={css.reviewHead}>
            <div>
              <div className={css.reviewName}>{item.file}</div>
              <div className={css.muted}>{item.status === 'interrupted' ? '对话已中断，仍可手动保存' : item.status === 'failed' ? '上次保存失败' : `来自${item.sessionId === sessionId ? '当前' : '另一段'}对话`}</div>
            </div>
            <span className={css.tag} data-kind={item.before === null ? 'new' : 'edit'}>{item.before === null ? '新建' : '修改'}</span>
          </div>
          <Change proposal={item} />
          <p className={css.muted} style={{ margin: 0 }}>保存后写入项目目录；不保存不会留下任何改动，助手会继续和你讨论。</p>
          <div className={css.actions}>
            <button type="button" className={css.button} style={{ flex: 1 }} disabled={busy !== null} onClick={() => { void decide(item, false) }}>不保存</button>
            <button type="button" className={`${css.button} ${css.primary}`} style={{ flex: 1.4 }} disabled={busy !== null} onClick={() => { void decide(item, true) }}>保存到项目</button>
          </div>
        </section>
      ))}
    </div>
  )
}

/**
 * Composer-dock card for the writes this conversation is waiting on.
 * @param props - injected workbench hooks, navigator and the composer's Session.
 * @returns the card, or nothing when no write waits.
 */
export function ReviewDock({ useWorkbench, nav, sessionId }: ReviewProps) {
  const snapshot = useWorkbench(state => state.snapshot)
  const items = openProposals(snapshot).filter(item => item.sessionId === sessionId)
  const { busy, error, decide } = useDecision(nav)
  const item = items[0]
  if (item === undefined) return null
  const added = lineCount(item.after) - lineCount(item.before ?? '')
  return (
    <div className={`${css.root} ${css.dock}`} role="region" aria-label="等待确认的文档修改">
      <div className={css.dockHead}>
        <span className={css.dockIcon}><IconDocLines /></span>
        <div>
          <div className={css.dockTitle}>{item.before === null ? '新建' : '修改'}「{item.file}」<span className={css.lines}>{added >= 0 ? `+${added}` : added} 行</span></div>
          <div className={css.dockMeta}>
            等待你确认{items.length > 1 ? ` · 还有 ${items.length - 1} 处` : ''} ·{' '}
            <button type="button" className={css.inlineLink} onClick={() => { nav.openReview(item) }}>在右栏查看全文</button>
            {error && <span className={css.error}> {error}</span>}
          </div>
        </div>
        <button type="button" className={css.button} style={{ height: 34, background: 'var(--lm-bg)' }} disabled={busy !== null} onClick={() => { void decide(item, false) }}>不保存</button>
        <button type="button" className={`${css.button} ${css.primary}`} style={{ height: 34 }} disabled={busy !== null} onClick={() => { void decide(item, true) }}>保存到项目</button>
      </div>
    </div>
  )
}
