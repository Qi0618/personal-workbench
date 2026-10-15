import type { IconProps } from './icons/props.ts'

/** Native square viewBox of the Lumen C1 mark. */
export const FISH_LOGO_VIEWBOX = { width: 100, height: 100 }

/** Lumen C1 geometry, shared by existing brand-mark consumers. */
export const FISH_LOGO_PATH = 'M8 0H63L47 100H8A8 8 0 0 1 0 92V8A8 8 0 0 1 8 0Z M67 0H92A8 8 0 0 1 100 8V86L86 100H61Z'

/**
 * Render the Lumen C1 mark through the existing brand primitive.
 * @param props.size - square edge in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the decorative mark svg; adjacent text supplies the name.
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return <svg width={size} height={size} className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <path d={FISH_LOGO_PATH} fill="currentColor" />
  </svg>
}
