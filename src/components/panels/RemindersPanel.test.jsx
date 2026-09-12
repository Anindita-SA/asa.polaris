// @vitest-environment jsdom
import { render, screen, waitFor, within, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RemindersPanel from "./RemindersPanel";
import { supabase } from "../../lib/supabase";
import { useNudgeScheduler } from "../../hooks/useNudgeScheduler";
import { useContactReminders } from "../../hooks/useContactReminders";

// Mock the hooks
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } })
}));

vi.mock("../../hooks/useNudgeScheduler", () => ({
  useNudgeScheduler: vi.fn()
}));

vi.mock("../../hooks/useContactReminders", () => ({
  useContactReminders: vi.fn()
}));

vi.mock("../../hooks/useCelebration", () => ({
  useCelebration: () => ({ celebrate: vi.fn() })
}));

vi.mock("../../hooks/useWSJFScore", () => ({
  computeWSJFScore: (task) => ({ score: task?.wsjfScore ?? 2.0 })
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe("RemindersPanel", () => {
  const setupSupabaseMock = (tasksData = [], habitTasksData = []) => {
    supabase.from.mockImplementation((table) => ({
      select: vi.fn().mockImplementation(() => {
        const eqFilters = {};
        const builder = {
          eq: vi.fn().mockImplementation((col, val) => {
            eqFilters[col] = val;
            return builder;
          }),
          in: vi.fn().mockImplementation(() => {
            if (eqFilters["category"] === "habits") {
              return Promise.resolve({ data: habitTasksData, error: null });
            }
            return Promise.resolve({ data: tasksData, error: null });
          })
        };
        return builder;
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useNudgeScheduler.mockReturnValue({
      nudges: [],
      dismissNudge: vi.fn(),
      fetchNudges: vi.fn()
    });
    useContactReminders.mockReturnValue({
      contacts: [],
      markReachedOut: vi.fn()
    });
    setupSupabaseMock([], []);
  });

  afterEach(() => {
    cleanup();
  });

  it("should only render ONE Brain Dump button inside the Focus Task section, and NO add task input", async () => {
    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    const brainDumpButtons = await screen.findAllByText("Brain Dump");
    expect(brainDumpButtons.length).toBe(1);

    const taskInput = screen.queryByPlaceholderText("Add a task for today... (Enter)");
    expect(taskInput).toBeNull();
  });

  it("should cap visible Needs Attention items at max 2 and show badge with remaining count", async () => {
    // 1. System Nudge (Score: 3.8)
    useNudgeScheduler.mockReturnValue({
      nudges: [
        { id: "n1", title: "Drink Water", active: true, isDue: true, isTask: false }
      ],
      dismissNudge: vi.fn(),
      fetchNudges: vi.fn()
    });

    // 2. Overdue Contact (Score: 4.0 for hearth)
    useContactReminders.mockReturnValue({
      contacts: [
        { id: "c1", name: "Alice Smith", tier: "hearth", isOverdue: true, daysSince: 10, frequency_days: 7 }
      ],
      markReachedOut: vi.fn()
    });

    // 3. Incomplete Habit (Score: 3.5)
    // 4. Overdue Task (Score: 2.0)
    const overdueTask = {
      id: "t1",
      title: "Submit Taxes",
      deadline: "2020-01-01",
      status: "active",
      wsjfScore: 2.0
    };
    const incompleteHabit = {
      id: "h1",
      title: "Morning Run",
      category: "habits",
      completion_dates: ["2020-01-01"],
      status: "active"
    };

    setupSupabaseMock([overdueTask], [incompleteHabit]);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      const needsAttentionHeading = screen.getByText(/Needs Attention/);
      const needsAttentionSection = needsAttentionHeading.closest(".glass");
      expect(within(needsAttentionSection).getByText("Alice Smith")).toBeDefined();
    });

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".glass");

    // Top 2 items by score:
    // 1. Alice Smith (Score 4.0)
    // 2. Drink Water (Score 3.8)
    expect(within(needsAttentionSection).getByText("Alice Smith")).toBeDefined();
    expect(within(needsAttentionSection).getByText("Drink Water")).toBeDefined();

    // The other 2 lower score items (Morning Run 3.5, Submit Taxes 2.0) should NOT be in the Needs Attention visible 2
    expect(within(needsAttentionSection).queryByText("Submit Taxes")).toBeNull();
    expect(within(needsAttentionSection).queryByText("Morning Run")).toBeNull();

    // Check helper badge for 4 total items - 2 visible = 2 remaining
    expect(within(needsAttentionSection).getByText("(+2 more in sections below)")).toBeDefined();

    // Verify tag badges
    expect(within(needsAttentionSection).getByText("REACH OUT")).toBeDefined();
    expect(within(needsAttentionSection).getByText("NUDGE")).toBeDefined();
  });

  it("should sort Needs Attention items strictly by score descending", async () => {
    useNudgeScheduler.mockReturnValue({
      nudges: [
        { id: "n1", title: "Active Nudge", active: true, isDue: true, isTask: false }
      ],
      dismissNudge: vi.fn(),
      fetchNudges: vi.fn()
    });

    useContactReminders.mockReturnValue({
      contacts: [
        { id: "c1", name: "Hearth Friend", tier: "hearth", isOverdue: true, daysSince: 5, frequency_days: 3 }
      ],
      markReachedOut: vi.fn()
    });

    setupSupabaseMock([], []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Needs Attention/)).toBeDefined();
    });

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".glass");

    const itemTitles = within(needsAttentionSection).getAllByText(/Hearth Friend|Active Nudge/).map((el) => el.textContent);
    // Hearth Friend (score 4.0) should precede Active Nudge (score 3.8)
    expect(itemTitles[0]).toBe("Hearth Friend");
    expect(itemTitles[1]).toBe("Active Nudge");

    // Since total items = 2, helper badge should not appear
    expect(within(needsAttentionSection).queryByText(/more in sections below/)).toBeNull();
  });

  it("should trigger completion action when checkmark is clicked in Needs Attention", async () => {
    const mockDismissNudge = vi.fn();
    useNudgeScheduler.mockReturnValue({
      nudges: [
        { id: "n1", title: "Drink Water", active: true, isDue: true, isTask: false }
      ],
      dismissNudge: mockDismissNudge,
      fetchNudges: vi.fn()
    });

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Needs Attention/)).toBeDefined();
    });

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".glass");

    const checkButton = within(needsAttentionSection).getByRole("button", { name: /Complete Drink Water/i });
    fireEvent.click(checkButton);

    expect(mockDismissNudge).toHaveBeenCalledWith("n1");
  });
});


