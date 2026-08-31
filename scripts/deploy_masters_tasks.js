
import { createSafeClient } from "./lib/safe_supabase.js";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const supabase = await createSafeClient("deploy_masters_tasks.js");
  const wb = xlsx.readFile(path.join(__dirname, "../../Higher's application and Internship stuff/Aloka_Masters_Tracker.xlsx"));
  const sheet = wb.Sheets["Application Tracker"];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  let started = false;
  let programs = [];
  for (let r of rows) {
    if (r["__EMPTY"] === "Institution") {
      started = true;
      continue;
    }
    if (!started) continue;
    
    if (r["__EMPTY"] && r["__EMPTY"] !== "TOTAL") {
      programs.push({
        institution: r["__EMPTY"],
        program: r["__EMPTY_2"],
        deadline: r["__EMPTY_4"]
      });
    }
  }
  
  // Generic application tasks derived from MASTERS_APP_STRATEGY.md
  const manualTasks = [
    { title: "Agri energy survey paper — Draft/Phase 1", deadline: "2026-08-31", note: "Need to check current draft state and unblock to MDPI Energies" },
    { title: "Swedish Institute Scholarship Opens", deadline: "2026-09-01", note: "Apply for Swedish Institute Scholarship" },
    { title: "ISFiT27 Results", deadline: "2026-09-02", note: "Expected results for ISFiT27" },
    { title: "IELTS Retake (Computer-delivered)", deadline: "2026-09-30", note: "Required for Delft, TU/e, Wageningen. Weekday only." },
    { title: "Portfolio site placeholders replaced", deadline: "2026-09-30", note: "Replace fictional projects before application windows open in October." },
    { title: "GOI-IES Ireland Scholarship", deadline: "2026-11-15", note: "For UCD/TU Dublin track" }
  ];

  const allTasks = [];
  for (let mt of manualTasks) {
    allTasks.push({
      title: mt.title,
      notes: mt.note,
      status: "scheduled",
      quadrant: "important_not_urgent",
      deadline: mt.deadline
    });
  }

  for (let p of programs) {
    // try to parse deadline
    let d = p.deadline || "";
    let deadlineDate = null;
    if (d.includes("Jan") && d.includes("2027")) deadlineDate = "2027-01-15";
    else if (d.includes("Feb") && d.includes("2027")) deadlineDate = "2027-02-15";
    else if (d.includes("Oct-Dec 2026")) deadlineDate = "2026-12-31";
    else deadlineDate = "2027-01-01"; // fallback

    allTasks.push({
      title: `Master's App: ${p.institution} - ${p.program}`,
      notes: `Original Deadline text: ${d}`,
      status: "scheduled",
      quadrant: "important_not_urgent",
      deadline: deadlineDate
    });
  }

  for (let t of allTasks) {
    t.user_id = supabase._uid; // We inject user_id directly just to be safe, though safe_supabase may handle it
    const { error } = await supabase.from("tasks").insert([t]);
    if (error) {
      console.error("Error inserting", t.title, error);
    } else {
      console.log("Inserted:", t.title);
    }
  }
}

main().catch(console.error);

