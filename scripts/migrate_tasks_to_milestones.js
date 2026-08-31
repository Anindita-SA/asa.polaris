
import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: prof } = await supabase.from("profiles").select("id").limit(1);
  const uid = prof[0].id;

  // Find the tasks we inserted (they start with "Master's App:" or are the specific manual ones)
  const titles = [
    "Agri energy survey paper — Draft/Phase 1",
    "Swedish Institute Scholarship Opens",
    "ISFiT27 Results",
    "IELTS Retake (Computer-delivered)",
    "Portfolio site placeholders replaced",
    "GOI-IES Ireland Scholarship"
  ];

  const { data: oldTasks } = await supabase.from("tasks")
    .select("id, title, notes, deadline")
    .eq("user_id", uid)
    .eq("status", "scheduled");
    
  if (oldTasks) {
    const toDelete = oldTasks.filter(t => t.title.startsWith("Master's App:") || titles.includes(t.title));
    for (let t of toDelete) {
      await supabase.from("tasks").delete().eq("id", t.id);
      
      // Re-insert as milestone
      await supabase.from("milestones").insert({
        user_id: uid,
        title: t.title,
        note: t.notes,
        deadline: t.deadline,
        status: "upcoming"
      });
      console.log("Migrated to milestone:", t.title);
    }
  }
}

main().catch(console.error);

