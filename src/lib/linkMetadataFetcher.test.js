import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cleanSlugToTitle,
  extractDoiFromUrl,
  extractArxivIdFromUrl,
  extractTitleSlugFromUrl,
  createFallbackFromUrl,
  autoFetchLinkMetadata
} from './linkMetadataFetcher'

describe('linkMetadataFetcher unit tests', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('cleanSlugToTitle converts kebab/snake/slugs into formatted titles', () => {
    const slug = 'Opportunities_for_decentralised_solar_power_to_improve_reliability'
    expect(cleanSlugToTitle(slug)).toBe('Opportunities for decentralised solar power to improve reliability')
    expect(cleanSlugToTitle('machine-learning-in-power-electronics')).toBe('Machine learning in power electronics')
  })

  it('extractDoiFromUrl extracts standard DOIs correctly', () => {
    expect(extractDoiFromUrl('https://doi.org/10.1038/s41467-025-62948-8')).toBe('10.1038/s41467-025-62948-8')
    expect(extractDoiFromUrl('https://link.springer.com/article/10.1007/s00421-020-04533-3')).toBe('10.1007/s00421-020-04533-3')
    expect(extractDoiFromUrl('https://example.com/no-doi-here')).toBeNull()
  })

  it('extractArxivIdFromUrl extracts arXiv identifier from abs and pdf URLs', () => {
    expect(extractArxivIdFromUrl('https://arxiv.org/abs/2301.12345')).toBe('2301.12345')
    expect(extractArxivIdFromUrl('https://arxiv.org/pdf/2402.98765v2.pdf')).toBe('2402.98765v2')
    expect(extractArxivIdFromUrl('https://other.org/paper')).toBeNull()
  })

  it('extractTitleSlugFromUrl parses ResearchGate URLs accurately', () => {
    const rgUrl = 'https://www.researchgate.net/publication/395024145_Opportunities_for_decentralised_solar_power_to_improve_reliability_reduce_emissions_and_avoid_stranded_assets'
    expect(extractTitleSlugFromUrl(rgUrl)).toBe('Opportunities for decentralised solar power to improve reliability reduce emissions and avoid stranded assets')
  })

  it('createFallbackFromUrl creates graceful default object', () => {
    const fallback = createFallbackFromUrl('https://techcrunch.com/2026/09/14/grid-batteries-scale')
    expect(fallback.media_type).toBe('article')
    expect(fallback.title).toContain('Grid batteries scale')
    expect(fallback.author_or_creator).toBe('techcrunch.com')
    expect(fallback.full_review).toContain('https://techcrunch.com/2026/09/14/grid-batteries-scale')
  })

  it('autoFetchLinkMetadata resolves arXiv links via arXiv XML API', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Dual Active Bridge Converter Control for Fast Dynamic Response</title>
        <summary>This paper investigates modulation strategies for DAB converters.</summary>
        <published>2026-05-10T12:00:00Z</published>
        <author><name>Dr. Vignesh Kumar</name></author>
        <author><name>Anindita Saha</name></author>
        <category term="eess.SY"/>
      </entry>
    </feed>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockXml,
      json: async () => ({})
    })

    const { metadata, source } = await autoFetchLinkMetadata('https://arxiv.org/abs/2605.12345')
    expect(source).toBe('arXiv API')
    expect(metadata.title).toBe('Dual Active Bridge Converter Control for Fast Dynamic Response')
    expect(metadata.author_or_creator).toBe('Dr. Vignesh Kumar, Anindita Saha')
    expect(metadata.media_type).toBe('paper')
    expect(metadata.tags).toContain('arxiv')
    expect(metadata.full_review).toContain('https://arxiv.org/abs/2605.12345')
  })

  it('autoFetchLinkMetadata resolves ResearchGate URLs via OpenAlex/Crossref title query', async () => {
    const rgUrl = 'https://www.researchgate.net/publication/395024145_Opportunities_for_decentralised_solar_power_to_improve_reliability_reduce_emissions_and_avoid_stranded_assets'
    
    const mockOpenAlexResponse = {
      results: [
        {
          title: 'Opportunities for decentralised solar power to improve reliability, reduce emissions and avoid stranded assets',
          publication_year: 2025,
          publication_date: '2025-08-28',
          doi: 'https://doi.org/10.1038/s41467-025-62948-8',
          primary_location: {
            source: { display_name: 'Nature Communications' },
            landing_page_url: 'https://doi.org/10.1038/s41467-025-62948-8'
          },
          authorships: [
            { author: { display_name: 'Philip Sandwell' } },
            { author: { display_name: 'Benedict Winchester' } },
            { author: { display_name: 'Shivika Mittal' } },
            { author: { display_name: 'Hamish Beath' } }
          ],
          concepts: [
            { display_name: 'Renewable energy', score: 0.8 },
            { display_name: 'Microgrid', score: 0.7 }
          ],
          abstract_inverted_index: {
            "Despite": [0],
            "recent": [1],
            "improvements": [2],
            "solar": [3],
            "mini-grids": [4],
            "improve": [5],
            "reliability.": [6]
          }
        }
      ]
    }

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('api.openalex.org')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockOpenAlexResponse
        })
      }
      return Promise.resolve({ ok: false })
    })

    const { metadata, source } = await autoFetchLinkMetadata(rgUrl)
    expect(source).toBe('OpenAlex (Paper Search)')
    expect(metadata.title).toBe('Opportunities for decentralised solar power to improve reliability, reduce emissions and avoid stranded assets')
    expect(metadata.author_or_creator).toBe('Philip Sandwell, Benedict Winchester, Shivika Mittal, et al.')
    expect(metadata.media_type).toBe('paper')
    expect(metadata.recommended_by).toBe('Nature Communications (2025)')
    expect(metadata.tags).toContain('renewable-energy')
    expect(metadata.full_review).toContain(rgUrl)
  })

  it('autoFetchLinkMetadata resolves general Substack/Medium article via Microlink', async () => {
    const articleUrl = 'https://sublunar.substack.com/p/grid-interconnection-challenges'

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('api.microlink.io')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              title: 'Grid Interconnection Challenges for Renewables',
              author: 'Sublunar Insights',
              description: 'An in-depth analysis of modern transmission grid bottlenecks.',
              publisher: 'Substack',
              date: '2026-09-01T00:00:00.000Z',
              image: { url: 'https://substack.com/preview.png' }
            }
          })
        })
      }
      return Promise.resolve({ ok: false })
    })

    const { metadata, source } = await autoFetchLinkMetadata(articleUrl)
    expect(source).toBe('Microlink API')
    expect(metadata.title).toBe('Grid Interconnection Challenges for Renewables')
    expect(metadata.author_or_creator).toBe('Sublunar Insights')
    expect(metadata.media_type).toBe('article')
    expect(metadata.cover_url).toBe('https://substack.com/preview.png')
    expect(metadata.full_review).toContain(articleUrl)
  })

  it('autoFetchLinkMetadata falls back gracefully on network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'))

    const fallbackUrl = 'https://medium.com/engineering-today/power-electronics-future'
    const { metadata, source } = await autoFetchLinkMetadata(fallbackUrl)
    
    expect(source).toBe('URL Parser (Manual Review)')
    expect(metadata.title).toContain('Power electronics future')
    expect(metadata.author_or_creator).toBe('medium.com')
    expect(metadata.full_review).toContain(fallbackUrl)
  })
})
