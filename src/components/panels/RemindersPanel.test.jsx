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
    from: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }),
    removeChannel: vi.fn()
  }
}));

describe("RemindersPanel", () => {
  let mockChannel;

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
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    };
    supabase.channel = vi.fn().mockReturnValue(mockChannel);
    supabase.removeChannel = vi.fn();

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
      category: "reminders",
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

    // Check helper badge for 4 total items minus 2 visible = 2 remaining
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
    const tasks = [
      { id: "f1", title: "Focus One", status: "active", category: "work", wsjfScore: 5.0 },
      { id: "f2", title: "Focus Two", status: "active", category: "work", wsjfScore: 4.8 },
      { id: "t1", title: "Review Paper Draft", status: "active", category: "research", deadline: "2020-01-01", wsjfScore: 4.5 },
      { id: "t2", title: "Doctor Appointment Reminder", status: "active", category: "reminders", deadline: "2020-01-01", wsjfScore: 4.2 }
    ];

    setupSupabaseMock(tasks, []);

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

  it("should never duplicate ongoingTask or nextTask in Needs Attention even when overdue or neglected", async () => {
    const tasks = [
      { id: "t1", title: "Overdue Ongoing Task", status: "active", category: "work", deadline: "2020-01-01", skip_count: 4, wsjfScore: 5.0 },
      { id: "t2", title: "Overdue Next Task", status: "active", category: "work", deadline: "2020-01-01", skip_count: 5, wsjfScore: 4.0 },
      { id: "t3", title: "Overdue Non-Focus Task", status: "active", category: "work", deadline: "2020-01-01", wsjfScore: 3.0 }
    ];

    setupSupabaseMock(tasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Overdue Ongoing Task")).toBeDefined();
    });

    // Ongoing and Next appear in Focus Task
    expect(screen.getByText("Overdue Ongoing Task")).toBeDefined();
    expect(screen.getByText("Overdue Next Task")).toBeDefined();

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");

    // Needs Attention should contain t3 (non-focus), but NOT t1 or t2
    expect(within(needsAttentionSection).getByText("Overdue Non-Focus Task")).toBeDefined();
    expect(within(needsAttentionSection).queryByText("Overdue Ongoing Task")).toBeNull();
    expect(within(needsAttentionSection).queryByText("Overdue Next Task")).toBeNull();
  });

  it("should show OVERDUE badge and shimmer style on overdue focus tasks", async () => {
    const tasks = [
      { id: "t1", title: "Overdue Focus Task", status: "active", category: "work", deadline: "2020-01-01", wsjfScore: 5.0 },
      { id: "t2", title: "Next Overdue Task", status: "active", category: "work", deadline: "2020-01-01", wsjfScore: 4.0 }
    ];

    setupSupabaseMock(tasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Overdue Focus Task")).toBeDefined();
    });

    // Both ongoing and next should show OVERDUE badges
    const badges = screen.getAllByText("OVERDUE");
    expect(badges.length).toBe(2);

    // Verify shimmer animation style is present on the task container
    const ongoingCard = screen.getByText("Overdue Focus Task").closest(".rounded-xl");
    expect(ongoingCard.getAttribute("style")).toContain("animation: shimmer");
    const nextCard = screen.getByText("Next Overdue Task").closest(".rounded-xl");
    expect(nextCard.getAttribute("style")).toContain("animation: shimmer");
  });

  it("should show DUE TODAY or NEGLECTED badge when task is due today or skipped >= 3 times", async () => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const tasks = [
      { id: "t1", title: "Due Today Task", status: "active", category: "work", deadline: todayStr, wsjfScore: 5.0 },
      { id: "t2", title: "Skipped Task", status: "active", category: "work", skip_count: 3, wsjfScore: 4.0 }
    ];

    setupSupabaseMock(tasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Due Today Task")).toBeDefined();
    });

    expect(screen.getByText("DUE TODAY")).toBeDefined();
    expect(screen.getByText("NEGLECTED")).toBeDefined();
  });

  it("should include quick-win non-focus tasks (estimated_minutes <= 15) in Needs Attention", async () => {
    const tasks = [
      { id: "f1", title: "Focus 1", status: "active", category: "work", wsjfScore: 5.0, estimated_minutes: 45 },
      { id: "f2", title: "Focus 2", status: "active", category: "work", wsjfScore: 4.0, estimated_minutes: 30 },
      { id: "q1", title: "Quick Inbox Cleanup", status: "active", category: "work", wsjfScore: 2.0, estimated_minutes: 10 }
    ];

    setupSupabaseMock(tasks, []);

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Needs Attention/)).toBeDefined();
    });

    const needsAttentionHeading = screen.getByText(/Needs Attention/);
    const needsAttentionSection = needsAttentionHeading.closest(".rounded-xl");

    expect(within(needsAttentionSection).getByText("Quick Inbox Cleanup")).toBeDefined();
    expect(within(needsAttentionSection).getByText("T")).toBeDefined();
  });

  it("should refetch tasks, habit tasks, and nudges when polaris-tasks-changed window event is dispatched", async () => {
    const mockFetchNudges = vi.fn();
    useNudgeScheduler.mockReturnValue({
      nudges: [],
      dismissNudge: vi.fn(),
      fetchNudges: mockFetchNudges
    });

    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("tasks");
    });

    const initialCalls = supabase.from.mock.calls.length;

    // Dispatch custom event
    fireEvent(window, new CustomEvent("polaris-tasks-changed", {
      detail: { table: "tasks", operation: "insert" }
    }));

    await waitFor(() => {
      expect(supabase.from.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(mockFetchNudges).toHaveBeenCalled();
    });
  });

  it("should subscribe to Supabase Realtime tasks changes and clean up channel on unmount", async () => {
    const { unmount } = render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    expect(supabase.channel).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("should open Notification Settings modal and interact with controls", async () => {
    render(<RemindersPanel onOpenDayGuide={vi.fn()} />);

    // Click Notification Settings button in header
    const settingsBtn = screen.getByTitle("Notification Settings");
    fireEvent.click(settingsBtn);

    // Modal should be open
    expect(screen.getByText("Notification Settings")).toBeDefined();
    expect(screen.getByText("Focus Task Only")).toBeDefined();
    expect(screen.getByText("Single Consolidated Nudge")).toBeDefined();
    expect(screen.getByText("All Overdue & Reminders")).toBeDefined();
    expect(screen.getByText("Off (Visual Only)")).toBeDefined();

    // Select 'Single Consolidated Nudge'
    const consolidatedBtn = screen.getByText("Single Consolidated Nudge").closest("button");
    fireEvent.click(consolidatedBtn);

    let saved = JSON.parse(localStorage.getItem("polaris_notification_settings") || "{}");
    expect(saved.taskMode).toBe("consolidated");

    // Toggle Master Mute switch
    const masterToggle = screen.getByRole("switch", { name: /Master Mute/i });
    fireEvent.click(masterToggle);
    saved = JSON.parse(localStorage.getItem("polaris_notification_settings") || "{}");
    expect(saved.masterMuted).toBe(true);

    // Change Task Reminder Frequency
    const freqSelect = screen.getByLabelText(/Task Reminder Frequency/i);
    fireEvent.change(freqSelect, { target: { value: "60" } });
    saved = JSON.parse(localStorage.getItem("polaris_notification_settings") || "{}");
    expect(saved.taskIntervalMinutes).toBe(60);

    // Click Reset Defaults
    const resetBtn = screen.getByRole("button", { name: /Reset Defaults/i });
    fireEvent.click(resetBtn);
    saved = JSON.parse(localStorage.getItem("polaris_notification_settings") || "{}");
    expect(saved.taskMode).toBe("focus_only");
    expect(saved.masterMuted).toBe(false);
    expect(saved.taskIntervalMinutes).toBe(120);

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Save and Close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Tune nudges, alerts, and quiet focus preferences")).toBeNull();
    });
  });
});




