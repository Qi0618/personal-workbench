/**
 * Lumen workbench browser plugin. Mounts into upstream seats only:
 * - `main` panels «全部项目» and «项目主页», with a `sidebar.panellist` entry;
 * - `sidebar.workspaces`, replaced by project navigation;
 * - a right-pane «待确认» page and a `conversation.input.dock` card for reviewed writes.
 * @module @lumen/workbench-ui/client
 */
import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import { createWorkbench, PROJECT_PANEL, PROJECTS_PANEL, REVIEW_TAB_KIND } from './controller.ts'
import { ProjectHomePanel } from './ProjectHomePanel.tsx'
import { ProjectNav } from './ProjectNav.tsx'
import { ProjectsPanel } from './ProjectsPanel.tsx'
import { ReviewDock, ReviewTab } from './Review.tsx'
import { IconGrid, type WorkbenchFace } from './shared.tsx'

/** Right-pane type id; also the key its body registers under. */
const REVIEW_TYPE_ID = '@lumen/workbench-ui/review'

export const inject = ['slots', 'layout', 'uiWorkspace', 'sidebarRight', 'sidebarRightTabs', 'sessions', 'workspaces']

/**
 * Register every workbench surface.
 * @param ctx - browser root context.
 */
export function apply(ctx: Context): void {
  const { store, nav } = createWorkbench(ctx)
  const activePanel: HostObservable<string | null> = {
    getSnapshot: () => ctx.layout.panelInfo.getSnapshot().activePanelId,
    subscribe: listener => ctx.layout.panelInfo.subscribe(listener),
  }
  const face: WorkbenchFace = {
    hooks: {
      workbench: store,
      sessionRows: ctx.sessions.list,
      onScreen: ctx.sidebarRight.mounted,
      activePanel,
    },
    nav,
  }

  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PROJECTS_PANEL, inject: () => face }, ProjectsPanel))
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PROJECT_PANEL, inject: () => face }, ProjectHomePanel))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PROJECTS_PANEL, order: -100, label: '全部项目',
  }, ({ size }: { size: number }) => createElement(IconGrid, { size })))
  // A lower priority than the shipped Workspace browser shadows it (lowest renders).
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({ name: 'sidebar.workspaces', priority: -10, inject: () => face }, ProjectNav))

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: REVIEW_TYPE_ID, kind: REVIEW_TAB_KIND, title: () => '待确认',
  }), 'lumen: review tab type')
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: REVIEW_TYPE_ID, inject: () => face,
  }, ReviewTab))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'lumen.review', order: -100, inject: () => face,
  }, ReviewDock))

  // Open on «全部项目» unless the user is already somewhere.
  ctx.effect(() => {
    const timer = window.setTimeout(() => {
      if (activePanel.getSnapshot() !== null || ctx.sidebarRight.mounted.getSnapshot() !== undefined) return
      try { nav.openProjects() } catch { /* The panel registers with the slot; a later click still works. */ }
    }, 0)
    return () => { window.clearTimeout(timer) }
  }, 'lumen: start on the project list')
}
