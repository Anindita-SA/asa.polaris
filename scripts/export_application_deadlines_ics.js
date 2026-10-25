// Script to export verified milestones, 14-day runways, and 7-day buffers to an RFC 5545 compliant .ics calendar file.
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target output path in Higher's application and Internship stuff
const defaultTargetPath = path.resolve(__dirname, '../../Higher\'s application and Internship stuff/docs/application_deadlines.ics');

// RFC 5545 Text escaping: backslash, semicolon, comma, newlines
function escapeText(str) {
  if (!str) return '';
  // Sanitize any em-dash or en-dash to standard ASCII hyphen-minus
  const sanitized = str
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, ' - ');
  return sanitized
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

// RFC 5545 Section 3.1 Line folding (max 75 octets per line)
function foldLine(line) {
  const maxLen = 75;
  if (Buffer.byteLength(line, 'utf8') <= maxLen) {
    return line;
  }
  const chunks = [];
  let remaining = line;
  let isFirst = true;
  while (remaining.length > 0) {
    const limit = isFirst ? maxLen : maxLen - 1; // 1 octet reserved for leading space on folded lines
    let sliceEnd = 0;
    let byteCount = 0;
    for (const char of remaining) {
      const charBytes = Buffer.byteLength(char, 'utf8');
      if (byteCount + charBytes > limit) {
        break;
      }
      byteCount += charBytes;
      sliceEnd += char.length;
    }
    if (sliceEnd === 0) {
      const codePoint = remaining.codePointAt(0);
      sliceEnd = String.fromCodePoint(codePoint).length;
    }
    const chunk = remaining.slice(0, sliceEnd);
    chunks.push(isFirst ? chunk : ' ' + chunk);
    remaining = remaining.slice(sliceEnd);
    isFirst = false;
  }
  return chunks.join('\r\n');
}

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  const [y, m, d] = clean.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addDays(date, days) {
  const res = new Date(date.getTime());
  res.setUTCDate(res.getUTCDate() + days);
  return res;
}

function getDtstamp() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

