/** Lumen C1 mark for the running Chat status. */
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ChatView.module.css'

/**
 * Render the decorative running mark; CSS respects reduced-motion preferences.
 * @returns a vector C1 mark inheriting the status text color.
 */
export function RunningWhaleTail() {
  return <span className={css.runningIcon} aria-hidden="true"><FishLogo size={14} className={css.runningWhaleStill} /></span>
}
