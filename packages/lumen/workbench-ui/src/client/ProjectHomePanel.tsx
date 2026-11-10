/** The «项目主页» main panel: stage stepper, recent conversations and an in-panel document reader. */
import { useEffect, useState } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { lumenApi, type LumenDocument, type LumenProject } from './api.ts'
import { openProposals } from './controller.ts'
import { IconChat, IconCheck, IconClose, IconDocLines, MARKDOWN_LABELS, projectSessions, shortDate, type WorkbenchFace } from './shared.tsx'
import { plainName, previewOf, skillPrompt, stageProgress } from './stages.ts'
import css from './workbench.module.css'

function Reader({ project, file, onClose, onQuote }: { project: LumenProject; file: string; onClose: () => void; onQuote: () => void }) {
  const [document, setDocument] = useState<LumenDocument | null>(null)
  const [failed, setFailed] = useState(false)
  const modified = project.files.find(item => item.name === file)?.modifiedAt ?? 0
  useEffect(() => {
    const controller = new AbortController()
    setFailed(false)
    lumenApi.file(project.name, file, controller.signal).then(setDocument, () => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort() }
  }, [project.name, file, modified])
  return (
    <aside className={css.reader} aria-label="文档阅读">
      <div className={css.readerBar}>
        <strong>{plainName(file)}</strong>
        <button type="button" className={css.button} style={{ height: 32 }} onClick={onQuote}>引用到对话</button>
        <button type="button" className={css.iconButton} aria-label="关闭文档" onClick={onClose}><IconClose size={14} /></button>
      </div>
      <article className={css.paper}>
        {failed ? <p className={css.muted}>读取失败，文档可能已被移动或删除。</p>
          : document === null ? <p className={css.muted}>正在读取…</p>
            : <MarkdownText text={document.markdown} labels={MARKDOWN_LABELS} />}
      </article>
    </aside>
  )
}

/**
 * Render the selected project's home.
 * @param props - injected workbench store hooks and navigator.
 * @returns the page, or a hint when the project vanished.
 */
