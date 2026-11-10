/**
 * Lumen shell patch: shows the product as «Lumen» in every Desktop dictionary
 * without editing each translated string, so upstream copy changes merge cleanly.
 * Only the visible name changes; `app.name`, the bundle id, the `dsh` protocol
 * and the user-data directory keep upstream values.
 */

/** Product name shown by the Desktop shell. */
export const LUMEN_PRODUCT_NAME = 'Lumen'

/** «DeepSeek Harness», or a standalone «Harness» used as the product name. */
const UPSTREAM_NAME = /DeepSeek Harness|\bHarness\b/gu

/**
 * Replace the upstream product name in every message, in place, so the
 * exported dictionaries and the resolved ones stay the same objects.
 * @param dictionaries - shipped dictionaries keyed by language.
 */
export function applyLumenName(dictionaries: Readonly<Record<string, Record<string, string>>>): void {
  for (const messages of Object.values(dictionaries)) {
    for (const [key, text] of Object.entries(messages)) messages[key] = text.replace(UPSTREAM_NAME, LUMEN_PRODUCT_NAME)
  }
}
