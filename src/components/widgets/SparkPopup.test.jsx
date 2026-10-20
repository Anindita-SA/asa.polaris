// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import SparkPopup from './SparkPopup'

describe('SparkPopup', () => {
  afterEach(() => {
    cleanup()
  })

  it('filters out opportunity items and strictly displays news items', () => {
    const mockItems = [
      {
        type: 'opportunity',
        title: 'Grant Opportunity for Climate Innovators',
        summary: 'Grant description',
        hardware_opportunity_id: 'hw-123',
        source_name: 'ClimateGrants'
      },
      {
        type: 'news',
        title: 'Breakthrough in Solid-State Electrolytes',
        summary: 'Novel sulfide-based solid electrolyte achieves high ionic conductivity.',
        source_name: 'Nature Energy',
        url: 'https://example.com/solid-state'
      },
      {
        // Untyped news item without hardware_opportunity_id
        title: 'Perovskite Tandem Cells Hit 34% Efficiency',
        summary: 'Lab scale testing confirms record photovoltaic efficiency.',
        source: 'PV Magazine',
        url: 'https://example.com/perovskite'
      }
    ]

    const onDismiss = vi.fn()
    render(<SparkPopup items={mockItems} onDismiss={onDismiss} />)

    // Opportunity should NOT be rendered
    expect(screen.queryByText('Grant Opportunity for Climate Innovators')).toBeNull()

    // News items SHOULD be rendered
    expect(screen.getByText('Breakthrough in Solid-State Electrolytes')).toBeDefined()
    expect(screen.getByText('Perovskite Tandem Cells Hit 34% Efficiency')).toBeDefined()

    // Source badges
    expect(screen.getByText('Nature Energy')).toBeDefined()
    expect(screen.getByText('PV Magazine')).toBeDefined()
  })

  it('falls back to "News" when source_name and source are absent', () => {
    const mockItems = [
      {
        type: 'news',
        title: 'Grid Battery Storage Capacity Doubles',
        summary: 'Energy storage reaches new peak.',
        url: 'https://example.com/grid'
      }
    ]

    render(<SparkPopup items={mockItems} onDismiss={vi.fn()} />)
    expect(screen.getByText('Grid Battery Storage Capacity Doubles')).toBeDefined()
    expect(screen.getByText('News')).toBeDefined()
  })

  it('renders "No signals picked up today." when no news items exist or items is null', () => {
    const mockItems = [
      {
        type: 'opportunity',
        title: 'Hardware Fellowship',
        summary: 'Opportunity only',
        hardware_opportunity_id: 'opp-1'
      }
    ]

    render(<SparkPopup items={mockItems} onDismiss={vi.fn()} />)
    expect(screen.getByText('No signals picked up today.')).toBeDefined()
  })

  it('handles null or undefined items prop without throwing', () => {
    expect(() => render(<SparkPopup items={null} onDismiss={vi.fn()} />)).not.toThrow()
    expect(screen.getByText('No signals picked up today.')).toBeDefined()
  })

  it('rejects unsafe javascript: URLs and does not render clickable link', () => {
    const mockItems = [
      {
        type: 'news',
        title: 'Malicious payload test',
        summary: 'Summary text',
        url: 'javascript:alert(1)'
      }
    ]

    render(<SparkPopup items={mockItems} onDismiss={vi.fn()} />)
    expect(screen.getByText('Malicious payload test')).toBeDefined()
    expect(screen.queryByText(/read more/i)).toBeNull()
  })

  it('calls onDismiss when clicking Initialize Day button', () => {
    const onDismiss = vi.fn()
    render(<SparkPopup items={[]} onDismiss={onDismiss} />)

    const initBtn = screen.getByRole('button', { name: /initialize day/i })
    fireEvent.click(initBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
