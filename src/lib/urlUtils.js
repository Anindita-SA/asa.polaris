/**
 * Validates that a given URL string is a safe external URL (http or https).
 * Returns the URL if valid, or null otherwise.
 *
 * @param {string} url
 * @returns {string | null}
 */
export function safeExternalUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return null
}
