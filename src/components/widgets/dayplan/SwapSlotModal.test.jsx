// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SwapSlotModal from './SwapSlotModal';

describe('SwapSlotModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('excludes the slot current parent task from the candidate list so re-picking the same parent is impossible', () => {
    const currentTaskId = 'parent-current-1';
    const candidates = [
      { id: 'parent-current-1', title: 'Current Assigned Parent Task', estimated_minutes: 60 },
      { id: 'parent-backlog-2', title: 'Alternative Parent Task 2', estimated_minutes: 45 },
      { id: 'parent-backlog-3', title: 'Alternative Parent Task 3', estimated_minutes: 30 }
    ];

    render(
      <SwapSlotModal
        isOpen={true}
        onClose={vi.fn()}
        slotNumber={1}
        currentTaskId={currentTaskId}
        candidates={candidates}
        onSelectCandidate={vi.fn()}
      />
    );

    // Assert the current parent task is NOT rendered in candidate list
    expect(screen.queryByText('Current Assigned Parent Task')).toBeNull();
    expect(screen.queryByTestId('swap-candidate-parent-current-1')).toBeNull();

    // Assert alternative candidates ARE rendered
    expect(screen.getByText('Alternative Parent Task 2')).toBeDefined();
    expect(screen.getByTestId('swap-candidate-parent-backlog-2')).toBeDefined();
    expect(screen.getByText('Alternative Parent Task 3')).toBeDefined();
    expect(screen.getByTestId('swap-candidate-parent-backlog-3')).toBeDefined();
  });

  it('calls onSelectCandidate and onClose when a candidate button is clicked', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();

    const candidates = [
      { id: 'parent-target', title: 'Selectable Parent Task', estimated_minutes: 30 }
    ];

    render(
      <SwapSlotModal
        isOpen={true}
        onClose={mockOnClose}
        slotNumber={2}
        currentTaskId="different-task"
        candidates={candidates}
        onSelectCandidate={mockOnSelect}
      />
    );

    const candidateBtn = screen.getByTestId('swap-candidate-parent-target');
    expect(candidateBtn.className).toContain('min-h-[44px]');

    fireEvent.click(candidateBtn);

    expect(mockOnSelect).toHaveBeenCalledWith('parent-target');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
