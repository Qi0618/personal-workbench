/**
 * Application mount through a dependency fiber, so replacing `uiRenderer`
 * remounts the application. Shared by `AppWebEntry` and the test carrier.
 * @module @deepseek-ai/dsh-client-web/src/mount
 */
import { FiberState, type Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'

/**
 * Mount the UI renderer into `container` through a dependency fiber on
 * `uiRenderer`: the mount effect installs when the service is provided and
 * reinstalls when it is replaced.
 * @param ctx - booted root Context.
 * @param container - application mount point.
 * @param onFailure - Fatal application recovery after the failed React tree has unmounted.
 * @returns resolves once the dependency fiber exists; with `uiRenderer`
 * already provided (as after `bootClient`) the mount effect is installed by
 * then, otherwise it installs when the service arrives.
 */
export async function mountClient(ctx: Context, container: HTMLElement, onFailure?: (reason: unknown) => void): Promise<void> {
  let fatal = false
  const mounted = ctx.inject(['uiRenderer'], (scope) => {
    if (fatal) return
    scope.effect(() => {
      let active = true
      let failed = false
      let unmount: (() => void) | undefined
      const report = (reason: unknown): void => {
        if (!active || failed) return
        failed = true
        queueMicrotask(() => {
          if (!active || ctx.fiber.state === FiberState.UNLOADING || scope.fiber.state === FiberState.UNLOADING) return
          fatal = true
          unmount?.()
          unmount = undefined
          onFailure?.(reason)
        })
      }
      unmount = onFailure === undefined ? scope.uiRenderer.mount(container) : scope.uiRenderer.mount(container, report)
      return () => { active = false; unmount?.(); unmount = undefined }
    }, 'web boot: application mount')
  })
  await mounted
}
