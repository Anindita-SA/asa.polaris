// ─────────────────────────────────────────────────────────────────────────────
// POLARIS — Complete Default Data for Anindita Sarker Aloka
// Generated: May 2026
// ─────────────────────────────────────────────────────────────────────────────

// ── Identity ──────────────────────────────────────────────────────────────────

export const DEFAULT_CLARITY_ANCHOR =
  "Engineer who thinks like a designer. Inventor, not just engineer. Build things that matter for people who need them.";

export const DEFAULT_CURRENT_CHAPTER = "Chapter I: The Foundation";

export const DEFAULT_EULOGY = {
  version_label: "Original — June 2024",
  written_date: "2024-06-25",
  content:
    "Anindita Sarker was a kind hearted, honest, empathetic woman who loved to help others in need and be around the people whom she loved. She was always devoted to her morals and values and to education — not academic learning in general — and she always looked forward to bettering herself in all the ways possible. She had an endless thirst of knowledge and tickling hands for making cool stuff. All her life, she devoted herself to make a good life for her family and the needy. She always advocated for sustainable living, reusing trash to form treasure and teach and motivate others to do the same. She built a brand and multiple companies that focused on creative output, expression, sustainable products, agri-tech and robotics with a non profit working towards a better future for ecosystems. She was one of the greatest artists of her time, using her art as a guide and a vessel for growing the things that she held dear. She pursued her MSc in Europe not as an end goal but as a launchpad — building toward companies at the intersection of engineering, design, and sustainability. She achieved financial independence through invention, not employment, within a decade. A Renaissance woman in the truest sense: engineer, designer, artist, inventor. She never left her family's side and was always present for her mother and father. She might not have been a perfect human being, but she always strived to be a good, loving, caring person and a good daughter, sister and friend.",
};

// ── Constellation Nodes ───────────────────────────────────────────────────────

export const DEFAULT_NODES = [
  { type: "root",     title: "POLARIS",   description: "North star — MSc Europe → FI through invention",        x_pos: 0.5,  y_pos: 0.5  },
  { type: "career",   title: "Career",    description: "Portfolio, research, applications, internships",         x_pos: 0.25, y_pos: 0.25 },
  { type: "academic", title: "Academic",  description: "NIT Trichy coursework, CGPA, lab exams",                 x_pos: 0.75, y_pos: 0.25 },
  { type: "self",     title: "Self",      description: "Fitness, creative work, financial health, wellbeing",    x_pos: 0.5,  y_pos: 0.8  },
];

export const DEFAULT_SUBNODES = [
  { type: "career",   title: "Portfolio",        description: "Projects documented with design process",                    x_pos: 0.08, y_pos: 0.1,  parentTitle: "Career"    },
  { type: "career",   title: "MSc Applications", description: "37 targets across Europe, Jan 2027 submission",              x_pos: 0.18, y_pos: 0.05, parentTitle: "Career"    },
  { type: "career",   title: "CHAARG",           description: "LiPo mod board — CHAARG-L and CHAARG-P variants",            x_pos: 0.28, y_pos: 0.1,  parentTitle: "Career"    },
  { type: "career",   title: "Survey Paper",     description: "DAB converter control strategies — IEEE Access target",      x_pos: 0.18, y_pos: 0.2,  parentTitle: "Career"    },
  { type: "career",   title: "Solar Scheduler",  description: "Solar-aware deferrable load scheduler — IEEE conference",    x_pos: 0.08, y_pos: 0.25, parentTitle: "Career"    },
  { type: "career",   title: "Deskimon",         description: "Desk companion with pomodoro — product, not just concept",   x_pos: 0.28, y_pos: 0.25, parentTitle: "Career"    },
  { type: "academic", title: "Coursework",       description: "PSPS, MPMC, electives — protect CGPA floor 7.75+",          x_pos: 0.72, y_pos: 0.1,  parentTitle: "Academic"  },
  { type: "academic", title: "DAB Research",     description: "DAB converter hardware under Dr. Vignesh Kumar",             x_pos: 0.82, y_pos: 0.15, parentTitle: "Academic"  },
  { type: "self",     title: "Fitness",          description: "Greek Commoner Workout → Athena physique",                   x_pos: 0.38, y_pos: 0.85, parentTitle: "Self"      },
  { type: "self",     title: "Creative",         description: "Substack, conservation art, music, storytelling",            x_pos: 0.5,  y_pos: 0.92, parentTitle: "Self"      },
  { type: "self",     title: "Financial",        description: "FI roadmap — entrepreneurship not employment",               x_pos: 0.62, y_pos: 0.85, parentTitle: "Self"      },
];

