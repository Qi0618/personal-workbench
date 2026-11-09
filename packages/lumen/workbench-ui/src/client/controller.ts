/**
 * Workbench state and navigation shared by every Lumen surface: the project
 * pages, the sidebar, the review tab and the composer card all read one store
 * and call one navigator, so they never disagree about where the user is.
 */
import type { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { lumenApi, OPEN_PROPOSAL, type LumenProject, type LumenProposal, type LumenSnapshot } from './api.ts'

/** Main-panel keys owned by the workbench. */
export const PROJECTS_PANEL = 'lumen.projects' as MainPanelId
export const PROJECT_PANEL = 'lumen.project' as MainPanelId
/** Right-pane page kind for pending writes. */
export const REVIEW_TAB_KIND = 'lumen-review'

/** What every surface renders from. */
export interface WorkbenchState {
  snapshot: LumenSnapshot
  loaded: boolean
  failed: boolean
  /** Path of the project the project page shows. */
  project: string | null
  /** Document the project page's reader shows. */
  reading: string | null
}

const EMPTY: LumenSnapshot = { root: '', projects: [], proposals: [] }

/** Actions shared by the workbench surfaces. */
export interface WorkbenchNavigator {
  openProjects(): void
  openProject(path: string, file?: string | null): void
  openChat(path: string, options?: { readonly sessionId?: string; readonly draft?: string }): Promise<void>
  openReview(proposal: LumenProposal): void
  decide(id: string, allow: boolean): Promise<void>
  createProject(name: string, sourcePath?: string): Promise<LumenProject>
  pickSource(): Promise<string | null>
  refresh(): Promise<void>
}

/**
 * Proposals still waiting for the user.
 * @param snapshot - current workbench read.
 * @param project - optional project directory name to filter by.
 * @returns open proposals, newest first.
 */
export function openProposals(snapshot: LumenSnapshot, project?: string): readonly LumenProposal[] {
  return snapshot.proposals.filter(item => OPEN_PROPOSAL.has(item.status) && (project === undefined || item.project === project))
}

/**
 * Create the shared store, start polling, and build the navigator.
 * @param ctx - client plugin context with layout, workspace, session and right-pane services.
 * @returns the store and the navigator.
 */
export function createWorkbench(ctx: Context): { store: SnapshotStore<WorkbenchState>; nav: WorkbenchNavigator } {
  const store = createSnapshotStore<WorkbenchState>({ snapshot: EMPTY, loaded: false, failed: false, project: null, reading: null })
  let inflight: Promise<void> | undefined

  const refresh = (): Promise<void> => {
    inflight ??= lumenApi.state().then(
      (snapshot) => { store.update((draft) => { draft.snapshot = snapshot; draft.loaded = true; draft.failed = false }) },
      () => { store.update((draft) => { draft.loaded = true; draft.failed = true }) },
    ).finally(() => { inflight = undefined })
    return inflight
  }

  // The assistant writes proposals at any moment; a short poll keeps every surface current.
  ctx.effect(() => {
    void refresh()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 2000)
    return () => { window.clearInterval(timer) }
  }, 'lumen: workbench polling')

  const workspaceOf = async (path: string) => (await ctx.workspaces.create({ path })).workspaceId

  /** Most recent non-blank root Session that runs in the project directory. */
  const latestSession = (path: string): SessionId | undefined => {
    const state = ctx.sessions.list.getSnapshot()
    const archived = new Set<string>(ctx.workspaces.list.getSnapshot().archivedSessionIds)
    return state.ids
      .filter((id) => {
        const row = state.byId[id]
        return row !== undefined && row.cwd === path && row.origin !== 'subagent' && !row.blank && !archived.has(id)
      })
      .sort((left, right) => (state.byId[right]?.updatedAt ?? 0) - (state.byId[left]?.updatedAt ?? 0))[0]
  }

  const nav: WorkbenchNavigator = {
    openProjects: () => { ctx.layout.selectPanel(PROJECTS_PANEL) },
    openProject: (path, file = null) => {
      store.update((draft) => { draft.project = path; draft.reading = file })
      ctx.layout.selectPanel(PROJECT_PANEL)
    },
    openChat: async (path, options = {}) => {
      store.update((draft) => { draft.project = path })
      const workspaceId = await workspaceOf(path)
      if (options.draft !== undefined) {
        ctx.uiWorkspace.startSession(workspaceId, { prompt: options.draft, whenDraftExists: 'append' })
        return
      }
      const target = (options.sessionId as SessionId | undefined) ?? latestSession(path)
      if (target !== undefined) ctx.uiWorkspace.openSession(target)
      else await ctx.uiWorkspace.openWorkspace(workspaceId)
    },
    openReview: (proposal) => {
      const sessionId = proposal.sessionId as SessionId
      const reveal = (): void => { ctx.sidebarRight.openTab(REVIEW_TAB_KIND) }
      const onScreen = ctx.sidebarRight.mounted.getSnapshot()
      if (onScreen === sessionId || (onScreen === undefined && ctx.layout.panelInfo.getSnapshot().activePanelId === null)) {
        // A blank conversation may not publish `mounted`; opening the tab directly still works when one is on screen.
        try { reveal(); return } catch { /* fall through and open the proposing conversation first */ }
      }
      // Open the proposing conversation, then the review tab once it is on screen.
      const stop = ctx.sidebarRight.mounted.subscribe(() => {
        if (ctx.sidebarRight.mounted.getSnapshot() !== sessionId) return
        stop()
        reveal()
      })
      window.setTimeout(stop, 10_000)
      const project = store.getSnapshot().snapshot.projects.find(item => item.name === proposal.project)
      if (project !== undefined) store.update((draft) => { draft.project = project.path })
      ctx.uiWorkspace.openSession(sessionId)
    },
    decide: async (id, allow) => {
      await lumenApi.decide(id, allow)
      await refresh()
    },
    createProject: async (name, sourcePath) => {
      const project = await lumenApi.createProject(name, sourcePath)
      await refresh()
      return project
    },
    pickSource: async () => (await lumenApi.pickSource()).path,
    refresh,
  }

  // Follow the conversation on screen so the sidebar knows which project it belongs to.
  ctx.effect(() => ctx.sidebarRight.mounted.subscribe(() => {
    const sessionId = ctx.sidebarRight.mounted.getSnapshot()
    const cwd = sessionId === undefined ? undefined : ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
    if (cwd !== undefined && store.getSnapshot().snapshot.projects.some(item => item.path === cwd)) {
      store.update((draft) => { draft.project = cwd })
    }
  }), 'lumen: follow the on-screen conversation')

  return { store, nav }
}
