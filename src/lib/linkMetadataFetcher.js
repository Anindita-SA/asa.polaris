import { safeExternalUrl } from './urlUtils.js'

/**
 * Universal Link Metadata Fetcher for Polaris Media & Lit
 * 
 * Multi-Tier Strategy:
 * 1. Academic Paper Identifier Detection (DOI, arXiv, ResearchGate / Journal Slugs)
 * 2. Direct CORS-friendly Academic APIs (OpenAlex, Crossref, arXiv)
 * 3. General Web Article Metadata (Microlink API with graceful rate-limit handling)
 * 4. Fallback URL Slug & Domain Heuristic parser (guarantees non-blocking manual entry)
 * 5. Optional Groq LLM Enhancement (for sharp 1-line takeaways and topic tags)
 */

// Regex patterns for identifier extraction
const DOI_REGEX = /10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i
const ARXIV_REGEX = /arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+(?:v[0-9]+)?)/i
const RESEARCHGATE_REGEX = /researchgate\.net\/publication\/(\d+)(?:_([^/?#]+))?/i

/**
 * Cleans a URL slug into a human-readable title string
 */
export function cleanSlugToTitle(slug) {
  if (!slug) return ''
  let cleaned = decodeURIComponent(slug)
    .replace(/[._\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Capitalize first letter if all lowercase
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  return cleaned
}

/**
 * Extracts a DOI from any string or URL
 */
export function extractDoiFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.match(DOI_REGEX)
  return match ? match[0].replace(/[.,;)]+$/, '') : null
}

/**
 * Extracts an arXiv ID from a URL
 */
export function extractArxivIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.match(ARXIV_REGEX)
  return match ? match[1] : null
}

/**
 * Extracts potential paper title from a ResearchGate or journal URL
 */
export function extractTitleSlugFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  
  // 1. ResearchGate specific
  const rgMatch = url.match(RESEARCHGATE_REGEX)
  if (rgMatch && rgMatch[2]) {
    return cleanSlugToTitle(rgMatch[2])
  }

  // 2. Generic journal/article pathname slug (last segment)
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1]
      // Skip if last segment is just an ID or file extension
      if (lastSegment.length > 15 && !lastSegment.match(/^\d+$/) && !lastSegment.endsWith('.html')) {
        return cleanSlugToTitle(lastSegment.replace(/\.pdf$/i, ''))
      }
      if (segments.length > 1) {
        const prevSegment = segments[segments.length - 2]
        if (prevSegment.length > 15 && !prevSegment.match(/^\d+$/)) {
          return cleanSlugToTitle(prevSegment)
        }
      }
    }
  } catch (e) {
    // invalid URL format
  }
  return null
}

/**
 * Fetches paper metadata from OpenAlex API (100% Free, CORS-friendly)
 */