// ── Goals ─────────────────────────────────────────────────────────────────────

export const DEFAULT_GOALS = [

  // ── DAILY ────────────────────────────────────────────────────────────────────
  { node_title: "Survey Paper",     scope: "daily", title: "Read and annotate 1 DAB paper",                      target: 1,  unit: "paper",    xp_reward: 20 },
  { node_title: "Portfolio",        scope: "daily", title: "Add content to a portfolio case study",              target: 1,  unit: "session",  xp_reward: 20 },
  { node_title: "Fitness",          scope: "daily", title: "Complete Greek Commoner Workout or 30min movement",  target: 1,  unit: "session",  xp_reward: 15 },
  { node_title: "Creative",         scope: "daily", title: "10 minutes of non-technical creative work",          target: 10, unit: "minutes",  xp_reward: 10 },

  // ── WEEKLY ───────────────────────────────────────────────────────────────────
  { node_title: "Survey Paper",     scope: "weekly", title: "Read and annotate DAB papers for literature base",           target: 5,  unit: "papers",   xp_reward: 50 },
  { node_title: "Survey Paper",     scope: "weekly", title: "Write 500 words of survey paper draft",                      target: 500, unit: "words",   xp_reward: 50 },
  { node_title: "CHAARG",           scope: "weekly", title: "Make progress on CHAARG-L schematic in KiCad",               target: 1,  unit: "session",  xp_reward: 50 },
  { node_title: "Solar Scheduler",  scope: "weekly", title: "Work on solar scheduler firmware or hardware",                target: 2,  unit: "sessions", xp_reward: 50 },
  { node_title: "Portfolio",        scope: "weekly", title: "Work on portfolio site or project documentation",             target: 2,  unit: "sessions", xp_reward: 50 },
  { node_title: "MSc Applications", scope: "weekly", title: "Research one university or scholarship on tracker",           target: 1,  unit: "entry",    xp_reward: 50 },
  { node_title: "Fitness",          scope: "weekly", title: "Complete 4 resistance band sessions",                        target: 4,  unit: "sessions", xp_reward: 50 },
  { node_title: "Creative",         scope: "weekly", title: "Write one Substack draft or creative entry",                 target: 1,  unit: "draft",    xp_reward: 50 },
  { node_title: "Coursework",       scope: "weekly", title: "Stay on top of assigned coursework — no backlogs",           target: 1,  unit: "review",   xp_reward: 50 },
  { node_title: "DAB Research",     scope: "weekly", title: "Meet with or update Dr. Vignesh Kumar on DAB progress",      target: 1,  unit: "update",   xp_reward: 50 },

  // ── MONTHLY ──────────────────────────────────────────────────────────────────
  { node_title: "Survey Paper",     scope: "monthly", title: "Complete one full section of the survey paper",             target: 1,  unit: "section",    xp_reward: 50 },
  { node_title: "Survey Paper",     scope: "monthly", title: "Collect and categorize 20+ DAB papers in Zotero",           target: 20, unit: "papers",     xp_reward: 50 },
  { node_title: "CHAARG",           scope: "monthly", title: "Complete one major CHAARG milestone (schematic/BOM/PCB)",   target: 1,  unit: "milestone",  xp_reward: 50 },
  { node_title: "Solar Scheduler",  scope: "monthly", title: "Complete one phase of solar scheduler project",             target: 1,  unit: "phase",      xp_reward: 50 },
  { node_title: "Portfolio",        scope: "monthly", title: "Publish one complete project case study to portfolio site",  target: 1,  unit: "case study", xp_reward: 50 },
  { node_title: "MSc Applications", scope: "monthly", title: "Research and verify 5 university deadlines + requirements", target: 5,  unit: "unis",       xp_reward: 50 },
  { node_title: "Fitness",          scope: "monthly", title: "Track progressive overload — increase reps or resistance",  target: 1,  unit: "milestone",  xp_reward: 50 },
  { node_title: "Creative",         scope: "monthly", title: "Publish one Substack post",                                 target: 1,  unit: "post",       xp_reward: 50 },
  { node_title: "Financial",        scope: "monthly", title: "Review spending and scholarship deadlines for the month",   target: 1,  unit: "review",     xp_reward: 50 },
  { node_title: "Coursework",       scope: "monthly", title: "Complete all lab assignments and submissions on time",      target: 1,  unit: "month",      xp_reward: 50 },

  // ── QUARTERLY ────────────────────────────────────────────────────────────────
  { node_title: "Survey Paper",     scope: "quarterly", title: "Complete full draft of DAB survey paper (Sections 1-6)", target: 1,  unit: "draft",      xp_reward: 50 },
  { node_title: "CHAARG",           scope: "quarterly", title: "CHAARG-L PCB ordered and validated",                    target: 1,  unit: "milestone",  xp_reward: 50 },
  { node_title: "Solar Scheduler",  scope: "quarterly", title: "Solar scheduler baseline data collection complete",      target: 1,  unit: "milestone",  xp_reward: 50 },
  { node_title: "Portfolio",        scope: "quarterly", title: "3 case studies live on portfolio site",                  target: 3,  unit: "projects",   xp_reward: 50 },
  { node_title: "MSc Applications", scope: "quarterly", title: "Cold email 5 TU Delft/TU/e/Aalto faculty",              target: 5,  unit: "emails",     xp_reward: 50 },
  { node_title: "MSc Applications", scope: "quarterly", title: "Identify and apply to 2 relevant competitions",         target: 2,  unit: "entries",    xp_reward: 50 },
  { node_title: "Fitness",          scope: "quarterly", title: "Establish consistent 4x/week workout habit",             target: 1,  unit: "habit",      xp_reward: 50 },
  { node_title: "Creative",         scope: "quarterly", title: "Complete 3 Substack posts — find your writing voice",   target: 3,  unit: "posts",      xp_reward: 50 },
  { node_title: "Financial",        scope: "quarterly", title: "Map full masters funding gap and scholarship options",   target: 1,  unit: "plan",       xp_reward: 50 },

  // ── YEARLY ───────────────────────────────────────────────────────────────────
  { node_title: "Survey Paper",     scope: "yearly", title: "Submit DAB survey paper to IEEE Access or Energies",        target: 1,  unit: "submission",   xp_reward: 50 },
  { node_title: "Solar Scheduler",  scope: "yearly", title: "Submit solar scheduler paper to IEEE conference",           target: 1,  unit: "submission",   xp_reward: 50 },
  { node_title: "CHAARG",           scope: "yearly", title: "CHAARG-L fully documented and on portfolio site",           target: 1,  unit: "project",     xp_reward: 50 },
  { node_title: "Portfolio",        scope: "yearly", title: "Portfolio fully populated — 4 real projects live",          target: 4,  unit: "projects",    xp_reward: 50 },
  { node_title: "MSc Applications", scope: "yearly", title: "Submit all 37 MSc applications by January 2027",           target: 37, unit: "applications", xp_reward: 50 },
  { node_title: "MSc Applications", scope: "yearly", title: "Retake IELTS — score 7.5 or above",                        target: 1,  unit: "test",        xp_reward: 50 },
  { node_title: "MSc Applications", scope: "yearly", title: "Obtain MOI certificate from NIT Trichy registrar",         target: 1,  unit: "document",    xp_reward: 50 },
  { node_title: "MSc Applications", scope: "yearly", title: "Secure at least 2 strong recommendation letters",          target: 2,  unit: "letters",     xp_reward: 50 },
  { node_title: "DAB Research",     scope: "yearly", title: "Make meaningful hardware contribution to DAB converter",    target: 1,  unit: "milestone",   xp_reward: 50 },
  { node_title: "Fitness",          scope: "yearly", title: "Build foundation — consistent strength and movement habit", target: 1,  unit: "year",        xp_reward: 50 },
  { node_title: "Creative",         scope: "yearly", title: "12 Substack posts — consistent voice established",         target: 12, unit: "posts",       xp_reward: 50 },
  { node_title: "Financial",        scope: "yearly", title: "Apply to Swedish Institute Scholarship (opens Aug 2026)",  target: 1,  unit: "application", xp_reward: 50 },

  // ── 5-YEAR ───────────────────────────────────────────────────────────────────
  { node_title: "MSc Applications", scope: "5yr", title: "Complete MSc at a top European university",                    target: 1,   unit: "degree",      xp_reward: 750  },
  { node_title: "CHAARG",           scope: "5yr", title: "CHAARG-P deployed as real product — first 100 units sold",    target: 100, unit: "units",       xp_reward: 1000 },
  { node_title: "Solar Scheduler",  scope: "5yr", title: "Solar scheduler deployed in real off-grid community",         target: 1,   unit: "deployment",  xp_reward: 1000 },
  { node_title: "Deskimon",         scope: "5yr", title: "Deskimon launched as a commercial product",                   target: 1,   unit: "launch",      xp_reward: 750  },
  { node_title: "Financial",        scope: "5yr", title: "Generate first revenue from a product you built",             target: 1,   unit: "milestone",   xp_reward: 1000 },
  { node_title: "Financial",        scope: "5yr", title: "Achieve financial independence — not dependent on salary",    target: 1,   unit: "milestone",   xp_reward: 1000 },
  { node_title: "Creative",         scope: "5yr", title: "Establish a creative practice — art, writing, or both",       target: 1,   unit: "practice",    xp_reward: 500  },
  { node_title: "Fitness",          scope: "5yr", title: "Achieve Athena physique benchmark — strong, capable, free",  target: 1,   unit: "milestone",   xp_reward: 750  },
  { node_title: "Portfolio",        scope: "5yr", title: "Portfolio recognized — leads to speaking, collaboration, or press", target: 1, unit: "recognition", xp_reward: 750 },
];