// Fallback canonical milestones if Supabase connection fails
const fallbackMilestones = [
  { title: "Deploy concrete speaker to portfolio", deadline: "2026-05-15", status: "done", xp_reward: 100, note: "Plywood front baffle and cast concrete body case study." },
  { title: "IELTS Academic Exam (Booked)", deadline: "2026-10-03", status: "done", xp_reward: 150, note: "Booked test date. Computer-delivered. Weekday & weekend prep active." },
  { title: "Sweden National Application Portal Opens", deadline: "2026-10-16", status: "upcoming", xp_reward: 50, note: "UniversityAdmissions.se opens for Autumn 2027 intake." },
  { title: "NPTEL Exam", deadline: "2026-10-17", status: "upcoming", xp_reward: 50, note: "" },
  { title: "Agri Solar Survey Paper: Phase 1 & 2", deadline: "2026-10-20", status: "upcoming", xp_reward: 100, note: "Unblock draft with 2-3 charts and search synthesis for Energies (MDPI)." },
  { title: "Portfolio Site: Replace Placeholders", deadline: "2026-10-25", status: "upcoming", xp_reward: 100, note: "Replace fictional placeholders with Concrete Speaker, CHAARG, Deskimon, Polaris." },
  { title: "DAB Converter & Power Electronics EMC Research Paper (Dr. Vignesh Kumar)", deadline: "2026-10-31", status: "upcoming", xp_reward: 100, note: "MATLAB simulation, custom PCB design/fabrication for power conversion, and EMC testing with Dr. Vignesh Kumar at NIT Trichy." },
  { title: "EMI / Power Converter Research Placement", deadline: "2026-10-31", status: "upcoming", xp_reward: 100, note: "Standard EMC and converter topologies with Dr. Vignesh Kumar (NIT Trichy)." },
  { title: "Politecnico di Milano 1st Call (Early Bird)", deadline: "2026-12-01", status: "upcoming", xp_reward: 150, note: "MSc Integrated Product Design & EE. Best window for Platinum/Gold merit scholarships." },
  { title: "TU Delft Justus & Louise van Effen Scholarship Deadline", deadline: "2026-12-01", status: "upcoming", xp_reward: 200, note: "MSc IPD & MSc EE Power Track. Full Ride (~€30k/yr). Cutoff 23:59 CET." },
  { title: "E-Summit '26 (IIT Bombay)", deadline: "2026-12-12", status: "upcoming", xp_reward: 100, note: "Annual Entrepreneurship Summit organized by E-Cell IIT Bombay on December 12-13, 2026. Keynotes, startup competitions, workshops, and founder networking." },
  { title: "Neurodivergence & System Tuning", deadline: "2026-12-31", status: "in_progress", xp_reward: 100, note: "Dedicated space for self-accommodation, ADHD-friendly UI tweaks, and system optimizations." },
  { title: "Erasmus Mundus STEPS Application Cutoff", deadline: "2026-12-31", status: "upcoming", xp_reward: 150, note: "Power electronics track. Direct match with SiC converter research." },
  { title: "Aalto University CoID & Finland Scholarship Cutoff", deadline: "2027-01-02", status: "upcoming", xp_reward: 150, note: "Single unified application window (closes 15:00 UTC+2). 100% tuition + €5k relocation." },
  { title: "Erasmus Mundus SSIs Application Cutoff", deadline: "2027-01-10", status: "upcoming", xp_reward: 150, note: "Smart Systems Integrated Solutions (microsystems & smart sensors)." },
  { title: "Erasmus Mundus SUSTAGRI Application Cutoff", deadline: "2027-01-15", status: "upcoming", xp_reward: 150, note: "Cutting-Edge Tech for Sustainable Agriculture (reusing solar irrigation thesis)." },
  { title: "Sweden National Portal: 4 Ranked Choices Cutoff", deadline: "2027-01-15", status: "upcoming", xp_reward: 200, note: "Lock in 4 ranked choices on UniversityAdmissions.se (KTH, Chalmers, Lund, Umeå, Konstfack)." },
  { title: "TU Delft General Non-Scholarship Cutoff", deadline: "2027-01-15", status: "upcoming", xp_reward: 150, note: "Final non-EU deadline for MSc IPD & MSc EE." },
  { title: "Erasmus Mundus EMINENT Application Cutoff", deadline: "2027-01-15", status: "upcoming", xp_reward: 150, note: "Embedded Intelligence Nanosystems Engineering." },
  { title: "Erasmus Mundus EDISS Application Cutoff", deadline: "2027-01-15", status: "upcoming", xp_reward: 150, note: "Data-Intensive Intelligent Software Systems." },
  { title: "Politecnico di Milano 2nd Call (Design Portfolio Cutoff)", deadline: "2027-01-29", status: "upcoming", xp_reward: 150, note: "Final submission deadline for MSc Integrated Product Design portfolio." },
  { title: "Erasmus Mundus DREAM Application Cutoff", deadline: "2027-01-31", status: "upcoming", xp_reward: 150, note: "Dynamics of Renewables-based Power Systems." },
  { title: "Erasmus Mundus EU-CORE Application Cutoff", deadline: "2027-01-31", status: "upcoming", xp_reward: 150, note: "Control of Renewable Energy Systems." },
  { title: "Erasmus Mundus SemiChips Application Cutoff", deadline: "2027-01-31", status: "upcoming", xp_reward: 150, note: "Semiconductor Chips & Systems." },
  { title: "Wageningen University Excellence Scholarship Cutoff", deadline: "2027-02-01", status: "upcoming", xp_reward: 150, note: "Excellence Programme cutoff for MSc Biosystems Engineering." },
  { title: "TU/e Eindhoven ALSP Scholarship Deadline", deadline: "2027-02-01", status: "upcoming", xp_reward: 200, note: "Amandus H. Lundqvist Scholarship (€15k/yr + Full Tuition). MSc Industrial Design." },
  { title: "Sweden Portal: Supporting Documents & Fee Cutoff", deadline: "2027-02-01", status: "upcoming", xp_reward: 100, note: "Receipt of transcripts, IELTS scores, and 900 SEK fee on UniversityAdmissions.se." },
  { title: "UN Environmental Track & YPP Roadmap Launch", deadline: "2027-02-15", status: "upcoming", xp_reward: 150, note: "Spring 2027 milestone to kick off UN Environmental credentials post-MSc applications. Review YPP tracks, start UN CC:Learn courses, and openLCA modeling." },
  { title: "Danish Universities Non-EU Application Cutoff", deadline: "2027-03-01", status: "upcoming", xp_reward: 150, note: "Aalborg (MSc ID), Aarhus (MSc IT Prod Dev), Design School Kolding non-EU cutoff." },
  { title: "Government of Ireland (GOI-IES) Scholarship Cutoff", deadline: "2027-03-13", status: "upcoming", xp_reward: 200, note: "Full tuition waiver + €10k stipend (requires conditional/unconditional Irish offer)." },
  { title: "Erasmus Mundus EMIMEP Application Cutoff", deadline: "2027-03-13", status: "upcoming", xp_reward: 150, note: "Microwave Electronics & Photonics." },
  { title: "Sweden National Admissions Results", deadline: "2027-03-25", status: "upcoming", xp_reward: 100, note: "First selection results published on UniversityAdmissions.se." },
  { title: "UCD Global Excellence Scholarship & Irish Cutoffs", deadline: "2027-03-31", status: "upcoming", xp_reward: 150, note: "100%/50% tuition waiver for UCD offer holders; Irish university rolling cutoffs." },
  { title: "TU/e Eindhoven General Non-EU Cutoff", deadline: "2027-05-01", status: "upcoming", xp_reward: 100, note: "Final non-EU deadline for TU/e master's programs." },
  { title: "Wageningen University General Non-EU Cutoff", deadline: "2027-05-01", status: "upcoming", xp_reward: 100, note: "Final non-EU deadline for MSc Biosystems Engineering." },
  { title: "B.Tech EEE Graduation at NIT Trichy", deadline: "2027-06-30", status: "upcoming", xp_reward: 300, note: "Official degree completion and graduation." },
  { title: "Master's Program Commencement in Europe", deadline: "2027-09-01", status: "upcoming", xp_reward: 500, note: "Master's program intake commencement in Europe." },
  { title: "Victoria University of Wellington Master's by Thesis Scholarship Cutoff", deadline: "2027-11-01", status: "upcoming", xp_reward: 200, note: "VUW Master's by Thesis Scholarship deadline (NZD $15,000 tax-free stipend + tuition waiver). MDI and ME tracks." },
  { title: "University of Otago Master's Scholarship & Admission Cutoff", deadline: "2027-11-15", status: "upcoming", xp_reward: 150, note: "Otago International Master's Research Scholarship & Global Master's Scholarship (NZD $15k rebate) for Feb 2028 intake." },
  { title: "New Zealand Universities Feb 2028 International Cutoff", deadline: "2027-12-01", status: "upcoming", xp_reward: 150, note: "Canterbury ME (Francis Small / WRC), Lincoln Precision Agriculture, and Auckland ME application deadline for Feb 2028 intake." },
  { title: "New Zealand Master's Program Commencement", deadline: "2028-02-21", status: "upcoming", xp_reward: 500, note: "Semester 1 commencement in New Zealand (Otago / Canterbury / VUW / Lincoln / Auckland). 3-yr post-study work visa & 6-point SMC PR track." }
];