export async function fetchFromOpenAlex({ doi, title }) {
  try {
    let endpoint = ''
    if (doi) {
      endpoint = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`
    } else if (title) {
      endpoint = `https://api.openalex.org/works?search=${encodeURIComponent(title)}&per_page=1`
    } else {
      return null
    }

    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()

    const item = doi ? json : (json.results && json.results[0] ? json.results[0] : null)
    if (!item || !item.title) return null

    // Format authors
    let authorsStr = ''
    if (Array.isArray(item.authorships) && item.authorships.length > 0) {
      const names = item.authorships
        .map(a => a.author?.display_name || a.raw_author_name)
        .filter(Boolean)
      if (names.length <= 3) {
        authorsStr = names.join(', ')
      } else {
        authorsStr = `${names.slice(0, 3).join(', ')}, et al.`
      }
    }

    // Reconstruct abstract from inverted index if present
    let abstractText = ''
    if (item.abstract_inverted_index) {
      const wordsByPosition = []
      for (const [word, positions] of Object.entries(item.abstract_inverted_index)) {
        positions.forEach(pos => {
          wordsByPosition[pos] = word
        })
      }
      abstractText = wordsByPosition.filter(Boolean).join(' ')
    }

    // Journal/Venue name
    const venueName = item.primary_location?.source?.display_name || item.host_venue?.display_name || ''
    const pubYear = item.publication_year ? String(item.publication_year) : ''
    const landingUrl = item.primary_location?.landing_page_url || item.doi || ''

    // Concept / Topic tags
    const tags = []
    if (Array.isArray(item.concepts)) {
      item.concepts.slice(0, 4).forEach(c => {
        if (c.display_name && c.score > 0.4) {
          tags.push(c.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
        }
      })
    }
    if (!tags.includes('research-paper')) tags.push('research-paper')

    return {
      title: item.title,
      author_or_creator: authorsStr,
      media_type: 'paper',
      date_finished: item.publication_date || (pubYear ? `${pubYear}-01-01` : ''),
      recommended_by: venueName ? `${venueName}${pubYear ? ` (${pubYear})` : ''}` : '',
      one_line_takeaway: abstractText ? abstractText.slice(0, 200).replace(/\s+[^\s]*$/, '...') : `${item.title} (${pubYear || 'Research Paper'})`,
      full_review: abstractText ? `${abstractText}\n\nURL: ${landingUrl || doi || ''}` : `URL: ${landingUrl || doi || ''}`,
      tags: tags.filter(Boolean),
      cover_url: '',
      doi: item.doi || (doi ? `https://doi.org/${doi}` : '')
    }
  } catch (err) {
    console.warn('OpenAlex fetch failed:', err)
    return null
  }
}

/**
 * Fetches paper metadata from Crossref REST API (100% Free, CORS-friendly)
 */
export async function fetchFromCrossref({ doi, title }) {
  try {
    let endpoint = ''
    if (doi) {
      endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`
    } else if (title) {
      endpoint = `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=1`
    } else {
      return null
    }

    const res = await fetch(endpoint)
    if (!res.ok) return null
    const json = await res.json()

    let item = null
    if (doi && json.message) {
      item = json.message
    } else if (json.message?.items && json.message.items.length > 0) {
      item = json.message.items[0]
    }

    if (!item) return null

    const resolvedTitle = Array.isArray(item.title) ? item.title[0] : item.title
    if (!resolvedTitle) return null

    // Format authors
    let authorsStr = ''
    if (Array.isArray(item.author) && item.author.length > 0) {
      const names = item.author.map(a => {
        if (a.given && a.family) return `${a.given} ${a.family}`
        return a.name || a.family || ''
      }).filter(Boolean)

      if (names.length <= 3) {
        authorsStr = names.join(', ')
      } else {
        authorsStr = `${names.slice(0, 3).join(', ')}, et al.`
      }
    }

    // Clean abstract from JATS XML tags if present
    let cleanAbstract = ''
    if (item.abstract) {
      cleanAbstract = item.abstract.replace(/<[^>]+>/g, '').trim()
    }

    const containerTitle = Array.isArray(item['container-title']) ? item['container-title'][0] : (item['container-title'] || item.publisher || '')
    const itemDoi = item.DOI ? `https://doi.org/${item.DOI}` : ''
    
    // Publication date
    let pubDate = ''
    const dateParts = item['published-online']?.['date-parts']?.[0] || item['published-print']?.['date-parts']?.[0] || item.created?.['date-parts']?.[0]
    if (Array.isArray(dateParts) && dateParts.length > 0) {
      const [year, month = 1, day = 1] = dateParts
      pubDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    const tags = ['research-paper']
    if (item.subject && Array.isArray(item.subject)) {
      item.subject.slice(0, 3).forEach(s => {
        tags.push(s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
      })
    }

    return {
      title: resolvedTitle,
      author_or_creator: authorsStr,
      media_type: 'paper',
      date_finished: pubDate,
      recommended_by: containerTitle,
      one_line_takeaway: cleanAbstract ? cleanAbstract.slice(0, 200).replace(/\s+[^\s]*$/, '...') : `${resolvedTitle} (${containerTitle || 'Paper'})`,
      full_review: cleanAbstract ? `${cleanAbstract}\n\nURL: ${item.URL || itemDoi}` : `URL: ${item.URL || itemDoi}`,
      tags: tags.filter(Boolean),
      cover_url: '',
      doi: itemDoi
    }
  } catch (err) {
    console.warn('Crossref fetch failed:', err)
    return null
  }
}

/**
 * Fetches paper metadata from arXiv public API
 */
export async function fetchFromArxiv(arxivId) {
  try {
    const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`)
    if (!res.ok) return null
    const xmlText = await res.text()

    let title = ''
    let summary = ''
    let published = ''
    let authorsStr = ''
    const tags = ['arxiv', 'research-paper']

    try {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
        const entries = xmlDoc.getElementsByTagName('entry')
        if (entries.length > 0) {
          const entry = entries[0]
          title = entry.getElementsByTagName('title')[0]?.textContent?.replace(/\s+/g, ' ').trim() || ''
          summary = entry.getElementsByTagName('summary')[0]?.textContent?.replace(/\s+/g, ' ').trim() || ''
          published = entry.getElementsByTagName('published')[0]?.textContent?.slice(0, 10) || ''

          const authorNodes = entry.getElementsByTagName('name')
          const authors = Array.from(authorNodes).map(n => n.textContent?.trim()).filter(Boolean)
          if (authors.length > 0) {
            authorsStr = authors.length <= 3 ? authors.join(', ') : `${authors.slice(0, 3).join(', ')}, et al.`
          }

          const categories = entry.getElementsByTagName('category')
          Array.from(categories).forEach(c => {
            const term = c.getAttribute('term')
            if (term) tags.push(term.toLowerCase())
          })
        }
      }
    } catch (e) {}

    // Fallback regex parsing if DOMParser failed to find fields
    if (!title) {
      const titleMatch = xmlText.match(/<entry>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i)
      if (titleMatch) title = titleMatch[1].replace(/\s+/g, ' ').trim()
    }
    if (!summary) {
      const sumMatch = xmlText.match(/<entry>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>/i)
      if (sumMatch) summary = sumMatch[1].replace(/\s+/g, ' ').trim()
    }
    if (!published) {
      const pubMatch = xmlText.match(/<entry>[\s\S]*?<published[^>]*>([\s\S]*?)<\/published>/i)
      if (pubMatch) published = pubMatch[1].slice(0, 10)
    }
    if (!authorsStr) {
      const authorMatches = Array.from(xmlText.matchAll(/<author>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>/gi))
      const names = authorMatches.map(m => m[1].replace(/\s+/g, ' ').trim()).filter(Boolean)
      if (names.length > 0) {
        authorsStr = names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')}, et al.`
      }
    }

    if (!title) return null

    return {
      title,
      author_or_creator: authorsStr,
      media_type: 'paper',
      date_finished: published,
      recommended_by: `arXiv:${arxivId}`,
      one_line_takeaway: summary ? summary.slice(0, 200).replace(/\s+[^\s]*$/, '...') : title,
      full_review: `${summary}\n\nURL: https://arxiv.org/abs/${arxivId}`,
      tags: tags.slice(0, 5),
      cover_url: '',
    }
  } catch (err) {
    console.warn('arXiv fetch failed:', err)
    return null
  }
}

/**
 * Fetches general web article/media metadata from Microlink API with error handling
 */
export async function fetchFromMicrolink(url) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null
    const json = await res.json()

    if (json.status !== 'success' || !json.data) return null
    const data = json.data

    const title = data.title || ''
    if (!title) return null

    const author = data.author || data.publisher || ''
    const description = data.description || ''
    const image = data.image?.url || data.logo?.url || ''
    
    // Determine media type heuristic
    let mediaType = 'article'
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) {
      mediaType = 'video'
    } else if (lowerUrl.includes('spotify.com') || lowerUrl.includes('podcasts.apple.com') || lowerUrl.includes('overcast.fm')) {
      mediaType = 'podcast'
    } else if (lowerUrl.includes('goodreads.com') || lowerUrl.includes('books.google.com') || lowerUrl.includes('amazon.com/dp/')) {
      mediaType = 'book'
    }

    const domain = (new URL(url)).hostname.replace(/^www\./, '')
    const tags = [mediaType]
    if (domain) tags.push(domain.split('.')[0])

    return {
      title,
      author_or_creator: author,
      media_type: mediaType,
      date_finished: data.date ? data.date.slice(0, 10) : '',
      recommended_by: data.publisher || domain,
      one_line_takeaway: description ? description.slice(0, 200).replace(/\s+[^\s]*$/, '...') : title,
      full_review: description ? `${description}\n\nURL: ${url}` : `URL: ${url}`,
      tags: tags.filter(Boolean),
      cover_url: image || '',
    }
  } catch (err) {
    console.warn('Microlink fetch failed/timed out:', err)
    return null
  }
}