// ── Habits ────────────────────────────────────────────────────────────────────

export const DEFAULT_HABITS = [
  { title: "Morning movement — resistance bands or walk, minimum 15 minutes",     frequency: "daily",  xp_reward: 15 },
  { title: "Hit protein target for the day",                                       frequency: "daily",  xp_reward: 10 },
  { title: "One Pomodoro session on the top Focus Board item",                     frequency: "daily",  xp_reward: 20 },
  { title: "Read one paper, article, or chapter — anything that feeds curiosity",  frequency: "daily",  xp_reward: 10 },
  { title: "No doom scrolling before 10am — protect morning brain",               frequency: "daily",  xp_reward: 10 },
  { title: "Weekly review — update Focus Board, check deadlines, clear backburner",frequency: "weekly", xp_reward: 30 },
  { title: "Contact home — call or message family",                               frequency: "weekly", xp_reward: 15 },
  { title: "One act of creative output — sketch, write, make anything",           frequency: "weekly", xp_reward: 20 },
];

// ── Focus Board (max 3 active) ────────────────────────────────────────────────

export const DEFAULT_FOCUS_ITEMS = [
  {
    title: "DAB Survey Paper",
    category: "research",
    why_now: "June 2026 deadline is the single most important near-term milestone. A submitted paper changes the entire SOP narrative. Start literature search in Zotero this week.",
  },
  {
    title: "CHAARG-L PCB Schematic",
    category: "hardware",
    why_now: "Schematic started but not complete. PCB ordered = portfolio piece locked. This is the strongest technical project for IPD admission. Must be done before KGP internship starts.",
  },
  {
    title: "Concrete Speaker — Deploy to Portfolio Site",
    category: "portfolio",
    why_now: "MDX file is written and sitting in outputs. Zero excuse. Deploy it today. Every day it isn't live is a wasted portfolio impression.",
  },
];

