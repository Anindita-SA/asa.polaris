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

/**
 * Creates a valid mailto: URL with properly encoded subject and body.
 */
export function createMailtoUrl({ email, subject, body } = {}) {
  if (!email || typeof email !== 'string') return ''
  const trimmed = email.trim()
  const params = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  const query = params.length > 0 ? `?${params.join('&')}` : ''
  return `mailto:${trimmed}${query}`
}

/**
 * Creates a Gmail Web compose link.
 */
export function createGmailComposeUrl({ email, subject, body } = {}) {
  if (!email || typeof email !== 'string') return ''
  const params = ['view=cm', 'fs=1', `to=${encodeURIComponent(email.trim())}`]
  if (subject) params.push(`su=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  return `https://mail.google.com/mail/?${params.join('&')}`
}

/**
 * Creates a search query URL for academic faculty / lab profiles.
 */
export function createAcademicSearchUrl(name, institution) {
  const query = `${name || ''} ${institution || ''} lab profile`.trim()
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`
}
