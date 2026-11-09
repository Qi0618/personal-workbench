/**
 * Sidebar project navigation, occupying `sidebar.workspaces`. Outside a project
 * it lists projects; inside one it shows the project's home, its conversations
 * and its documents. Waiting proposals surface as amber counts in both modes.
 */
import { useState } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { openProposals, PROJECT_PANEL } from './controller.ts'
import { CreateProjectDialog } from './ProjectsPanel.tsx'
import { IconBack, IconChat, IconDoc, IconHome, IconPlus, initialOf, projectSessions, toneOf, type WorkbenchFace } from './shared.tsx'
import { plainName } from './stages.ts'
import css from './workbench.module.css'

/**
 * Render the sidebar's project region.
 * @param props - injected workbench hooks and navigator.
 * @returns the navigation list.
 */
export function ProjectNav({ useWorkbench, useSessionRows, useOnScreen, useActivePanel, nav }: InjectFace<WorkbenchFace>) {
  const snapshot = useWorkbench(state => state.snapshot)
  const selected = useWorkbench(state => state.project)
  const reading = useWorkbench(state => state.reading)
  const rows = useSessionRows(state => state)
  const onScreen = useOnScreen(value => value)
  const panel = useActivePanel(value => value)
  const [creating, setCreating] = useState(false)

  const screenCwd = onScreen === undefined ? undefined : rows.byId[onScreen]?.cwd
  const inChat = panel === null && screenCwd !== undefined && screenCwd === selected
  const project = (panel === PROJECT_PANEL || inChat) ? snapshot.projects.find(item => item.path === selected) : undefined

  if (project === undefined) {
    return (
      <nav className={`${css.root} ${css.nav}`} aria-label="项目">
        <div className={css.navLabel}>
          <span>项目 · {snapshot.projects.length}</span>
          <button type="button" className={css.iconButton} aria-label="新建项目" onClick={() => { setCreating(true) }}><IconPlus size={14} /></button>
        </div>
        {snapshot.projects.map((item) => {
          const waiting = openProposals(snapshot, item.name).length
          return (
            <button key={item.path} type="button" className={css.navItem} onClick={() => { nav.openProject(item.path) }}>
              <span className={css.badge} data-tone={toneOf(item.name)}>{initialOf(item.title)}</span>
              <span className={css.label}>{item.title}</span>
              {waiting > 0 && <span className={css.count}><span className={css.dot} />{waiting}</span>}
            </button>
          )
        })}
        {snapshot.projects.length === 0 && <p className={css.muted} style={{ padding: '4px 10px' }}>还没有项目，点 + 新建一个。</p>}
        <CreateProjectDialog open={creating} onClose={() => { setCreating(false) }} nav={nav}
          onCreated={(created) => { setCreating(false); nav.openProject(created.path) }} />
      </nav>
    )
  }

  const waiting = openProposals(snapshot, project.name).length
  const conversations = projectSessions(rows, project.path)
  return (
    <nav className={`${css.root} ${css.nav}`} aria-label={project.title}>
      <button type="button" className={`${css.navItem} ${css.back}`} onClick={() => { nav.openProjects() }}><IconBack size={14} />全部项目</button>
      <div className={css.projectHead}>
        <span className={css.badge} data-tone={toneOf(project.name)}>{initialOf(project.title)}</span>
        <span className={css.label}>{project.title}</span>
      </div>
      <button type="button" className={css.navItem} aria-current={panel === PROJECT_PANEL && reading === null ? 'page' : undefined}
        onClick={() => { nav.openProject(project.path) }}>
        <IconHome /><span className={css.label}>项目主页</span>
      </button>
      <button type="button" className={css.navItem} aria-current={inChat ? 'page' : undefined}
        onClick={() => { void nav.openChat(project.path) }}>
        <IconChat /><span className={css.label}>对话</span>
        {waiting > 0 && <span className={css.count}><span className={css.dot} />{waiting}</span>}
      </button>
      {conversations.map(item => (
        <button key={item.id} type="button" className={`${css.navItem} ${css.navSub}`}
          aria-current={inChat && onScreen === item.id ? 'page' : undefined}
          onClick={() => { void nav.openChat(project.path, { sessionId: item.id }) }}>
          <span className={css.label}>{item.title}</span>
        </button>
      ))}
      <div className={css.navLabel}><span>文档 · {project.documents.length}</span></div>
      {project.documents.map(file => (
        <button key={file} type="button" className={css.navItem}
          aria-current={panel === PROJECT_PANEL && reading === file ? 'page' : undefined}
          onClick={() => { nav.openProject(project.path, file) }}>
          <IconDoc size={14} /><span className={css.label}>{plainName(file)}</span>
        </button>
      ))}
    </nav>
  )
}
