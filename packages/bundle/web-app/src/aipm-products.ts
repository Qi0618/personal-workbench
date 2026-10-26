/** Loopback-only Simin project, document, trash and proposal HTTP endpoints. */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import { synchronizeSiminWorkspaces } from './simin-workspaces.ts'
import { SiminFileError, SiminFiles } from './simin-files.ts'
import { SiminProposals } from './simin-proposals.ts'

/** Default projects directory beside the source checkout or installed runtime. */
export const AIPM_PRODUCT_ROOT = fileURLToPath(new URL('../../../../projects', import.meta.url))
/** Exact endpoint list registered on the Host. */
export const SIMIN_ROUTES = ['/aipm/product', '/aipm/projects', '/aipm/file', '/aipm/stage', '/aipm/state', '/aipm/mutate', '/aipm/decide', '/aipm/search', '/aipm/source-folder']

/**
 * Validate a project or document path component.
 * @param value - legacy path name.
 * @returns a safe single component, or empty.
 */
export function sanitizeSegment(value: string): string {
  const cleaned = value.replace(/[\\/:\0]/gu, ' ').replace(/\s+/gu, ' ').trim()
  return cleaned === '' || cleaned === '.' || cleaned === '..' ? '' : cleaned.slice(0, 80)
}
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    bytes += buffer.length
    if (bytes > 2_100_000) throw new SiminFileError('unsupportedFile', 413)
    chunks.push(buffer)
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new SiminFileError('invalidData')
  return value as Record<string, unknown>
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new SiminFileError('invalidData')
  return value
}
function localRequest(req: IncomingMessage): boolean {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) return false
  const origin = req.headers.origin
  if (origin === undefined) return req.headers['sec-fetch-site'] !== 'cross-site'
  if (origin === 'dsh-app://app') return true
  try { const url = new URL(origin); return url.host === req.headers.host && ['http:', 'https:'].includes(url.protocol) }
  catch (error: unknown) { void error; return false }
}
/**
 * Handle local workbench routes and return structured errors.
 * @param req - local HTTP request.
 * @param res - response.
 * @param workbench - filesystem and proposal owners, plus the optional conversation Workspace registry.
 * @returns whether a Simin endpoint answered.
 */
export async function handleAipmRequest(
  req: IncomingMessage, res: ServerResponse,
  workbench: {
    files: SiminFiles
    proposals: SiminProposals
    workspaces?: WorkspaceRegistry | undefined
    pickSource?: ((signal: AbortSignal) => Promise<string | null>) | undefined
    signal?: AbortSignal
  },
): Promise<boolean> {
  const { files: siminFiles, proposals: siminProposals, workspaces } = workbench
  const projects = async () => {
    const rows = await siminFiles.projects()
    if (workspaces !== undefined) await synchronizeSiminWorkspaces(siminFiles.root, rows, workspaces)
    return rows
  }
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (!SIMIN_ROUTES.includes(url.pathname)) return false
  if (!localRequest(req)) { sendJson(res, 403, { error: 'localOnly' }); return true }
  const controller = new AbortController()
  const signal = workbench.signal === undefined ? controller.signal : AbortSignal.any([controller.signal, workbench.signal])
  const cancel = (): void => { controller.abort() }
  res.once('close', cancel)
  try {
    if (req.method === 'GET') {
      if (url.pathname === '/aipm/projects') sendJson(res, 200, { projects: await projects() })
      else if (url.pathname === '/aipm/state') sendJson(res, 200, {
        root: siminFiles.root, projects: await projects(),
        trash: await siminFiles.trashList(), proposals: await siminProposals.list(),
      })
      else if (url.pathname === '/aipm/search') {
        const phrase = (url.searchParams.get('query') ?? '').trim().toLocaleLowerCase()
        const items: { project: string; file: string }[] = []
        if (phrase) for (const project of await siminFiles.projects()) {
          for (const file of project.documents) {
            const content = await siminFiles.read(project.name, file)
            if (`${file} ${content.markdown}`.toLocaleLowerCase().includes(phrase)) items.push({ project: project.name, file })
          }
        }
        sendJson(res, 200, { items })
      }
      else if (url.pathname === '/aipm/file') sendJson(res, 200, await siminFiles.read(url.searchParams.get('project') ?? '', url.searchParams.get('file') ?? ''))
      else if (url.pathname === '/aipm/product') {
        const name = url.searchParams.get('name') ?? ''
        const project = (await siminFiles.projects()).find(item => item.name === name)
        if (project === undefined) throw new SiminFileError('missing', 404)
        sendJson(res, 200, { outputs: project.documents })
      } else sendJson(res, 405, { error: 'method' })
      return true
    }
    if (req.method !== 'POST') { sendJson(res, 405, { error: 'method' }); return true }
    const data = await body(req)
    if (url.pathname === '/aipm/source-folder') {
      if (workbench.pickSource === undefined) throw new SiminFileError('sourceFolderUnavailable')
      sendJson(res, 200, { path: await workbench.pickSource(signal) })
    } else if (url.pathname === '/aipm/projects') {
      const project = await siminFiles.create(data.name, data.sourcePath === undefined ? undefined : string(data.sourcePath), signal)
      await projects()
      sendJson(res, 201, project)
    }
    else if (url.pathname === '/aipm/decide') {
      if (typeof data.allow !== 'boolean') throw new SiminFileError('invalidData')
      await siminProposals.decide(string(data.id), data.allow)
      sendJson(res, 200, { ok: true })
    } else if (url.pathname === '/aipm/mutate') {
      const op = string(data.op)
      if (op === 'renameProject') {
        const project = await siminProposals.renameProject(string(data.project), string(data.name), string(data.version))
        await projects()
        sendJson(res, 200, { ok: true, project })
        return true
      }
      if (op === 'deleteProject') {
        await siminProposals.deleteProject(string(data.project), string(data.version))
        await projects()
      }
      else if (op === 'restore' || op === 'purge') await siminFiles.restore(string(data.id), data.version, op === 'purge')
      else if (op === 'rename') await siminFiles.rename(string(data.project), string(data.file), string(data.name), data.version)
      else if (op === 'trash') await siminFiles.trash(string(data.project), string(data.file), data.version)
      else if (op === 'save') await siminFiles.save(string(data.project), string(data.file), string(data.markdown), data.version)
      else throw new SiminFileError('invalidData')
      sendJson(res, 200, { ok: true })
    } else if (url.pathname === '/aipm/stage') {
      const fileName = `${sanitizeSegment(string(data.stageTitle))}.md`
      await siminFiles.save(string(data.productName), fileName, string(data.markdown), data.version ?? null)
      sendJson(res, 200, { fileName })
    } else sendJson(res, 405, { error: 'method' })
  } catch (error: unknown) {
    const code = error instanceof SiminFileError ? error.code : error instanceof Error && 'code' in error && error.code === 'ENOENT' ? 'missing' : 'io'
    sendJson(res, error instanceof SiminFileError ? error.status : code === 'missing' ? 404 : 400, { error: code })
  } finally { res.off('close', cancel) }
  return true
}
