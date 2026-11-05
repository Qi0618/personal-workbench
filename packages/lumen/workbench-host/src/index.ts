/**
 * Lumen workbench Host plugin: serves the `/aipm/*` routes over local project
 * documents, keeps reviewed document writes on the tool pipeline, and mirrors
 * projects into the conversation Workspace registry.
 * @module @lumen/workbench-host
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-api-workspace-controller'
import type {} from '@deepseek-ai/dsh-working-directory'
import type {} from '@deepseek-ai/dsh-workspace'
import { AIPM_PRODUCT_ROOT, handleAipmRequest, SIMIN_ROUTES } from './aipm-products.ts'
import { SiminFiles } from './simin-files.ts'
import { installSiminProposals, SiminProposals } from './simin-proposals.ts'

export { AIPM_PRODUCT_ROOT, SIMIN_ROUTES } from './aipm-products.ts'
export { SiminFileError, SiminFiles } from './simin-files.ts'
export type { SiminDocument, SiminFile, SiminProject, SiminTrash } from './simin-files.ts'
export { SiminProposals } from './simin-proposals.ts'
export type { SiminProposal } from './simin-proposals.ts'

/** Stable Cordis plugin name. */
export const name = 'lumen-workbench-host'

/** The routes need the HTTP carrier and its browser trust fence. */
export const inject = ['webServer', 'connection']

/** Plugin configuration. */
export interface Config {
  /** Directory holding one sub-directory per project; relative paths resolve from the Host working directory. */
  projectRoot: string
}

export const Config: z<Partial<Config>, Config> = z.object({
  projectRoot: z.transform(z.string(), (value) => {
    if (!value.trim()) throw new Error('lumen-workbench-host: projectRoot must not be empty')
    return resolve(value)
  }).default(AIPM_PRODUCT_ROOT),
})

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface WorkbenchConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/**
 * Read the composition's connection service (typed locally: its package is browser-side).
 * @param ctx - plugin context.
 * @returns the connection trust surface.
 */
function connectionOf(ctx: Context): WorkbenchConnection {
  return Reflect.get(ctx, 'connection') as WorkbenchConnection
}

/**
 * Mount the workbench routes and the reviewed-write policy.
 * @param ctx - plugin context.
 * @param config - resolved configuration.
 */
export function apply(ctx: Context, config: Config): void {
  const files = new SiminFiles(config.projectRoot)
  const proposals = new SiminProposals(files, (exec) => {
    const session = exec.agent?.session
    return session === undefined ? undefined : ctx.get('workingDirectory')?.get(session)
  })
  installSiminProposals(ctx, proposals)

  // Keep project scans, mutations and their Workspace projection in request order.
  let requestTail = Promise.resolve()
  const requests = new AbortController()
  ctx.effect(() => async () => { requests.abort(); await requestTail }, 'workbench: settle pending requests')

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const rejection = connectionOf(ctx).requestRejection(req)
    if (rejection !== undefined) {
      res.statusCode = rejection
      res.end()
      return
    }
    const workspaces = ctx.get('workspaceRegistry')
    const picker = ctx.get('directoryPickerController')
    const pending = requestTail.then(() => handleAipmRequest(req, res, {
      files, proposals, workspaces, signal: requests.signal,
      pickSource: picker === undefined ? undefined : signal => picker.pick(signal),
    }))
    requestTail = pending.then(() => {}, () => {})
    if (!await pending) {
      res.writeHead(404)
      res.end()
    }
  }
  for (const path of SIMIN_ROUTES) {
    ctx.effect(() => ctx.webServer.register({ kind: 'exact', path, handler }), `workbench: ${path}`)
  }
}
