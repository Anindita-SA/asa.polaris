// Script to synchronize Supabase milestones with verified master's timeline and application strategy.
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Canonical Verified Milestones (Zero em-dashes, exact deadlines)
const canonicalMilestones = [
  // Phase 1: Foundation & Test Booking
  {
    title: "Deploy concrete speaker to portfolio",
    deadline: "2026-05-15",
    status: "done",
    xp_reward: 100,
    note: "Plywood front baffle and cast concrete body case study."
  },
  {
    title: "IELTS Academic Exam (Booked)",
    deadline: "2026-10-03",
    status: "upcoming",
    xp_reward: 150,
    note: "Booked test date. Computer-delivered. Weekday & weekend prep active."
  },
  {
    title: "Portfolio Site: Replace Placeholders",
    deadline: "2026-10-15",
    status: "upcoming",
    xp_reward: 100,
    note: "Replace fictional placeholders with Concrete Speaker, CHAARG, Deskimon, Polaris."
  },
  {
    title: "Sweden National Application Portal Opens",
    deadline: "2026-10-16",
    status: "upcoming",
    xp_reward: 50,
    note: "UniversityAdmissions.se opens for Autumn 2027 intake."
  },
  {
    title: "Agri Solar Survey Paper: Phase 1 & 2",
    deadline: "2026-10-20",
    status: "upcoming",
    xp_reward: 100,
    note: "Unblock draft with 2-3 charts and search synthesis for Energies (MDPI)."
  },
  {
    title: "SiC EMI / Power Converter Research Placement",
    deadline: "2026-10-31",
    status: "upcoming",
    xp_reward: 100,
    note: "Standard EMC and converter topologies with Dr. Vignesh Kumar (NIT Trichy)."
  },

  // Phase 2: Early Bird & Full Ride Submissions
  {
    title: "TU Delft Justus & Louise van Effen Scholarship Deadline",
    deadline: "2026-12-01",
    status: "upcoming",
    xp_reward: 200,
    note: "MSc IPD & MSc EE Power Track. Full Ride (~€30k/yr). Cutoff 23:59 CET."
  },
  {
    title: "Politecnico di Milano 1st Call (Early Bird)",
    deadline: "2026-12-01",
    status: "upcoming",
    xp_reward: 150,
    note: "MSc Integrated Product Design & EE. Best window for Platinum/Gold merit scholarships."
  },
  {
    title: "Erasmus Mundus STEPS Application Cutoff",
    deadline: "2026-12-31",
    status: "upcoming",
    xp_reward: 150,
    note: "Power electronics track. Direct match with SiC converter research."
  },

  // Phase 3: Peak Master's Admissions & Major Deadlines
  {
    title: "Aalto University CoID & Finland Scholarship Cutoff",
    deadline: "2027-01-02",
    status: "upcoming",
    xp_reward: 150,
    note: "Single unified application window (closes 15:00 UTC+2). 100% tuition + €5k relocation."
  },
  {
    title: "Erasmus Mundus SSIs Application Cutoff",
    deadline: "2027-01-10",
    status: "upcoming",
    xp_reward: 150,
    note: "Smart Systems Integrated Solutions (microsystems & smart sensors)."
  },
  {
    title: "Sweden National Portal: 4 Ranked Choices Cutoff",
    deadline: "2027-01-15",
    status: "upcoming",
    xp_reward: 200,
    note: "Lock in 4 ranked choices on UniversityAdmissions.se (KTH, Chalmers, Lund, Umeå, Konstfack)."
  },
  {
    title: "TU Delft General Non-Scholarship Cutoff",
    deadline: "2027-01-15",
    status: "upcoming",
    xp_reward: 150,
    note: "Final non-EU deadline for MSc IPD & MSc EE."
  },
  {
    title: "Erasmus Mundus SUSTAGRI Application Cutoff",
    deadline: "2027-01-15",
    status: "upcoming",
    xp_reward: 150,
    note: "Cutting-Edge Tech for Sustainable Agriculture (reusing solar irrigation thesis)."
  },
  {
    title: "Erasmus Mundus EMINENT Application Cutoff",
    deadline: "2027-01-15",
    status: "upcoming",
    xp_reward: 150,
    note: "Embedded Intelligence Nanosystems Engineering."
  },
  {
    title: "Erasmus Mundus EDISS Application Cutoff",
    deadline: "2027-01-15",
    status: "upcoming",
    xp_reward: 150,
    note: "Data-Intensive Intelligent Software Systems."
  },
  {
    title: "Politecnico di Milano 2nd Call (Design Portfolio Cutoff)",
    deadline: "2027-01-29",
    status: "upcoming",
    xp_reward: 150,
    note: "Final submission deadline for MSc Integrated Product Design portfolio."
  },
  {
    title: "Erasmus Mundus DREAM Application Cutoff",
    deadline: "2027-01-31",
    status: "upcoming",
    xp_reward: 150,
    note: "Dynamics of Renewables-based Power Systems."
  },
  {
    title: "Erasmus Mundus EU-CORE Application Cutoff",
    deadline: "2027-01-31",
    status: "upcoming",
    xp_reward: 150,
    note: "Control of Renewable Energy Systems."
  },
  {
    title: "Erasmus Mundus SemiChips Application Cutoff",
    deadline: "2027-01-31",
    status: "upcoming",
    xp_reward: 150,
    note: "Semiconductor Chips & Systems."
  },
  {
    title: "TU/e Eindhoven ALSP Scholarship Deadline",
    deadline: "2027-02-01",
    status: "upcoming",
    xp_reward: 200,
    note: "Amandus H. Lundqvist Scholarship (€15k/yr + Full Tuition). MSc Industrial Design."
  },
  {
    title: "Wageningen University Excellence Scholarship Cutoff",
    deadline: "2027-02-01",
    status: "upcoming",
    xp_reward: 150,
    note: "Excellence Programme cutoff for MSc Biosystems Engineering."
  },
  {
    title: "Sweden Portal: Supporting Documents & Fee Cutoff",
    deadline: "2027-02-01",
    status: "upcoming",
    xp_reward: 100,
    note: "Receipt of transcripts, IELTS scores, and 900 SEK fee on UniversityAdmissions.se."
  },
  {
    title: "Swedish Institute SISGP Scholarship Window",
    deadline: "2027-02-26",
    status: "upcoming",
    xp_reward: 250,
    note: "Portal opens Feb 9, closes Feb 26. Full Ride (tuition + 12k SEK/mo + travel). Requires 3,000 hrs proof."
  },

  // Phase 4: Safety Floor, Irish Portals & Spring Cutoffs
  {
    title: "Danish Universities Non-EU Application Cutoff",
    deadline: "2027-03-01",
    status: "upcoming",
    xp_reward: 150,
    note: "Aalborg (MSc ID), Aarhus (MSc IT Prod Dev), Design School Kolding non-EU cutoff."
  },
  {
    title: "Government of Ireland (GOI-IES) Scholarship Cutoff",
    deadline: "2027-03-13",
    status: "upcoming",
    xp_reward: 200,
    note: "Full tuition waiver + €10k stipend (requires conditional/unconditional Irish offer)."
  },
  {
    title: "Erasmus Mundus EMIMEP Application Cutoff",
    deadline: "2027-03-13",
    status: "upcoming",
    xp_reward: 150,
    note: "Microwave Electronics & Photonics."
  },
  {
    title: "Sweden National Admissions Results",
    deadline: "2027-03-25",
    status: "upcoming",
    xp_reward: 100,
    note: "First selection results published on UniversityAdmissions.se."
  },
  {
    title: "UCD Global Excellence Scholarship & Irish Cutoffs",
    deadline: "2027-03-31",
    status: "upcoming",
    xp_reward: 150,
    note: "100%/50% tuition waiver for UCD offer holders; Irish university rolling cutoffs."
  },
  {
    title: "TU/e Eindhoven General Non-EU Cutoff",
    deadline: "2027-05-01",
    status: "upcoming",
    xp_reward: 100,
    note: "Final non-EU deadline for TU/e master's programs."
  },
  {
    title: "Wageningen University General Non-EU Cutoff",
    deadline: "2027-05-01",
    status: "upcoming",
    xp_reward: 100,
    note: "Final non-EU deadline for MSc Biosystems Engineering."
  },

  // Phase 5: Graduation, Visa & Relocation
  {
    title: "B.Tech EEE Graduation at NIT Trichy",
    deadline: "2027-06-30",
    status: "upcoming",
    xp_reward: 300,
    note: "Official degree completion and graduation."
  },
  {
    title: "Master's Program Commencement in Europe",
    deadline: "2027-09-01",
    status: "upcoming",
    xp_reward: 500,
    note: "Master's program intake commencement in Europe."
  }
];

