import { MARK_LEFT_PATH, MARK_RIGHT_PATH, MARK_VIEWBOX, PRODUCT_NAME } from '../mark.ts'
import css from './brand.module.css'

/** Presentation requested by the host surface. */
export interface LumenMarkProps {
  readonly size?: number | undefined
  readonly className?: string | undefined
}

/**
 * Render the Lumen mark; the left half follows the surrounding text color.
 * @param props - square edge in pixels and an optional host class.
 * @returns the decorative mark; adjacent text supplies the name.
 */
export function LumenMark({ size = 24, className }: LumenMarkProps) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`} className={className} aria-hidden="true">
      <path d={MARK_LEFT_PATH} fill="currentColor" />
      <path d={MARK_RIGHT_PATH} className={css.accent} />
    </svg>
  )
}

/**
 * Sidebar product name.
 * @returns the name in the brand typeface.
 */
export function LumenName() {
  return <span className={css.name}>{PRODUCT_NAME}</span>
}