// ── Backburner ────────────────────────────────────────────────────────────────

export const DEFAULT_BACKBURNER = [
  {
    title: "Deskimon",
    why_deferred: "Product concept locked and IP protected. Cannot split focus while CHAARG and paper are active. Will return after CHAARG-L is documented.",
    context_snapshot:
      "Physical desk companion with built-in pomodoro timer. Tactile interaction mechanic. Identified as James Dyson Award 2026 candidate (deadline July 15). IPD-flavored project — strongest design-thinking portfolio piece once built. Do NOT share this concept publicly until filed or submitted.",
  },
  {
    title: "Winter Internship Abroad",
    why_deferred: "Applications open August-October 2026. No action needed until then. Council ruled it lower priority than paper and CHAARG for same time window.",
    context_snapshot:
      "Targets: KAUST VSRP (USD 1,000/month, rolling), NUS IRIS Singapore, cold email TU Delft/TU/e faculty for December lab visit. Workation backup: Chiang Mai or Kuala Lumpur self-funded ~₹50k for 4 weeks. Primary motivation: get out of India, decompress, see a target school. Start applications August 2026.",
  },
  {
    title: "oikos International — Communications Role",
    why_deferred: "Email drafted, not yet sent. Low urgency but high network value if it lands. Send when exams are over.",
    context_snapshot:
      "Impact Communications & Content Creator role, 3-5 hrs/week remote, info@oikos-international.org. Draft: introduce as NIT Trichy EEE student from Bangladesh, link portfolio + Substack. Role requires Canva + storytelling. Fits creative identity. Keep only if it energizes — drop if it feels like obligation.",
  },
  {
    title: "ME3+ / MESPOM Erasmus Mundus",
    why_deferred: "Council revised their priority downward once entrepreneurship was weighted properly. Still valid applications but not where main SOP energy should go.",
    context_snapshot:
      "ME3+ (Management & Engineering of Environment & Energy) — full ride, EEE qualifies, best sustainability-policy fit. MESPOM — full ride, more policy-heavy, less technical. Both have Jan 2027 deadlines. Apply with template SOP adaptation, not bespoke effort. Primary energy goes to IPD, TU/e, Polimi, Wageningen.",
  },
];

