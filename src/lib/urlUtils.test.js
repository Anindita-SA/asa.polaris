import { describe, it, expect } from 'vitest'
import {
  safeExternalUrl,
  createMailtoUrl,
  createGmailComposeUrl,
  createAcademicSearchUrl,
} from './urlUtils'

describe('urlUtils helpers', () => {
  describe('safeExternalUrl', () => {
    it('returns valid http and https URLs', () => {
      expect(safeExternalUrl('https://example.com')).toBe('https://example.com')
      expect(safeExternalUrl('http://sub.domain.org/path?query=1')).toBe(
        'http://sub.domain.org/path?query=1'
      )
    })

    it('trims whitespace around URLs', () => {
      expect(safeExternalUrl('   https://scholar.google.com   ')).toBe(
        'https://scholar.google.com'
      )
    })

    it('rejects unsafe schemes or relative paths', () => {
      expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
      expect(safeExternalUrl('ftp://example.com')).toBeNull()
      expect(safeExternalUrl('/local/path')).toBeNull()
      expect(safeExternalUrl('data:text/html,test')).toBeNull()
    })

    it('handles null, undefined, and non-string inputs', () => {
      expect(safeExternalUrl(null)).toBeNull()
      expect(safeExternalUrl(undefined)).toBeNull()
      expect(safeExternalUrl('')).toBeNull()
      expect(safeExternalUrl(12345)).toBeNull()
    })
  })

  describe('createMailtoUrl', () => {
    it('returns empty string if email is missing or invalid', () => {
      expect(createMailtoUrl()).toBe('')
      expect(createMailtoUrl({ email: '' })).toBe('')
      expect(createMailtoUrl({ email: null })).toBe('')
      expect(createMailtoUrl({ email: undefined })).toBe('')
    })

    it('generates standard mailto URL with recipient only', () => {
      expect(createMailtoUrl({ email: 'prof@mit.edu' })).toBe('mailto:prof@mit.edu')
      expect(createMailtoUrl({ email: '  prof@mit.edu  ' })).toBe('mailto:prof@mit.edu')
    })

    it('encodes subject and body parameters', () => {
      const url = createMailtoUrl({
        email: 'prof@mit.edu',
        subject: 'Research Inquiry & Collaboration',
        body: 'Hello Prof,\n\nI read your paper: "Quantum ML".',
      })

      expect(url).toBe(
        'mailto:prof@mit.edu?subject=Research%20Inquiry%20%26%20Collaboration&body=Hello%20Prof%2C%0A%0AI%20read%20your%20paper%3A%20%22Quantum%20ML%22.'
      )
    })

    it('handles only subject or only body', () => {
      expect(createMailtoUrl({ email: 'a@b.com', subject: 'Hi' })).toBe(
        'mailto:a@b.com?subject=Hi'
      )
      expect(createMailtoUrl({ email: 'a@b.com', body: 'Notes' })).toBe(
        'mailto:a@b.com?body=Notes'
      )
    })
  })

  describe('createGmailComposeUrl', () => {
    it('returns empty string if email is missing or invalid', () => {
      expect(createGmailComposeUrl()).toBe('')
      expect(createGmailComposeUrl({ email: '' })).toBe('')
      expect(createGmailComposeUrl({ email: null })).toBe('')
      expect(createGmailComposeUrl({ email: undefined })).toBe('')
    })

    it('generates standard Gmail web compose URL', () => {
      const url = createGmailComposeUrl({
        email: 'researcher@stanford.edu',
        subject: 'Inquiry - Graph Discovery',
        body: 'Dear Professor,\n\nWe would love to discuss your recent work.',
      })

      expect(url).toBe(
        'https://mail.google.com/mail/?view=cm&fs=1&to=researcher%40stanford.edu&su=Inquiry%20-%20Graph%20Discovery&body=Dear%20Professor%2C%0A%0AWe%20would%20love%20to%20discuss%20your%20recent%20work.'
      )
    })

    it('generates Gmail compose link with email only', () => {
      const url = createGmailComposeUrl({ email: 'test@example.com' })
      expect(url).toBe('https://mail.google.com/mail/?view=cm&fs=1&to=test%40example.com')
    })
  })

  describe('createAcademicSearchUrl', () => {
    it('generates Google Scholar query URL with name and institution', () => {
      const url = createAcademicSearchUrl('Yoshua Bengio', 'MILA')
      expect(url).toBe(
        'https://scholar.google.com/scholar?q=Yoshua%20Bengio%20MILA%20lab%20profile'
      )
    })

    it('handles single parameter or partial strings', () => {
      const url = createAcademicSearchUrl('Demis Hassabis', '')
      expect(url).toContain('Demis%20Hassabis')
      expect(url).toContain('lab%20profile')
      expect(createAcademicSearchUrl('', '')).toBe(
        'https://scholar.google.com/scholar?q=lab%20profile'
      )
    })
  })
})