async function syncMilestones() {
  // 1. Resolve user_id
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id').limit(1);
  if (pErr || !profiles?.length) {
    console.error('Failed to resolve profile user_id:', pErr);
    process.exit(1);
  }
  const userId = profiles[0].id;
  console.log(`Resolved user_id: ${userId}`);

  // 2. Fetch existing milestones
  const { data: existing, error: fetchErr } = await supabase.from('milestones').select('*').eq('user_id', userId);
  if (fetchErr) {
    console.error('Failed to fetch existing milestones:', fetchErr);
    process.exit(1);
  }
  console.log(`Existing milestones in Supabase: ${existing.length}`);

  // 3. Delete existing stale/duplicate milestones for clean synchronization
  const { error: delErr } = await supabase.from('milestones').delete().eq('user_id', userId);
  if (delErr) {
    console.error('Failed to clear old milestones:', delErr);
    process.exit(1);
  }
  console.log('Cleared old/duplicate milestone rows.');

  // 4. Insert canonical verified milestones
  const rowsToInsert = canonicalMilestones.map(m => ({
    user_id: userId,
    title: m.title,
    deadline: m.deadline,
    status: m.status,
    xp_reward: m.xp_reward,
    note: m.note
  }));

  const { data: inserted, error: insErr } = await supabase.from('milestones').insert(rowsToInsert).select();
  if (insErr) {
    console.error('Failed to insert canonical milestones:', insErr);
    process.exit(1);
  }

  console.log(`Successfully synced ${inserted.length} canonical milestones to Supabase!`);
}

syncMilestones().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