// ── Milestones ────────────────────────────────────────────────────────────────

export const DEFAULT_MILESTONES = [
  { title: 'Deploy concrete speaker to portfolio',   deadline: '2026-05-15', status: 'done',     xp_reward: 150 },
  { title: 'DAB survey paper submitted',              deadline: '2026-06-30', status: 'upcoming', xp_reward: 200 },
  { title: 'CHAARG PCB complete + documented',        deadline: '2026-08-31', status: 'upcoming', xp_reward: 200 },
  { title: 'Cold email TU Delft / TU/e faculty',     deadline: '2026-08-31', status: 'upcoming', xp_reward: 100 },
  { title: 'MOI certificate from NIT Trichy',         deadline: '2026-09-30', status: 'upcoming', xp_reward: 75  },
  { title: 'IELTS retake',                            deadline: '2026-09-30', status: 'upcoming', xp_reward: 150 },
  { title: 'Portfolio fully populated',                deadline: '2026-10-31', status: 'upcoming', xp_reward: 175 },
  { title: 'Applications open',                       deadline: '2026-11-01', status: 'upcoming', xp_reward: 50  },
  { title: 'Submit all applications',                 deadline: '2027-01-31', status: 'upcoming', xp_reward: 300 },
];

// ── Curriculum ────────────────────────────────────────────────────────────────

