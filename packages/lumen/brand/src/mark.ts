/**
 * The Lumen mark («光隙»): a disc split by a vertical gap of light. The left half
 * takes the surrounding ink, the right half the brand accent. Shared by the
 * browser component and the asset renderer so every surface draws one shape.
 */

/** Product name shown wherever upstream shows its own. */
export const PRODUCT_NAME = 'Lumen'

/** Mark geometry on a 24-unit square. */
export const MARK_VIEWBOX = 24
export const MARK_LEFT_PATH = 'M11 3a9 9 0 0 0 0 18z'
export const MARK_RIGHT_PATH = 'M13 3a9 9 0 0 1 0 18z'

/** Brand colors. `ink` is the light-theme left half; `accent` the right half. */
export const BRAND_COLORS = {
  ink: '#1c1f2a',
  inkDark: '#f3f4f8',
  accent: '#4f46e5',
  accentDark: '#818cf8',
  tile: '#ffffff',
  tileDark: '#16181f',
} as const
