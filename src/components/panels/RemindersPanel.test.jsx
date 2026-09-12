// @vitest-environment jsdom
import { render, screen, waitFor, within, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RemindersPanel from "./RemindersPanel";
import { supabase } from "../../lib/supabase";
import { useNudgeScheduler } from "../../hooks/useNudgeScheduler";
import { useContactReminders } from "../../hooks/useContactReminders";

const mockUser = { id: "test-user" };
// Mock the hooks
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser })
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
      const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");
      expect(within(needsAttentionSection).getByText("Alice Smith")).toBeDefined();
    });

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");

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

    // Verify single-letter tag badges
    expect(within(needsAttentionSection).getByText("C")).toBeDefined();
    expect(within(needsAttentionSection).getByText("N")).toBeDefined();

    // Verify WSJF score text is not displayed in the card
    expect(within(needsAttentionSection).queryByText(/WSJF/)).toBeNull();
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
    const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");

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
    const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");

    const checkButton = within(needsAttentionSection).getByRole("button", { name: /Complete Drink Water/i });
    fireEvent.click(checkButton);

    expect(mockDismissNudge).toHaveBeenCalledWith("n1");
  });

  it("should never render task items inside Manage Nudges modal or Nudges section", async () => {
    // Return only system nudges from useNudgeScheduler (or even if a task-like nudge was present)
    useNudgeScheduler.mockReturnValue({
      nudges: [
        { id: "n1", title: "Drink Water", interval_minutes: 60, active: true, isDue: false, isTask: false },
        { id: "t-alert", title: "Overdue Task Nudge", interval_minutes: 60, active: true, isDue: false, isTask: true }
      ],
      dismissNudge: vi.fn(),
      fetchNudges: vi.fn()
    });

    const tasks = [
      { id: "t1", title: "Regular Focus Task", status: "active", category: "work", wsjfScore: 3.0 },
      { id: "t2", title: "Nagging Task Reminder", status: "active", category: "reminders", wsjfScore: 2.5 }
    ];

    setupSupabaseMock(tasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    // Open Manage Nudges settings modal
    const settingsButton = screen.getByTitle("Manage Nudges");
    fireEvent.click(settingsButton);

    // Verify Manage Nudges modal only lists system nudge
    expect(screen.getByText("Drink Water (60m)")).toBeDefined();
    expect(screen.queryByText(/Overdue Task Nudge/)).toBeNull();
    expect(screen.queryByText(/Regular Focus Task/)).toBeNull();
    expect(screen.queryByText(/Nagging Task Reminder/)).toBeNull();

    // Verify Nudges collapsible section count and items
    // Nudges count should only be 1 (system nudge), not 2
    const nudgesSection = screen.getByText("Nudges").closest(".space-y-3");
    expect(within(nudgesSection).getByText("1")).toBeDefined();

    // Verify Nudges section only has "Drink Water"
    expect(within(nudgesSection).getByText("Drink Water")).toBeDefined();
    expect(within(nudgesSection).queryByText("Overdue Task Nudge")).toBeNull();
    expect(within(nudgesSection).queryByText("Regular Focus Task")).toBeNull();
  });

  it("should render tasks in Focus Task and Task Reminders sections, not in Nudges section", async () => {
    useNudgeScheduler.mockReturnValue({
      nudges: [
        { id: "n1", title: "System Nudge", interval_minutes: 60, active: true, isDue: false, isTask: false }
      ],
      dismissNudge: vi.fn(),
      fetchNudges: vi.fn()
    });

    const tasks = [
      { id: "t1", title: "Write Documentation", status: "active", category: "general", wsjfScore: 3.0 },
      { id: "t2", title: "Call Electrician", status: "active", category: "reminders", wsjfScore: 2.0 }
    ];

    setupSupabaseMock(tasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Write Documentation")).toBeDefined();
    });

    // Write Documentation is in Focus Task
    expect(screen.getByText("Write Documentation")).toBeDefined();

    // Call Electrician is in Task Reminders
    const taskRemindersSection = screen.getByText("Task Reminders").closest(".space-y-3");
    expect(within(taskRemindersSection).getByText("Call Electrician")).toBeDefined();

    // Neither task should be in Nudges section
    const nudgesSection = screen.getByText("Nudges").closest(".space-y-3");
    expect(within(nudgesSection).queryByText("Write Documentation")).toBeNull();
    expect(within(nudgesSection).queryByText("Call Electrician")).toBeNull();
    expect(within(nudgesSection).getByText("System Nudge")).toBeDefined();
  });

  it("should display T for tasks and R for reminders as single-letter badges in Needs Attention", async () => {
    const overdueTasks = [
      { id: "t1", title: "Review Paper Draft", status: "active", category: "research", deadline: "2020-01-01", wsjfScore: 4.5 },
      { id: "t2", title: "Doctor Appointment Reminder", status: "active", category: "reminders", deadline: "2020-01-01", wsjfScore: 4.2 }
    ];

    setupSupabaseMock(overdueTasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Needs Attention/)).toBeDefined();
    });

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");

    // Check items rendered
    expect(within(needsAttentionSection).getByText("Review Paper Draft")).toBeDefined();
    expect(within(needsAttentionSection).getByText("Doctor Appointment Reminder")).toBeDefined();

    // Check single letter tags
    expect(within(needsAttentionSection).getByText("T")).toBeDefined();
    expect(within(needsAttentionSection).getByText("R")).toBeDefined();

    // Verify no WSJF text
    expect(within(needsAttentionSection).queryByText(/WSJF/)).toBeNull();
  });
});



