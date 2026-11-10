/**
 * Lumen brand browser plugin. Fills the upstream brand seats only:
 * - `sidebar.brand.mark` / `sidebar.brand.name` — the sidebar identity;
 * - `conversation.hero.brand.mark` — the mark above a blank conversation;
 * - the accent color, by re-tinting the theme's blue scale (see theme.module.css).
 * @module @lumen/brand/client
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { LumenMark, LumenName } from './LumenMark.tsx'
import './theme.module.css'

export const inject = ['slots']

/**
 * Lower than any shipped occupant (the official profile registers at 0), so Lumen renders.
 */
const PRIORITY = -10

/**
 * Register the Lumen identity into every brand seat.
 * @param ctx - browser root context.
 */
export function apply(ctx: Context): void {
  ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register({ name: 'sidebar.brand.mark', priority: PRIORITY }, LumenMark))
  ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({ name: 'sidebar.brand.name', priority: PRIORITY }, LumenName))
  ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
    name: 'conversation.hero.brand.mark', priority: PRIORITY,
  }, LumenMark))
}
