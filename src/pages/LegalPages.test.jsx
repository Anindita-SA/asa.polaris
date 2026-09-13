// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import PrivacyPolicy from './PrivacyPolicy'
import TermsOfService from './TermsOfService'
import App from '../App'

vi.mock('../hooks/useAuth', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, loading: false, signInWithGoogle: vi.fn(), signInAsGuest: vi.fn() })
}))

vi.mock('../components/layout/Starfield', () => ({
  default: () => <div data-testid="starfield">Starfield</div>
}))

describe('Legal Pages', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.location.hash = ''
  })

  describe('PrivacyPolicy Component', () => {
    it('renders the main heading and developer attribution', () => {
      render(<PrivacyPolicy />)

      expect(screen.getByRole('heading', { level: 1, name: /Polaris Privacy Policy/i })).toBeDefined()
      expect(screen.getAllByText(/Anindita Sarker Aloka/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Effective Date: September 2026/i)).toBeDefined()
    })

    it('renders the mandatory Google Limited Use compliance text', () => {
      render(<PrivacyPolicy />)

      const expectedSnippet = "Polaris's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."
      const element = screen.getByText((content, node) => {
        const hasText = (elem) => elem && elem.textContent && elem.textContent.replace(/\s+/g, ' ').includes(expectedSnippet)
        const nodeHasText = hasText(node)
        const childrenDontHaveText = Array.from(node?.children || []).every(child => !hasText(child))
        return nodeHasText && childrenDontHaveText
      })
      expect(element).toBeDefined()
    })

    it('renders the restrictions on Google user data and contact info', () => {
      render(<PrivacyPolicy />)

      expect(screen.getByText(/Zero Advertising or Marketing/i)).toBeDefined()
      expect(screen.getByText(/Human Access Restrictions/i)).toBeDefined()
      expect(screen.getByText(/No AI Model Training/i)).toBeDefined()
      expect(screen.getAllByText(/anindita\.polaris@gmail\.com/i).length).toBeGreaterThan(0)
    })

    it('calls onBack handler when back button is clicked', () => {
      const mockOnBack = vi.fn()
      render(<PrivacyPolicy onBack={mockOnBack} />)

      const backButtons = screen.getAllByRole('button', { name: /Back to Polaris|Return to Polaris/i })
      fireEvent.click(backButtons[0])

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('TermsOfService Component', () => {
    it('renders the main heading and core terms sections', () => {
      render(<TermsOfService />)

      expect(screen.getByRole('heading', { level: 1, name: /Polaris Terms of Service/i })).toBeDefined()
      expect(screen.getByText(/1\. Acceptance of Terms/i)).toBeDefined()
      expect(screen.getByText(/2\. Description of Service/i)).toBeDefined()
      expect(screen.getByText(/3\. User Accounts and Authentication/i)).toBeDefined()
      expect(screen.getByText(/6\. Intellectual Property/i)).toBeDefined()
      expect(screen.getByText(/7\. Disclaimer of Warranties/i)).toBeDefined()
      expect(screen.getByText(/8\. Limitation of Liability/i)).toBeDefined()
    })

    it('renders developer contact email in Terms of Service', () => {
      render(<TermsOfService />)

      expect(screen.getAllByText(/anindita\.polaris@gmail\.com/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Anindita Sarker Aloka/i).length).toBeGreaterThan(0)
    })

    it('calls onBack handler when back button is clicked', () => {
      const mockOnBack = vi.fn()
      render(<TermsOfService onBack={mockOnBack} />)

      const backButtons = screen.getAllByRole('button', { name: /Back to Polaris|Return to Polaris/i })
      fireEvent.click(backButtons[0])

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('App Routing to Legal Pages', () => {
    it('renders PrivacyPolicy when location hash is #/privacy', async () => {
      window.location.hash = '#/privacy'
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /Polaris Privacy Policy/i })).toBeDefined()
      })
    })

    it('renders TermsOfService when location hash is #/terms', async () => {
      window.location.hash = '#/terms'
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /Polaris Terms of Service/i })).toBeDefined()
      })
    })
  })
})
