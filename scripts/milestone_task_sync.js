
import { createSafeClient } from "./lib/safe_supabase.js";
import "dotenv/config";

async function main() {
  console.log("Running Milestone-to-Task Sync...");
  const supabase = await createSafeClient("milestone_task_sync.js", false, false);
  const uid = supabase._uid;

  // 1. Fetch upcoming milestones (deadline within next 14 days)
  const now = new Date();
  const future14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const future14Str = future14.toISOString().split("T")[0];
  const nowStr = now.toISOString().split("T")[0];

  const { data: milestones, error: msErr } = await supabase
    .from("milestones")
    .select("*")
    .eq("user_id", uid)
    .neq("status", "done")
    .lte("deadline", future14Str);

  if (msErr) {
    console.error("Error fetching milestones:", msErr);
    process.exit(1);
  }

  if (!milestones || milestones.length === 0) {
    console.log("No upcoming milestones within 14 days.");
    return;
  }

  // 2. Fetch existing tasks that have been generated from milestones
  const { data: existingTasks, error: taskErr } = await supabase
    .from("tasks")
    .select("notes")
    .eq("user_id", uid)
    .like("notes", "%[Auto-generated from Milestone:%");

  if (taskErr) {
    console.error("Error fetching tasks:", taskErr);
    process.exit(1);
  }

  const existingIds = new Set(
    existingTasks
      .map(t => {
        const match = t.notes?.match(/\[Auto-generated from Milestone: (.*?)\]/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
  );

  let insertedCount = 0;

  // 3. Insert tasks for milestones that aren't synced
  for (const ms of milestones) {
    if (existingIds.has(ms.id)) {
      continue;
    }

    const isUrgent = new Date(ms.deadline) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const quadrant = isUrgent ? "urgent_important" : "important_not_urgent";

    const newTask = {
      user_id: uid,
      title: ms.title,
      notes: `[Auto-generated from Milestone: ${ms.id}]\n${ms.note || ""}`,
      deadline: ms.deadline,
      status: "active",
      quadrant: quadrant
    };

    const { error } = await supabase.from("tasks").insert([newTask]);
    if (error) {
      console.error(`Failed to sync milestone ${ms.id}:`, error);
    } else {
      console.log(`Synced Milestone to Task: ${ms.title}`);
      insertedCount++;
    }
  }

  console.log(`Sync complete. Inserted ${insertedCount} new tasks.`);
}

main().catch(console.error);

