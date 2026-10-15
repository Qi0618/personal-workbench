import type { IconProps } from './icons/props.ts'
import { FISH_LOGO_PATH } from './FishLogo.tsx'
import css from './BrandWordmark.module.css'
import { brandCopy } from './locales.ts'

/** Display options for the Lumen brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading C1 tile; defaults to true. */
  includeMark?: boolean | undefined
}

/**
 * Render the Lumen name with an optional leading C1 tile.
 * @param props.size - height in px (default 24; width follows the artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading C1 tile.
 * @returns the decorative wordmark svg.
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 108 : 78
  return <svg width={(size * width) / 24} height={size} className={className} viewBox={`0 0 ${width} 24`} fill="none" aria-hidden="true">
    {includeMark && <>
      <rect className={css.tile} width="24" height="24" rx="6" />
      <svg className={css.mark} x="5" y="5" width="14" height="14" viewBox="0 0 100 100">
        <path d={FISH_LOGO_PATH} fill="currentColor" />
      </svg>
    </>}
    <text className={css.name} x={includeMark ? 32 : 0} y="19" fill="currentColor">{brandCopy.name}</text>
  </svg>
}
