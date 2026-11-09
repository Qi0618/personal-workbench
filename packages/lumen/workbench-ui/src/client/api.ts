/**
 * Browser client for the `/aipm/*` routes served by `@lumen/workbench-host`.
 * Requests ride the page's own login cookie, so the Host's connection fence admits them.
 */

/** One document's disk metadata and a short preview. */
export interface LumenFile {
  readonly name: string
  readonly modifiedAt: number
  readonly bytes: number
  readonly preview: string
}

/** One project directory. `name` is the directory; `title` is what people see. */
export interface LumenProject {
  readonly name: string
  readonly title: string
  readonly path: string
  readonly version: string
  readonly documents: readonly string[]
  readonly files: readonly LumenFile[]
}

/** A document write the assistant proposed; it waits for the user's decision while `pending`. */
export interface LumenProposal {
  readonly id: string
  readonly project: string
  readonly file: string
  readonly sessionId: string
  readonly createdAt: number
  readonly before: string | null
  readonly after: string
  readonly version: string | null
  readonly status: 'pending' | 'approved' | 'saved' | 'rejected' | 'interrupted' | 'failed'
}

/** Current text of one document with its optimistic version token. */
export interface LumenDocument {
  readonly markdown: string
  readonly version: string
}

/** Everything the workbench pages render from. */
export interface LumenSnapshot {
  readonly root: string
  readonly projects: readonly LumenProject[]
  readonly proposals: readonly LumenProposal[]
}

/** A refused request; `code` is the Host's stable error code. */
export class LumenRequestError extends Error {
  /**
   * @param code - Host error code, or `http-<status>` when the body carried none.
   */
  constructor(readonly code: string) { super(code) }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(path, { credentials: 'same-origin', ...init, headers })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const code = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `http-${response.status}`
    throw new LumenRequestError(code)
  }
  return body as T
}

const post = <T>(path: string, data: unknown, signal?: AbortSignal): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data), ...signal === undefined ? {} : { signal } })

/** Typed calls over the workbench routes. */
export const lumenApi = {
  /** Projects and proposals in one read. */
  state: (signal?: AbortSignal): Promise<LumenSnapshot> =>
    request<LumenSnapshot>('/aipm/state', signal === undefined ? undefined : { signal }),
  /** One document's current text. */
  file: (project: string, file: string, signal?: AbortSignal): Promise<LumenDocument> =>
    request<LumenDocument>(`/aipm/file?project=${encodeURIComponent(project)}&file=${encodeURIComponent(file)}`,
      signal === undefined ? undefined : { signal }),
  /** Create a project, optionally importing a copy of an existing folder. */
  createProject: (name: string, sourcePath?: string): Promise<LumenProject> =>
    post<LumenProject>('/aipm/projects', sourcePath === undefined ? { name } : { name, sourcePath }),
  /** Ask the Host's native folder picker for an import source. */
  pickSource: (signal?: AbortSignal): Promise<{ path: string | null }> =>
    post<{ path: string | null }>('/aipm/source-folder', {}, signal),
  /** Save or discard one proposed write. */
  decide: (id: string, allow: boolean): Promise<void> =>
    post<{ ok: true }>('/aipm/decide', { id, allow }).then(() => undefined),
}

/** Statuses that still need the user. */
export const OPEN_PROPOSAL = new Set<LumenProposal['status']>(['pending', 'interrupted', 'failed'])