/**
 * Resilient URL fallback heuristic if all network APIs are unreachable or blocked
 */
export function createFallbackFromUrl(url) {
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname.replace(/^www\./, '')
    const slugTitle = extractTitleSlugFromUrl(url) || domain

    return {
      title: slugTitle,
      author_or_creator: domain,
      media_type: 'article',
      date_finished: '',
      recommended_by: domain,
      one_line_takeaway: `${slugTitle} via ${domain}`,
      full_review: `URL: ${url}`,
      tags: ['article', domain.split('.')[0]],
      cover_url: '',
    }
  } catch (e) {
    return {
      title: 'Dropped Link',
      author_or_creator: '',
      media_type: 'article',
      date_finished: '',
      recommended_by: '',
      one_line_takeaway: '',
      full_review: `URL: ${url}`,
      tags: ['article'],
      cover_url: '',
    }
  }
}

const ACADEMIC_DOMAINS = [
  'researchgate.net',
  'arxiv.org',
  'doi.org',
  'springer.com',
  'nature.com',
  'ieee.org',
  'sciencedirect.com',
  'wiley.com',
  'mdpi.com',
  'frontiersin.org',
  'biorxiv.org',
  'medrxiv.org',
  'ssrn.com',
  'semanticscholar.org',
  'ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'tandfonline.com',
  'cell.com',
  'pnas.org',
  'sciencemag.org',
  'science.org',
  'acm.org',
  'iop.org',
  'aps.org',
  'jstor.org',
  'osf.io'
]