export function ProjectHomePanel({ useWorkbench, useSessionRows, nav }: InjectFace<WorkbenchFace>) {
  const path = useWorkbench(state => state.project)
  const reading = useWorkbench(state => state.reading)
  const snapshot = useWorkbench(state => state.snapshot)
  const rows = useSessionRows(state => state)
  const project = snapshot.projects.find(item => item.path === path)
  const setReading = (file: string | null): void => { if (project !== undefined) nav.openProject(project.path, file) }
  if (project === undefined) {
    return (
      <div className={`${css.root} ${css.page}`}>
        <div className={css.pageInner}>
          <div className={css.empty}>没有找到这个项目，它可能已被重命名或删除。</div>
          <div><button type="button" className={css.button} onClick={() => { nav.openProjects() }}>返回全部项目</button></div>
        </div>
      </div>
    )
  }
  const progress = stageProgress(project.documents)
  const waiting = openProposals(snapshot, project.name)
  const firstWaiting = waiting[0]
  const pendingFiles = new Set(waiting.map(item => item.file))
  const conversations = projectSessions(rows, project.path).slice(0, 5)
  const definition = project.files.find(file => /问题定义|项目启动|背景/u.test(file.name))
  const describe = definition === undefined ? undefined : previewOf(definition.name, definition.preview)

  return (
    <div className={`${css.root} ${css.split}`}>
      <div className={`${css.splitMain} ${css.page}`}>
        <div className={css.pageInner} style={{ paddingTop: 48 }}>
          <div className={css.pageHead}>
            <div>
              <h1 className={css.title}>{project.title}</h1>
              <p className={css.subtitle}>{describe ?? '在对话里说清楚要解决的问题，助手会帮你沉淀成文档。'}</p>
            </div>
            <button type="button" className={`${css.button} ${css.primary}`} onClick={() => { void nav.openChat(project.path) }}><IconChat size={15} />继续对话</button>
          </div>

          {firstWaiting !== undefined && (
            <div className={css.waitBanner}>
              <span className={css.pulse} />
              <span><strong>{firstWaiting.before === null ? '新建' : '修改'}「{firstWaiting.file}」</strong> 等待你确认{waiting.length > 1 ? `（共 ${waiting.length} 处）` : ''}</span>
              <button type="button" className={`${css.button} ${css.waitButton}`} onClick={() => { nav.openReview(firstWaiting) }}>查看修改</button>
            </div>
          )}

          <section aria-labelledby="lumen-stages">
            <h2 id="lumen-stages" className={css.sectionTitle}>工作阶段</h2>
            <div className={css.stepper}>
              {progress.stages.map((item, index) => (
                <div key={item.stage.id} className={css.step} data-state={item.state}>
                  <div className={css.stepHead}>
                    <span className={css.stepDot}>{item.state === 'done' ? <IconCheck size={14} /> : index + 1}</span>
                    <span className={css.stepRail} />
                  </div>
                  <div>
                    <div className={css.stepTitle}>{item.stage.title}{item.state === 'current' ? ' · 进行中' : ''}</div>
                    <div className={css.muted}>{item.stage.skills.map(skill => skill.label).join(' · ')}</div>
                  </div>
                  <div className={css.chips}>
                    {item.documents.map(file => (
                      <button key={file} type="button" className={css.chip} onClick={() => { setReading(file) }}>{plainName(file)}</button>
                    ))}
                    {item.state === 'current' && [...pendingFiles].filter(file => !project.documents.includes(file))
                      .map(file => <span key={file} className={css.chip} data-wait="">{plainName(file)} · 待确认</span>)}
                  </div>
                  {item.state !== 'done' && (
                    <div className={css.skillButtons}>
                      {item.stage.skills.slice(0, 2).map(skill => (
                        <button key={skill.skill} type="button" className={css.link}
                          onClick={() => { void nav.openChat(project.path, { draft: skillPrompt(item.stage, skill) }) }}>
                          用「{skill.label}」开始 →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {progress.other.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className={css.muted} style={{ marginBottom: 8 }}>其他文档</div>
                <div className={css.chips}>
                  {progress.other.map(file => <button key={file} type="button" className={css.chip} onClick={() => { setReading(file) }}>{plainName(file)}</button>)}
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="lumen-recent">
            <h2 id="lumen-recent" className={css.sectionTitle}>最近对话</h2>
            {conversations.length === 0
              ? <div className={css.empty}>还没有对话。点「继续对话」开始第一轮讨论。</div>
              : (
                <div className={css.rows}>
                  {conversations.map(item => (
                    <button key={item.id} type="button" className={css.row} onClick={() => { void nav.openChat(project.path, { sessionId: item.id }) }}>
                      <span className={css.rowIcon} style={{ color: 'var(--lm-accent)' }}><IconChat size={15} /></span>
                      <div><div className={css.rowTitle}>{item.title}</div></div>
                      <span className={css.muted}>{shortDate(item.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
          </section>
        </div>
      </div>
      {reading !== null && project.documents.includes(reading)
        ? <Reader project={project} file={reading} onClose={() => { setReading(null) }}
          onQuote={() => { void nav.openChat(project.path, { draft: `请先阅读项目里的「${reading}」，然后` }) }} />
        : project.documents.length > 0 && (
          <aside className={`${css.reader} ${css.readerList}`} aria-label="文档列表">
            <div className={css.readerBar}><strong>文档</strong></div>
            <div className={css.rows} style={{ padding: '0 8px' }}>
              {project.files.map(file => (
                <button key={file.name} type="button" className={css.row} onClick={() => { setReading(file.name) }}>
                  <span className={css.rowIcon}><IconDocLines size={15} /></span>
                  <div><div className={css.rowTitle}>{plainName(file.name)}</div><div className={css.muted} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewOf(file.name, file.preview)}</div></div>
                </button>
              ))}
            </div>
          </aside>
        )}
    </div>
  )
}
