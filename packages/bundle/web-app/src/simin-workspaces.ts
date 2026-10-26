/** Project titles and directory existence projected into the conversation Workspace registry. */
import { lstat, realpath } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import type { SiminProject } from './simin-files.ts'

/**
 * Reconcile workbench-owned Workspace registrations after a successful project scan.
 * @param root - project root; resolved before comparing canonical Workspace paths.
 * @param projects - current real project directories and authoritative display titles.
 * @param registry - active Host Workspace registry.
 * @returns completion after title updates and removal of confirmed missing direct children; files and Sessions are retained.
 */
export async function synchronizeSiminWorkspaces(
  root: string, projects: readonly SiminProject[], registry: WorkspaceRegistry,
): Promise<void> {
  const canonicalRoot = await realpath(root)
  for (const workspace of registry.list()) {
    if (dirname(workspace.path) !== canonicalRoot || basename(workspace.path).startsWith('.')) continue
    try { await lstat(workspace.path) }
    catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      await registry.delete(workspace.id)
    }
  }
  for (const project of projects) {
    const workspace = await registry.create(project.path, project.title)
    if (workspace.title !== project.title) await workspace.setTitle(project.title)
  }
}
