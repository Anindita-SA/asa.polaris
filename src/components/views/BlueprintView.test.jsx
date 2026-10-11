// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import BlueprintView from './BlueprintView';
import {
  BLUEPRINT_SCHEDULE,
  BLUEPRINT_COUNTDOWNS,
  calculateDaysRemaining,
} from '../../data/blueprintSchedule';

describe('BlueprintView and blueprintSchedule', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('contains exactly 12 schedule days and 5 countdown milestones', () => {
    expect(BLUEPRINT_SCHEDULE).toHaveLength(12);
    expect(BLUEPRINT_COUNTDOWNS).toHaveLength(5);
  });

  it('correctly calculates days remaining relative to an anchor date', () => {
    // 2026-10-13 from 2026-10-11 is 2 days
    expect(calculateDaysRemaining('2026-10-13', '2026-10-11')).toBe(2);
    // 2026-10-15 from 2026-10-11 is 4 days
    expect(calculateDaysRemaining('2026-10-15', '2026-10-11')).toBe(4);
    // 2026-10-11 from 2026-10-11 is 0 days
    expect(calculateDaysRemaining('2026-10-11', '2026-10-11')).toBe(0);
    // 2026-10-22 from 2026-10-11 is 11 days
    expect(calculateDaysRemaining('2026-10-22', '2026-10-11')).toBe(11);
  });

  it('renders cap discipline badge and milestone banner', () => {
    render(<BlueprintView />);

    expect(screen.getByText(/Strict 1-Primary \/ Day Cap Active/i)).toBeDefined();
    expect(screen.getByText(/Milestone Countdown Deck/i)).toBeDefined();
    expect(screen.getByText('Robotics CT')).toBeDefined();
    expect(screen.getByText('BMS CT')).toBeDefined();
    expect(screen.getByText('Sweden Portal & Puja')).toBeDefined();
    expect(screen.getByText('NPTEL IoT Exam')).toBeDefined();
    expect(screen.getByText('Econ CT2')).toBeDefined();
  });

  it('renders today card with primary focus and secondary support', () => {
    render(<BlueprintView />);

    expect(screen.getByText('Sun Oct 11')).toBeDefined();
    expect(screen.getByText('Domestic rest, mental reset, cold email review')).toBeDefined();
    expect(screen.getByText('Review Robotics CT syllabus & key topics (60-90 min)')).toBeDefined();
    expect(screen.getByText(/Sort cupboard papers, dispatch top 3 cold emails, early sleep/i)).toBeDefined();
  });

  it('toggles primary focus done status in localStorage', () => {
    render(<BlueprintView />);

    const markButtons = screen.getAllByRole('button', { name: /Mark Done/i });
    expect(markButtons.length).toBeGreaterThan(0);

    // Toggle today's primary focus
    fireEvent.click(markButtons[0]);
    expect(localStorage.getItem('polaris_blueprint_done_2026-10-11')).toBe('true');
    expect(screen.getByText(/1 \/ 12 Primaries Completed/i)).toBeDefined();

    // Toggle off
    const completedButtons = screen.getAllByRole('button', { name: /Completed/i });
    fireEvent.click(completedButtons[0]);
    expect(localStorage.getItem('polaris_blueprint_done_2026-10-11')).toBeNull();
    expect(screen.getByText(/0 \/ 12 Primaries Completed/i)).toBeDefined();
  });

  it('filters schedule by Exams Only and reverts to All Days', () => {
    render(<BlueprintView />);

    const examsFilterBtn = screen.getByRole('button', { name: /Exams Only/i });
    fireEvent.click(examsFilterBtn);

    // Only 4 exam days exist: Robotics CT, BMS CT, NPTEL IoT, Econ CT2
    expect(screen.getByText('Tue Oct 13')).toBeDefined();
    expect(screen.getByText('Thu Oct 15')).toBeDefined();
    expect(screen.getByText('Sat Oct 17')).toBeDefined();
    expect(screen.getByText('Thu Oct 22')).toBeDefined();
    // Non-exam days should not be displayed
    expect(screen.queryByText('Sun Oct 11')).toBeNull();
    expect(screen.queryByText('Mon Oct 12')).toBeNull();

    const allFilterBtn = screen.getByRole('button', { name: /All Days/i });
    fireEvent.click(allFilterBtn);
    expect(screen.getByText('Sun Oct 11')).toBeDefined();
  });
});