export const DEFAULT_CURRICULUM = [
  // ── CAREER ──
  {
    node_title: "Career",
    title: "PCB Design with KiCad",
    description: "CHAARG-L and CHAARG-P board design fundamentals",
    topics: [
      "KiCad project setup and library management",
      "Schematic capture — components, nets, power symbols",
      "Footprint assignment and custom footprint creation",
      "PCB layout — placement, routing, design rules",
      "BOM generation and JLCPCB ordering workflow",
      "Design review checklist and documentation",
    ],
  },
  {
    node_title: "Career",
    title: "Portfolio & Design Thinking",
    description: "Building a portfolio that tells engineering stories",
    topics: [
      "Case study structure — problem, process, outcome",
      "Technical photography and diagram creation",
      "MDX/Next.js portfolio site architecture",
      "Writing design rationale for non-technical readers",
      "Deploying and maintaining portfolio on Vercel",
    ],
  },
  {
    node_title: "Career",
    title: "MSc Application Strategy",
    description: "Systematic approach to European MSc applications",
    topics: [
      "University shortlisting — IPD, TU/e, Polimi, Aalto, Wageningen",
      "SOP writing — narrative arc and differentiation",
      "Cold emailing faculty — template and tracking",
      "Scholarship mapping — SI, Erasmus Mundus, Holland",
      "IELTS prep strategy — target 7.5+",
      "Recommendation letter coordination",
    ],
  },
  // ── ACADEMIC ──
  {
    node_title: "Academic",
    title: "DAB Converter Fundamentals",
    description: "Theory and hardware for survey paper + research",
    topics: [
      "DAB topology and operating principles",
      "Phase-shift modulation strategies (SPS, EPS, DPS, TPS)",
      "Small-signal modeling and transfer functions",
      "MATLAB/Simulink simulation of DAB converter",
      "Literature survey methodology using Zotero",
      "IEEE paper writing format and LaTeX template",
    ],
  },
  {
    node_title: "Academic",
    title: "Semester Coursework",
    description: "PSPS, MPMC, electives — protect CGPA 7.75+",
    topics: [
      "Power System Protection & Switchgear fundamentals",
      "Microprocessor & Microcontroller lab experiments",
      "Elective coursework and assignment tracking",
      "Lab exam preparation and viva questions",
    ],
  },
  // ── SELF ──
  {
    node_title: "Self",
    title: "Greek Commoner Workout System",
    description: "Building the Athena physique — progressive overload",
    topics: [
      "Resistance band selection and progression chart",
      "Full body compound movements — squats, rows, press",
      "Progressive overload tracking — reps, sets, resistance",
      "Protein target calculation and meal planning",
      "Recovery and mobility work",
    ],
  },
  {
    node_title: "Self",
    title: "Creative Practice & Substack",
    description: "Finding your writing and art voice",
    topics: [
      "Substack setup and publishing workflow",
      "Finding your writing niche — engineering meets sustainability",
      "Conservation art techniques and storytelling",
      "Building a consistent creative schedule",
      "Audience engagement and newsletter growth",
    ],
  },
  {
    node_title: "Self",
    title: "Financial Independence Roadmap",
    description: "Entrepreneurship-first path to FI",
    topics: [
      "Revenue model brainstorming — product vs service",
      "Scholarship and funding gap analysis",
      "Basic financial literacy — budgeting, saving rate",
      "First product revenue strategy (CHAARG-P or Deskimon)",
    ],
  },
];

// ── Leveling System ───────────────────────────────────────────────────────────

export const LEVEL_NAMES = [
  { level: 1, name: 'Stargazer', minXp: 0 },
  { level: 2, name: 'Apprentice Inventor', minXp: 1000 },
  { level: 3, name: 'Circuit Weaver', minXp: 2500 },
  { level: 4, name: 'Signal Architect', minXp: 5000 },
  { level: 5, name: 'Renaissance Engineer', minXp: 8500 },
  { level: 6, name: 'Polaris Navigator', minXp: 13000 },
  { level: 7, name: 'Constellation Maker', minXp: 19000 },
  { level: 8, name: 'Da Vinci Inheritor', minXp: 27000 },
]

export const getLevelInfo = (xp) => {
  let current, next, progress
  
  if (xp >= 27000) {
    const extraLevel = Math.floor((xp - 27000) / 10000) + 1
    const level = 8 + extraLevel
    const minXp = 27000 + (extraLevel - 1) * 10000
    const nextMinXp = 27000 + extraLevel * 10000
    
    current = { level, name: `Grandmaster Inventor (Grade ${extraLevel})`, minXp }
    next = { level: level + 1, name: `Grandmaster Inventor (Grade ${extraLevel + 1})`, minXp: nextMinXp }
    progress = ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
  } else {
    current = LEVEL_NAMES[0]
    next = LEVEL_NAMES[1]
    for (let i = LEVEL_NAMES.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_NAMES[i].minXp) {
        current = LEVEL_NAMES[i]
        next = LEVEL_NAMES[i + 1] || null
        break
      }
    }
    progress = next ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100 : 100
  }
  
  return { current, next, progress }
}
