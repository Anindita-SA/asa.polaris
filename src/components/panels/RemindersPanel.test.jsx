// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RemindersPanel from "./RemindersPanel";

// Mock the hooks
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } })
}));
vi.mock("../../hooks/useNudgeScheduler", () => ({
  useNudgeScheduler: () => ({ nudges: [], dismissNudge: vi.fn(), fetchNudges: vi.fn() })
}));
vi.mock("../../hooks/useContactReminders", () => ({
  useContactReminders: () => ({ contacts: [], markReachedOut: vi.fn() })
}));
vi.mock("../../hooks/useCelebration", () => ({
  useCelebration: () => ({ celebrate: vi.fn() })
}));
vi.mock("../../hooks/useWSJFScore", () => ({
  computeWSJFScore: () => ({ score: 10 })
}));

describe("RemindersPanel", () => {
  it("should only render ONE Brain Dump button inside the Focus Task section, and NO add task input", async () => {
    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);
    
    // There should be exactly 1 Brain Dump button
    const brainDumpButtons = await screen.findAllByText("Brain Dump");
    expect(brainDumpButtons.length).toBe(1);
    
    // There should NOT be an "Add a task for today..." input
    const taskInput = screen.queryByPlaceholderText("Add a task for today... (Enter)");
    expect(taskInput).toBeNull();
  });
});


