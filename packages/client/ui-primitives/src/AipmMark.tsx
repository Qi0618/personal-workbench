import type { IconProps } from './icons/props.ts'
import { FishLogo } from './FishLogo.tsx'

/**
 * Render the Lumen C1 mark using the surrounding ink color.
 * @param props - Icon size and optional layout class.
 * @returns an aria-hidden mark; the adjacent wordmark supplies the name.
 */
export function AipmMark(props: IconProps) {
  return <FishLogo {...props} />
}