async function fetchMilestones() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await supabase.from('milestones').select('*').order('deadline', { ascending: true });
      if (!error && data && data.length >= 37) {
        console.log(`Successfully queried ${data.length} milestones from Supabase.`);
        return data;
      }
      console.warn('Supabase query issue or incomplete milestones:', error?.message);
    } catch (err) {
      console.warn('Supabase connection error:', err.message);
    }
  }
  console.log(`Using canonical fallback list of ${fallbackMilestones.length} milestones.`);
  return fallbackMilestones.map((m, idx) => ({
    id: `canonical-${idx + 1}`,
    ...m
  }));
}

export async function generateIcs(targetPath = defaultTargetPath) {
  const milestones = await fetchMilestones();
  const dtstamp = getDtstamp();

  // Create three event entries for each milestone:
  // 1. Canonical milestone deadline event (with 3 staggered pop-up VALARMs)
  // 2. 7-day buffer reminder event
  // 3. 14-day runway reminder event
  const events = [];

  for (const m of milestones) {
    const dt = parseDate(m.deadline);
    const dtEnd = addDays(dt, 1);
    const bufDt = addDays(dt, -7);
    const bufEnd = addDays(bufDt, 1);
    const runDt = addDays(dt, -14);
    const runEnd = addDays(runDt, 1);

    const safeUidBase = m.id || `m-${formatDate(dt)}-${m.title.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Canonical milestone event (3 staggered VALARMs: -P14D, -P7D, -P1D)
    events.push({
      type: 'milestone',
      startDate: formatDate(dt),
      endDate: formatDate(dtEnd),
      sortKey: formatDate(dt) + '_2',
      uid: `milestone-${safeUidBase}@polaris.app`,
      summary: m.title,
      description: [
        `Milestone: ${m.title}`,
        `Deadline: ${m.deadline}`,
        `Status: ${m.status || 'upcoming'}`,
        m.xp_reward ? `XP Reward: ${m.xp_reward}` : '',
        m.note ? `Notes: ${m.note}` : ''
      ].filter(Boolean).join('\n'),
      categories: 'MILESTONE,DEADLINE',
      alarms: [
        { trigger: '-P14D', desc: `Reminder: ${m.title} (14 days / 2 weeks remaining)` },
        { trigger: '-P7D', desc: `Reminder: ${m.title} (7 days remaining)` },
        { trigger: '-P1D', desc: `Reminder: ${m.title} (1 day remaining)` }
      ]
    });

    // 7-Day buffer reminder event
    events.push({
      type: 'buffer',
      startDate: formatDate(bufDt),
      endDate: formatDate(bufEnd),
      sortKey: formatDate(bufDt) + '_1',
      uid: `milestone-${safeUidBase}-buffer@polaris.app`,
      summary: `[7-Day Buffer] ${m.title}`,
      description: [
        `7-Day Buffer Milestone Reminder`,
        `Target Milestone: ${m.title}`,
        `Final Deadline: ${m.deadline}`,
        `Status: ${m.status || 'upcoming'}`,
        m.xp_reward ? `XP Reward: ${m.xp_reward}` : '',
        m.note ? `Notes: ${m.note}` : ''
      ].filter(Boolean).join('\n'),
      categories: 'BUFFER,REMINDER',
      alarms: [
        { trigger: '-P1D', desc: `Reminder: [7-Day Buffer] ${m.title} (1 day prior)` },
        { trigger: 'PT0S', desc: `Reminder: [7-Day Buffer] ${m.title} (Buffer Active)` }
      ]
    });

    // 14-Day runway reminder event
    events.push({
      type: 'runway',
      startDate: formatDate(runDt),
      endDate: formatDate(runEnd),
      sortKey: formatDate(runDt) + '_0',
      uid: `milestone-${safeUidBase}-runway@polaris.app`,
      summary: `[14-Day Runway] ${m.title}`,
      description: [
        `14-Day Runway Milestone Reminder`,
        `Target Milestone: ${m.title}`,
        `Final Deadline: ${m.deadline}`,
        `Status: ${m.status || 'upcoming'}`,
        m.xp_reward ? `XP Reward: ${m.xp_reward}` : '',
        m.note ? `Notes: ${m.note}` : ''
      ].filter(Boolean).join('\n'),
      categories: 'RUNWAY,REMINDER',
      alarms: [
        { trigger: '-P1D', desc: `Reminder: [14-Day Runway] ${m.title} (1 day prior)` },
        { trigger: 'PT0S', desc: `Reminder: [14-Day Runway] ${m.title} (Runway Active)` }
      ]
    });
  }

  // Sort events chronologically by sortKey (runway, then buffer, then deadline), tiebreak by UID
  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.uid.localeCompare(b.uid));

  // Build raw lines
  const rawLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Polaris Productivity//Application Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Master\'s Application Deadlines & Milestones',
    'X-WR-CALDESC:Verified Master\'s Application Deadlines\\, Scholarship Cutoffs\\, 14-Day Runways\\, and 7-Day Buffer Reminders',
    'X-WR-TIMEZONE:UTC'
  ];

  for (const ev of events) {
    rawLines.push('BEGIN:VEVENT');
    rawLines.push(`UID:${ev.uid}`);
    rawLines.push(`DTSTAMP:${dtstamp}`);
    rawLines.push(`DTSTART;VALUE=DATE:${ev.startDate}`);
    rawLines.push(`DTEND;VALUE=DATE:${ev.endDate}`);
    rawLines.push(`SUMMARY:${escapeText(ev.summary)}`);
    rawLines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    rawLines.push('STATUS:CONFIRMED');
    rawLines.push('CLASS:PUBLIC');
    rawLines.push('TRANSP:TRANSPARENT');
    rawLines.push(`CATEGORIES:${ev.categories}`);

    for (const alm of ev.alarms) {
      rawLines.push('BEGIN:VALARM');
      rawLines.push('ACTION:DISPLAY');
      rawLines.push(`DESCRIPTION:${escapeText(alm.desc)}`);
      rawLines.push(`TRIGGER:${alm.trigger}`);
      rawLines.push('END:VALARM');
    }

    rawLines.push('END:VEVENT');
  }

  rawLines.push('END:VCALENDAR');

  // Verify strict typography: ZERO em dashes and ZERO en dashes
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].includes('\u2014') || rawLines[i].includes('\u2013')) {
      throw new Error(`Forbidden em/en dash detected at raw line ${i + 1}: ${rawLines[i]}`);
    }
  }

  // Fold every line to max 75 octets per RFC 5545 section 3.1
  const foldedLines = rawLines.map(foldLine);

  // Join strictly with CRLF (\r\n) and terminate with CRLF
  const icsContent = foldedLines.join('\r\n') + '\r\n';

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write file with UTF-8 encoding
  fs.writeFileSync(targetPath, icsContent, { encoding: 'utf8' });

  const physicalLines = icsContent.split('\r\n');
  if (physicalLines[physicalLines.length - 1] === '') physicalLines.pop();

  console.log(`Generated RFC 5545 .ics file at: ${targetPath}`);
  console.log(`Total milestones: ${milestones.length}`);
  console.log(`Total events generated: ${events.length} (37 canonical deadlines + 37 7-day buffers + 37 14-day runways)`);
  console.log(`Total logical lines: ${rawLines.length}`);
  console.log(`Total physical lines: ${physicalLines.length}`);
  console.log(`Total file size: ${Buffer.byteLength(icsContent, 'utf8')} bytes`);

  return {
    milestonesCount: milestones.length,
    eventsCount: events.length,
    targetPath,
    fileSizeBytes: Buffer.byteLength(icsContent, 'utf8'),
    logicalLineCount: rawLines.length,
    physicalLineCount: physicalLines.length
  };
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateIcs().catch(err => {
    console.error('Failed to generate .ics file:', err);
    process.exit(1);
  });
}