function isAcademicUrl(url) {
  try {
    const hostname = (new URL(url)).hostname.toLowerCase()
    return ACADEMIC_DOMAINS.some(d => hostname.includes(d))
  } catch (e) {
    return false
  }
}

/**
 * Main Entry Point: Automatically fetches details for any dropped link
 * 
 * @param {string} rawUrl - The user dropped URL
 * @returns {Promise<{ metadata: Object, source: string }>}
 */
export async function autoFetchLinkMetadata(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Please provide a valid URL')
  }

  const trimmed = rawUrl.trim()
  const cleanUrl = safeExternalUrl(trimmed)
  if (!cleanUrl) {
    throw new Error('Invalid URL format. Please start with http:// or https://')
  }

  const isAcademic = isAcademicUrl(cleanUrl)

  // 1. Check for arXiv URL
  const arxivId = extractArxivIdFromUrl(cleanUrl)
  if (arxivId) {
    const arxivResult = await fetchFromArxiv(arxivId)
    if (arxivResult) {
      return { metadata: { ...arxivResult, status: 'want_to' }, source: 'arXiv API' }
    }
    const openAlexArxiv = await fetchFromOpenAlex({ title: arxivId })
    if (openAlexArxiv) {
      return { metadata: { ...openAlexArxiv, status: 'want_to' }, source: 'OpenAlex' }
    }
  }

  // 2. Check for DOI in URL
  const doi = extractDoiFromUrl(cleanUrl)
  if (doi) {
    const openAlexDoi = await fetchFromOpenAlex({ doi })
    if (openAlexDoi) {
      return { metadata: { ...openAlexDoi, status: 'want_to' }, source: 'OpenAlex (DOI)' }
    }
    const crossrefDoi = await fetchFromCrossref({ doi })
    if (crossrefDoi) {
      return { metadata: { ...crossrefDoi, status: 'want_to' }, source: 'Crossref (DOI)' }
    }
  }

  // 3. For recognized academic domains (e.g. ResearchGate, Nature, IEEE), query Academic APIs via title slug
  if (isAcademic) {
    const titleSlug = extractTitleSlugFromUrl(cleanUrl)
    if (titleSlug && titleSlug.length >= 10) {
      const openAlexResult = await fetchFromOpenAlex({ title: titleSlug })
      if (openAlexResult) {
        return { 
          metadata: { 
            ...openAlexResult, 
            full_review: openAlexResult.full_review.includes('URL:') 
              ? openAlexResult.full_review.replace(/URL:\s*https?:\/\/[^\s\n]+/i, `URL: ${cleanUrl}`)
              : `${openAlexResult.full_review}\n\nURL: ${cleanUrl}`,
            status: 'want_to' 
          }, 
          source: 'OpenAlex (Paper Search)' 
        }
      }

      const crossrefResult = await fetchFromCrossref({ title: titleSlug })
      if (crossrefResult) {
        return { 
          metadata: { 
            ...crossrefResult, 
            full_review: crossrefResult.full_review.includes('URL:') 
              ? crossrefResult.full_review.replace(/URL:\s*https?:\/\/[^\s\n]+/i, `URL: ${cleanUrl}`)
              : `${crossrefResult.full_review}\n\nURL: ${cleanUrl}`,
            status: 'want_to' 
          }, 
          source: 'Crossref (Paper Search)' 
        }
      }
    }
  }

  // 4. General Article / Webpage (Microlink API)
  const microlinkResult = await fetchFromMicrolink(cleanUrl)
  if (microlinkResult) {
    return { metadata: { ...microlinkResult, status: 'want_to' }, source: 'Microlink API' }
  }

  // 5. Fallback title search if non-academic Microlink failed
  const fallbackTitleSlug = extractTitleSlugFromUrl(cleanUrl)
  if (fallbackTitleSlug && fallbackTitleSlug.length >= 10) {
    const openAlexFallback = await fetchFromOpenAlex({ title: fallbackTitleSlug })
    if (openAlexFallback) {
      return { 
        metadata: { 
          ...openAlexFallback, 
          full_review: `${openAlexFallback.full_review}\n\nURL: ${cleanUrl}`,
          status: 'want_to' 
        }, 
        source: 'OpenAlex (Paper Search)' 
      }
    }
  }

  // 6. Resilient Fallback (Never fail silently or leave user stranded)
  const fallback = createFallbackFromUrl(cleanUrl)
  return { metadata: { ...fallback, status: 'want_to' }, source: 'URL Parser (Manual Review)' }
}
