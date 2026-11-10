/** The «全部项目» main panel: greeting, pending-review banner and project cards. */
import { useState } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { LumenRequestError, type LumenProject } from './api.ts'
import { openProposals } from './controller.ts'
import { IconDocLines, IconPlus, toneOf, type WorkbenchFace } from './shared.tsx'
import { plainName, previewOf, STAGES, stageProgress } from './stages.ts'
import css from './workbench.module.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function greeting(now: Date): string {
  const hour = now.getHours()
  return hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
}

function ProjectCard({ project, onOpen }: { project: LumenProject; onOpen: () => void }) {
  const progress = stageProgress(project.documents)
  const sheets = [...project.files].sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 2).reverse()
  const updated = project.files.reduce((last, file) => Math.max(last, file.modifiedAt), 0)
  return (
    <button type="button" className={css.card} onClick={onOpen}>
      <div className={css.cover} data-tone={toneOf(project.name)}>
        {sheets.length === 0
          ? <span className={css.emptyCover}>还没有文档</span>
          : sheets.map(file => (
            <div key={file.name} className={css.sheet}>
              <strong>{plainName(file.name)}</strong>
              <span>{previewOf(file.name, file.preview)}</span>
            </div>
          ))}
      </div>
      <div className={css.cardBody}>
        <div>
          <div className={css.cardTitle}>{project.title}</div>
          <div className={css.muted}>
            {project.documents.length} 个文档{updated > 0 ? ` · ${new Date(updated).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}更新` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className={css.segments}>
            {progress.stages.map(item => <div key={item.stage.id} className={css.segment} data-state={item.state} />)}
          </div>
          <div className={css.stageLine}><b>{STAGES[progress.current]?.title}</b> · 第 {progress.current + 1} / {STAGES.length} 阶段</div>
        </div>
      </div>
    </button>
  )
}

/**
 * Dialog for a new project, optionally importing a copy of a folder.
 * @param props - close and create callbacks plus the folder picker.
 * @returns the modal.
 */
export function CreateProjectDialog({ open, onClose, nav, onCreated }: {
  open: boolean
  onClose: () => void
  nav: WorkbenchFace['nav']
  onCreated: (project: LumenProject) => void
}) {
  const [name, setName] = useState('')
  const [source, setSource] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const close = (): void => { if (!busy) { setName(''); setSource(null); setError(''); onClose() } }
  const create = async (): Promise<void> => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const project = await nav.createProject(name.trim(), source ?? undefined)
      setName(''); setSource(null)
      onCreated(project)
    } catch (failure: unknown) {
      const code = failure instanceof LumenRequestError ? failure.code : ''
      setError(code === 'invalidName' ? '项目名不能为空，也不能包含 / \\ : 等字符。'
        : code === 'exists' ? '已有同名项目。' : code === 'invalidSourceFolder' ? '这个文件夹不能导入。' : '创建失败，请稍后再试。')
    } finally { setBusy(false) }
  }
  const pick = async (): Promise<void> => {
    try { setSource(await nav.pickSource()) } catch { setError('当前环境不能打开文件夹选择器。') }
  }
  return (
    <Modal open={open} onClose={close} title="新建项目" closeLabel="关闭" footer={(
      <div className={css.actions}>
        <span className={css.grow} />
        <button type="button" className={css.button} onClick={close} disabled={busy}>取消</button>
        <button type="button" className={`${css.button} ${css.primary}`} onClick={() => { void create() }} disabled={busy || !name.trim()}>创建项目</button>
      </div>
    )}>
      <div className={`${css.root} ${css.dialogBody}`}>
        <label className={css.field}>
          项目名
          <input data-modal-autofocus value={name} placeholder="例如：AI 会议纪要助手" disabled={busy}
            onChange={(event) => { setName(event.target.value) }}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void create() }} />
        </label>
        <div className={css.source}>
          {source === null
            ? <><span style={{ flex: 1 }}>可选：导入已有资料文件夹（会复制一份，不改动原文件夹）</span><button type="button" className={css.link} onClick={() => { void pick() }}>选择文件夹</button></>
            : <><code>{source}</code><button type="button" className={css.link} onClick={() => { setSource(null) }}>移除</button></>}
        </div>
        {error && <p className={css.error} role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

/**
 * Render every project as a card.
 * @param props - injected workbench store hook and navigator.
 * @returns the page.
 */
export function ProjectsPanel({ useWorkbench, nav }: InjectFace<WorkbenchFace>) {
  const snapshot = useWorkbench(state => state.snapshot)
  const loaded = useWorkbench(state => state.loaded)
  const failed = useWorkbench(state => state.failed)
  const [creating, setCreating] = useState(false)
  const now = new Date()
  const waiting = openProposals(snapshot)
  const first = waiting[0]
  const firstProject = first === undefined ? undefined : snapshot.projects.find(item => item.name === first.project)
  return (
    <div className={`${css.root} ${css.page}`}>
      <div className={css.pageInner}>
        <div className={css.pageHead}>
          <div>
            <p className={css.eyebrow}>{now.getMonth() + 1} 月 {now.getDate()} 日 · 星期{WEEKDAYS[now.getDay()]}</p>
            <h1 className={css.title}>{greeting(now)}，继续推进哪个项目？</h1>
          </div>
          <button type="button" className={`${css.button} ${css.primary}`} onClick={() => { setCreating(true) }}><IconPlus size={15} />新建项目</button>
        </div>

        {first !== undefined && (
          <div className={css.waitBanner}>
            <span className={css.dockIcon}><IconDocLines /></span>
            <span><strong>{waiting.length} 处修改等待你确认</strong> · {firstProject?.title ?? first.project} ·「{first.file}」</span>
            <button type="button" className={`${css.button} ${css.waitButton}`} onClick={() => { nav.openReview(first) }}>去确认</button>
          </div>
        )}

        {failed && <div className={css.empty}>暂时连不上工作台服务，正在重试…</div>}
        {!loaded ? <div className={css.empty}>正在读取项目…</div> : (
          <div className={css.grid}>
            {snapshot.projects.map(project => (
              <ProjectCard key={project.path} project={project} onOpen={() => { nav.openProject(project.path) }} />
            ))}
            <button type="button" className={css.newCard} onClick={() => { setCreating(true) }}>
              <span className={css.newIcon} style={{ color: 'var(--lm-accent)' }}><IconPlus size={20} /></span>
              <strong style={{ fontSize: 16 }}>新建项目</strong>
              <span className={css.muted} style={{ maxWidth: 220, fontSize: 13 }}>从一个想法开始，或导入已有的资料文件夹</span>
            </button>
          </div>
        )}
      </div>
      <CreateProjectDialog open={creating} onClose={() => { setCreating(false) }} nav={nav}
        onCreated={(project) => { setCreating(false); nav.openProject(project.path) }} />
    </div>
  )
}
