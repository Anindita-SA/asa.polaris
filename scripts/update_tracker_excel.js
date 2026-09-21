// Script to update Aloka_Masters_Tracker.xlsx with comprehensive program deadlines, scholarships, and timeline milestones.
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = 'E:/Academic files/Competiton and Project files/Polaris/Higher\'s application and Internship stuff/Aloka_Masters_Tracker.xlsx';

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const wb = XLSX.readFile(filePath);

// 1. Application Tracker Sheet Data
const appSummaryHeaders = ["📊 Summary", "Tier", "Count", "Main Scholarships Available"];
const appSummaryRows = [
  [null, "Erasmus Mundus", 7, "Full ride: tuition + €1,400/mo stipend + insurance"],
  [null, "Tier 1: Reach / Dream", 6, "Delft J&L van Effen, Aalto Excellence, Swedish Institute, ALSP"],
  [null, "Tier 2: Match", 8, "Swedish Institute, NL Scholarship, Polimi Merit, Danish Gov"],
  [null, "Tier 3 & Safety Floor", 14, "GOI-IES Ireland, UCD Global, Swedish Institute, Merit-based"]
];

const appTrackerHeaders = [
  "#", "Institution", "Location", "Program", "Tier", "Deadline", "Tuition/yr (€)", "Scholarship", "Scholarship €", "Portfolio?", "Status", "Notes"
];

const appTrackerRows = [
  // Dream & Primary
  ["1", "TU Delft", "Netherlands", "MSc Integrated Product Design", "Dream: fight for it", "Dec 1, 2026 (Scholarship) / Jan 15, 2027", "~€17,310", "Justus & Louise van Effen / NL Scholarship", "Full Ride (~€30k/yr) / €5,000", "Yes", "Not Started", "Council-confirmed dream. Best product-design culture for a hardware founder, YES!Delft incubator. Admission ~45-55% coin flip, unmatched discovery-culture fit. Contact made with Tilman. Portfolio max 30 pgs / 20MB. Apply with max effort."],
  ["1b", "TU Delft", "Netherlands", "MSc Electrical Engineering (Power Track)", "Dream: fight for it", "Dec 1, 2026 (Scholarship) / Jan 15, 2027", "~€17,310", "Justus & Louise van Effen / NL Scholarship", "Full Ride (~€30k/yr) / €5,000", "No", "Not Started", "EE track application running parallel to IPD. Direct fit for DAB converter research with Vignesh. Ranked batch admission for non-EU."],
  ["2", "TU/e Eindhoven", "Netherlands", "MSc Industrial Design", "Primary: revised", "Feb 1, 2027 (ALSP Scholarship) / May 1, 2027", "~€17,000", "ALSP / NL Scholarship", "€15,000/yr + Full Tuition / €5,000", "Yes", "Not Started", "Council-confirmed primary target. Eindhoven Brainport / High Tech Campus (ASML/NXP/Philips) powerhouse. ~70% admission odds. Similar studio fit to IPD with higher admission certainty. ALSP deadline Feb 1."],
  ["3", "Aalto University", "Finland", "Collaborative & Industrial Design (CoID)", "Tier 1: Reach", "Jan 2, 2027 (15:00 UTC+2)", "~€15,000", "Aalto Excellence / Finland Scholarship", "Full Tuition + €5k relocation", "Yes", "Not Started", "Single unified application window (Nov 30, 2026 - Jan 2, 2027). Highly ranked design ecosystem. Auto-evaluated for 100% tuition waiver and Finland Scholarship."],
  ["4", "Lund University", "Sweden", "MSc Industrial Design", "Tier 1: Reach", "Jan 15, 2027 (Sweden Portal) / Feb 1 Docs", "~€16,000", "Swedish Institute (SISGP)", "Full ride (Tuition + 12k SEK/mo)", "Yes", "Not Started", "IKEA Ingvar Kamprad Design Centre. Ranked choice on UniversityAdmissions.se. SISGP portal opens Feb 9-26, 2027."],
  ["5", "Royal College of Art (RCA)", "UK", "MA Design Products", "Tier 1: Reach", "Jan 14, 2027 (Round 1)", "~£28,000", "Limited RCA Bursaries", "Partial", "Yes", "Not Started", "Prestigious global brand in design. Very high tuition. Apply for brand reach if budget allows."],
  ["6", "Umeå Institute of Design", "Sweden", "MSc Advanced Product Design", "Tier 2: Match", "Jan 15, 2027 (Sweden Portal) / Feb 1 Docs", "~€13,000", "Swedish Institute (SISGP)", "Full ride (Tuition + 12k SEK/mo)", "Yes", "Not Started", "World-renowned industrial design school. Heavy focus on working prototypes and user research. Swedish national portal application."],
  ["7", "Design Academy Eindhoven", "Netherlands", "Master of Product Design", "Tier 2: Match", "Feb 1, 2027 / Rolling", "~€14,000", "Limited", "Partial", "Yes", "Not Started", "Experimental design thinking and material exploration. English-taught. Strong portfolio required."],
  ["8", "Politecnico di Milano", "Italy", "MSc Integrated Product Design", "Strong backup: financial", "Dec 1, 2026 (1st Call Early Bird) / Jan 29, 2027 (2nd Call)", "~€4,000", "Polimi Merit (Platinum/Gold/Silver)", "€10,000 / €5,000 / Tuition waiver", "Yes", "Not Started", "Council-confirmed strong backup (MAUT score 8.21). ~85% admission, near-zero debt, genuine design culture. Apply by Dec 1 for highest scholarship consideration."],
  ["8b", "Wageningen University (WUR)", "Netherlands", "MSc Biosystems Engineering", "Conditional backup: agritech", "Feb 1, 2027 (Excellence) / May 1, 2027", "~€21,900", "Wageningen Excellence Programme", "Full tuition + stipend", "Yes", "Not Started", "Target if agritech product thesis (CHAARG-P, solar irrigation EMS) is locked. ~75% admission odds. Feb 1 deadline for Excellence Scholarship."],

  // Match & Safety Scandinavian & Danish
  ["9", "Aalborg University", "Denmark", "MSc Industrial Design", "Tier 2: Match", "March 1, 2027", "~€12,000", "Danish Gov Scholarship", "Full/Partial Tuition", "Yes", "Not Started", "Problem-based learning methodology. Seamless design and engineering integration. English taught."],
  ["10", "Aarhus University", "Denmark", "MSc IT Product Development", "Tier 2: Match", "March 1, 2027", "~€11,000", "Danish Gov Scholarship", "Full/Partial Tuition", "Yes", "Not Started", "Bridges computer science, hardware, and industrial product design. Perfect for embedded systems and smart products."],
  ["11", "KTH Royal Institute", "Sweden", "MSc Product Innovation", "Tier 2: Match", "Jan 15, 2027 (Sweden Portal) / Feb 1 Docs", "~€14,000", "Swedish Institute (SISGP)", "Full ride (Tuition + 12k SEK/mo)", "Yes", "Not Started", "Engineering-design bridge. Ranked choice on UniversityAdmissions.se. SISGP portal Feb 9-26."],
  ["12", "Chalmers University", "Sweden", "MSc Product Development", "Tier 2: Match", "Jan 15, 2027 (Sweden Portal) / Feb 1 Docs", "~€13,500", "Swedish Institute (SISGP)", "Full ride (Tuition + 12k SEK/mo)", "Yes", "Not Started", "Industry-connected engineering product development. Gothenburg tech cluster. Swedish portal choice."],
  ["13", "University of Oulu", "Finland", "MSc Interdisciplinary Product Innovation", "Tier 3: Safety", "Jan 15, 2027", "~€10,000", "Oulu International Scholarship", "Partial tuition waiver", "Yes", "Not Started", "Inventor-friendly curriculum, FabLab access, low living costs. Finnish Joint Application."],
  ["14", "Mälardalen University", "Sweden", "MSc Embedded Systems", "Tier 3: Safety", "Jan 15, 2027 (Sweden Portal) / Feb 1 Docs", "~€13,000", "Swedish Institute (SISGP)", "Full ride (Tuition + 12k SEK/mo)", "No", "Not Started", "Strong embedded systems engineering curriculum. Solid technical safety net in Sweden."],
  ["15", "Design School Kolding", "Denmark", "MA Industrial Design", "Tier 3: Safety", "March 1, 2027", "~€12,000", "Limited", "Partial", "Yes", "Not Started", "Strong form and function focus, social design emphasis. English taught."],
  ["16", "TU Dublin", "Ireland", "MSc Product Design", "Safety floor: non-negotiable", "March 15, 2027 / Rolling", "~€9,000", "GOI-IES / Centenary Scholarship", "Full Ride / 50% waiver", "Yes", "Not Started", "Paired with UCD as the non-negotiable safety floor. English-speaking, Dublin tech ecosystem, accessible admission."],
  ["17", "Univ. Naples Federico II", "Italy", "MA Industrial Product Design", "Tier 3: Safety", "March 15, 2027", "~€3,000", "EDiSU Regional Scholarship", "Tuition waiver + €6,000/yr", "Yes", "Not Started", "Affordable base tuition. IoT and sustainability product focus."],
  ["18", "Konstfack", "Sweden", "MA Individual Study Plan in Design", "Tier 3: Safety", "Jan 15, 2027 (Sweden Portal)", "~€13,000", "Swedish Institute (SISGP)", "Full ride (Tuition + 12k SEK/mo)", "Yes", "Not Started", "Flexible project-based design curriculum. Swedish national portal application."],
  ["19", "Loughborough University", "UK", "MSc Industrial Design", "Tier 3: Safety", "March 31, 2027", "~£11,000", "Excellence Scholarship", "20% tuition discount", "Yes", "Not Started", "Focus from prototype to mass manufacturing. Strong industrial design labs."],
  ["20", "Kingston University", "UK", "MA Product & Furniture Design", "Tier 3: Safety", "March 31, 2027", "~£9,500", "International Scholarship", "£2,000 to £5,000", "Yes", "Not Started", "Solid London-based design master. Practical workshop access."],

  // Irish Track (Safety & Match)
  ["IE1", "Trinity College Dublin (TCD)", "Ireland", "MSc Computer Science (Future Networked Systems / HCI)", "Ireland: Reach", "March 31, 2027", "~€22,000", "TCD Global Excellence / GOI-IES", "€2,000-5,000 / Full Ride", "No", "Not Started", "Top Irish brand (#81 global). 1-year master. Proximity to Silicon Docks tech headquarters."],
  ["IE2", "University College Dublin (UCD)", "Ireland", "MSc Design for Sustainability / Smart Cities", "Safety floor: non-negotiable", "March 31, 2027 (Scholarship: March 31)", "~€18,000", "UCD Global Excellence / GOI-IES", "100% Tuition waiver / Full Ride", "Yes", "Not Started", "Non-negotiable safety floor paired with TU Dublin. ~90% admission odds, 2-year post-study work visa. Apply early to qualify for GOI-IES."],
  ["IE3", "University College Cork (UCC)", "Ireland", "MSc Design & Dev of Digital Business", "Ireland: Match", "March 31, 2027", "~€16,000", "UCC International Merit / GOI-IES", "10-20% discount / Full Ride", "No", "Not Started", "Auto-applied merit discount based on GPA. Cork lower living cost than Dublin. 1-year duration."],
  ["IE4", "NCAD Dublin", "Ireland", "MA Interaction Design", "Ireland: Match", "Feb 15, 2027", "~€9,500", "GOI-IES", "Full Ride", "Yes", "Not Started", "Studio-based 1-year program in Dublin. Covers physical computing, digital fabrication, and prototyping."],
  ["IE5", "IADT Dún Laoghaire", "Ireland", "MSc User Experience Design", "Ireland: Match", "March 15, 2027 / Rolling", "~€10,000", "GOI-IES", "Full Ride", "Yes", "Not Started", "18-month program with FabLab, VR/AR lab, and hardware UX testing facilities. Suits EEE background."],
  ["IE6", "University of Limerick (UL)", "Ireland", "MSc Interaction & Experience Design", "Ireland: Match", "March 31, 2027", "~€13,000", "UL Merit Scholarship / GOI-IES", "€2,000-4,000 / Full Ride", "Yes", "Not Started", "1-year curriculum bridging engineering and interactive physical product design. Affordable living in Limerick."],
  ["IE7", "Maynooth University", "Ireland", "MSc Design Innovation", "Ireland: Match", "March 31, 2027", "~€11,000", "GOI-IES", "Full Ride", "Yes", "Not Started", "Focuses on design innovation, product strategy, and user experience. 1-year duration."],
  ["IE8", "DCU Dublin", "Ireland", "MSc Electronic & Computer Engineering", "Ireland: Safety", "March 31, 2027", "~€14,000", "DCU International Merit / GOI-IES", "€2,000 / Full Ride", "No", "Not Started", "Technical engineering safety net in Dublin. Strong IoT and semiconductor modules."],
  ["IE9", "South East Tech Univ (SETU)", "Ireland", "MSc Interaction Design", "Ireland: Safety", "April 15, 2027", "~€8,500", "SETU International Scholarship / GOI-IES", "€2,000 / Full Ride", "Yes", "Not Started", "Affordable tuition, practical interaction design projects, low cost of living."],
  ["IE10", "Atlantic Tech Univ (ATU)", "Ireland", "MSc Design & Innovation", "Ireland: Safety", "April 15, 2027", "~€7,500", "ATU International Bursary / GOI-IES", "€1,500 / Full Ride", "Yes", "Not Started", "Affordable regional Irish option in Galway. Hands-on design and product innovation."],

  // Erasmus Mundus Track
  ["EM1", "EMINENT Consortium", "Multi-EU (Siegen/Orléans/NTNU/Vilnius)", "MSc Embedded Intelligence Nanosystems Eng", "Erasmus Mundus: Full Ride", "Jan 15, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "Full tuition + €1,400/mo stipend + travel allowance + insurance. Directly eligible with NIT Trichy EEE degree."],
  ["EM2", "SSIs Consortium", "Multi-EU (Aalto/USN/BME)", "MSc Smart Systems Integrated Solutions", "Erasmus Mundus: Full Ride", "Jan 10, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "Yes", "Not Started", "Smart embedded sensors, micro-packaging, and IoT hardware. Finishes with working prototype thesis."],
  ["EM3", "EDISS Consortium", "Multi-EU (Åbo Akademi/L'Aquila/Mälardalen/UIB)", "MSc Engineering of Data-Intensive Software Systems", "Erasmus Mundus: Full Ride", "Jan 15, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "Data-intensive intelligent IoT systems. Bridges embedded hardware with intelligent cloud data systems."],
  ["EM4", "STEPS Consortium", "Multi-EU (Oviedo/Kiel/Sapienza/Coimbra)", "MSc Sustainable Transportation & Electrical Power Systems", "Erasmus Mundus: Full Ride", "Dec 31, 2026", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "Earliest EM deadline (Dec 31). Power electronics track builds directly on DAB converter research with Vignesh."],
  ["EM5", "SUSTAGRI Consortium", "Multi-EU (Navarre/UTAD/Athens)", "MSc Cutting-Edge Technologies for Sustainable Agriculture", "Erasmus Mundus: Full Ride", "Jan 15, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "Yes", "Not Started", "Agritech hardware and precision agriculture reinforcement. Reuses Wageningen / off-grid solar irrigation narrative."],
  ["EM6", "DREAM Consortium", "Multi-EU (Centrale Nantes/UPC/HTW Berlin/Strathclyde)", "MSc Dynamics of Renewables-based Power Systems", "Erasmus Mundus: Full Ride", "Jan 31, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "Dynamics and control of renewable grid integration. Directly aligned with power converter research."],
  ["EM7", "EU-CORE Consortium", "Multi-EU (Lille/Oviedo/Genoa)", "MSc European Master on Control of Renewable Energy Systems", "Erasmus Mundus: Full Ride", "Jan 31, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "Control architectures for renewable systems with embedded entrepreneurship module."],
  ["EM8", "SemiChips Consortium", "Multi-EU (Grenoble/Dresden/Leuven)", "MSc European Master in Semiconductor Chips & Systems", "Erasmus Mundus: Full Ride", "Jan 31, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "Semiconductor chip design, embedded microelectronics, and power devices."],
  ["EM9", "EMIMEP Consortium", "Multi-EU (Limoges/Brescia/Aston/UPV)", "MSc European Master in Microwave Electronics & Photonics", "Erasmus Mundus: Full Ride", "March 13, 2027", "Covered", "Erasmus Mundus Scholarship", "Full Ride (~€28k-30k/yr)", "No", "Not Started", "High frequency electronics and sensing hardware. Final spring EM safety deadline."]
];

// Build Application Tracker sheet array
const appSheetData = [
  ["🎓 Aloka's Masters Application Tracker: Europe 2027 (Updated Comprehensive Deadlines & Requirements)"],
  appSummaryHeaders,
  ...appSummaryRows,
  appTrackerHeaders,
  ...appTrackerRows
];

wb.Sheets['Application Tracker'] = XLSX.utils.aoa_to_sheet(appSheetData);

// 2. Scholarships Sheet Data
const scholarshipHeaders = [
  "#", "Scholarship", "Country / Scope", "Amount / Benefit", "Covers", "Eligibility & Key Requirements", "Deadline", "Status"
];

const scholarshipRows = [
  [1, "Justus & Louise van Effen Excellence Scholarship", "Netherlands (TU Delft)", "Full Ride (~€30,000/yr)", "100% tuition waiver + €15,000/yr living allowance", "Admitted to TU Delft MSc; CGPA >= 80% or equivalent (NIT Trichy 78.1% + percentile cert eligible); 2 LORs; detailed motivation letter.", "Dec 1, 2026 (23:59 CET)", "Not Started"],
  [2, "Amandus H. Lundqvist Scholarship Program (ALSP)", "Netherlands (TU/e Eindhoven)", "€15,000/yr + Tuition", "Full tuition waiver + €15,000/yr living grant", "Admitted to TU/e MSc; excellent academic record; auto-considered upon submitting complete master's application by Feb 1.", "Feb 1, 2027 (23:59 CET)", "Not Started"],
  [3, "Swedish Institute Scholarship for Global Professionals (SISGP)", "Sweden (National)", "Full Ride", "100% tuition + 12,000 SEK/mo living + 15,000 SEK travel + insurance", "Bangladesh citizen; apply via UniversityAdmissions.se by Jan 15; proof of >= 3,000 hours work/internship/leadership experience; 2 SI template LORs.", "Feb 9 - Feb 26, 2027", "Not Started"],
  [4, "Politecnico di Milano Merit Scholarships (Platinum/Gold)", "Italy (Polimi)", "€10,000 / €5,000 + Tuition", "Tuition waiver + €10,000 or €5,000 cash grant", "Evaluated automatically on academic record, portfolio, and motivation letter. Best odds in 1st Call (Early Bird).", "Dec 1, 2026 (1st Call) / Jan 29, 2027 (2nd Call)", "Not Started"],
  [5, "Aalto University Excellence & Finland Scholarship", "Finland (Aalto)", "Full Tuition + €5,000", "100% tuition waiver for 2 yrs + €5k relocation allowance", "Applied automatically with studyinfo.fi application; academic merit, portfolio quality, and motivation letter.", "Jan 2, 2027 (15:00 UTC+2)", "Not Started"],
  [6, "Erasmus Mundus STEPS Scholarship", "Multi-EU (Consortium)", "Full Ride (~€30,000/yr)", "100% tuition + €1,400/mo stipend + travel + insurance", "B.Tech EEE degree; CV (Europass), 2 LORs, motivation letter. Power electronics and renewable integration focus.", "Dec 31, 2026", "Not Started"],
  [7, "Erasmus Mundus SSIs Scholarship", "Multi-EU (Aalto/USN/BME)", "Full Ride (~€30,000/yr)", "100% tuition + €1,400/mo stipend + travel + insurance", "B.Tech EEE / IoT background; motivation letter, 2 LORs, project portfolio. Focus on smart systems and microsystems.", "Jan 10, 2027", "Not Started"],
  [8, "Erasmus Mundus SUSTAGRI Scholarship", "Multi-EU (Navarre/UTAD/Athens)", "Full Ride (~€30,000/yr)", "100% tuition + €1,400/mo stipend + travel + insurance", "Agritech & precision farming. Reuses off-grid solar irrigation narrative. Motivation letter, 2 LORs, CV.", "Jan 15, 2027", "Not Started"],
  [9, "Erasmus Mundus EMINENT / DREAM / EU-CORE", "Multi-EU (Consortium)", "Full Ride (~€30,000/yr)", "100% tuition + €1,400/mo stipend + travel + insurance", "EEE / renewable control background; 2 academic reference letters, Europass CV, tailored motivation letter.", "Jan 15 - Jan 31, 2027", "Not Started"],
  [10, "Government of Ireland Int Education Scholarship (GOI-IES)", "Ireland (HEA National)", "Full Ride (1 Year)", "Full tuition fee waiver + €10,000 living stipend", "Non-EU students; requires conditional or unconditional offer from an Irish University (UCD, TU Dublin, TCD, etc.); separate portal application.", "Mid-March 2027 (~March 13, 2027)", "Not Started"],
  [11, "Wageningen Excellence Programme", "Netherlands (WUR)", "Full Tuition + Stipend", "Full tuition fee waiver + contribution towards living costs", "Excellent non-EEA students admitted to MSc Biosystems Engineering; ranked top 10% in class.", "Feb 1, 2027", "Not Started"],
  [12, "UCD Global Excellence Postgraduate Scholarship", "Ireland (UCD)", "100% or 50% Tuition", "Full or half tuition waiver", "Offer holder at UCD; separate scholarship application with short personal statements; merit based.", "March 31, 2027", "Not Started"],
  [13, "NL Scholarship (formerly Holland Scholarship)", "Netherlands (Nuffic)", "€5,000 one-time", "Direct tuition reduction grant", "Non-EEA student applying for full-time master's at participating Dutch research universities (Delft, TU/e).", "Dec 1, 2026 (Delft) / Feb 1, 2027 (TU/e)", "Not Started"],
  [14, "DAAD Postgraduate Study Scholarship", "Germany / Europe", "€934/mo + Insurance", "Monthly living stipend + travel subsidy + health insurance", "Bangladeshi graduates; academic excellence and well-formulated study plan.", "Oct - Nov 2026", "Not Started"],
  [15, "Trinity College Dublin Global Excellence Scholarship", "Ireland (TCD)", "€2,000 - €5,000", "Tuition fee reduction", "Evaluated automatically upon receipt of master's offer at TCD based on academic merit.", "March 31, 2027", "Not Started"]
];

const scholarshipSheetData = [
  ["💰 Comprehensive Master's Scholarship Tracker: Aloka 2027 Intake"],
  scholarshipHeaders,
  ...scholarshipRows
];

wb.Sheets['Scholarships'] = XLSX.utils.aoa_to_sheet(scholarshipSheetData);

// 3. Timeline & Milestones Sheet Data
const timelineHeaders = ["Phase", "Period", "Key Milestones & Hard Deadlines", "Status"];

const timelineRows = [
  [
    "Phase 1: Foundation & Test Booking",
    "Sep - Oct 2026",
    "• Oct 3, 2026: IELTS Academic test date (booked, weekday & weekend prep active)\n• Replace placeholder projects on portfolio site (anindita-sa.github.io) with real projects (Concrete Speaker, CHAARG, Deskimon, Polaris)\n• Dr. Vignesh Kumar DAB converter & power electronics research placement on weekdays (standard EMC for power converter topologies)\n• Complete Agri energy survey paper Phase 1 charts to unblock draft\n• Mid-Oct 2026: Sweden National Portal (UniversityAdmissions.se) opens for Autumn 2027 intake",
    "In Progress"
  ],
  [
    "Phase 2: Early Bird & Full Ride Submissions",
    "Nov - Dec 2026",
    "• Dec 1, 2026 (23:59 CET): TU Delft Justus & Louise van Effen Scholarship deadline (MSc IPD & MSc EE)\n• Dec 1, 2026: Politecnico di Milano 1st Call Early Bird deadline (Platinum & Gold merit consideration)\n• Dec 31, 2026: Erasmus Mundus STEPS application cutoff (power electronics track)\n• Finalize tailored Motivation Letters and secure 2 formal Academic Reference Letters on official NIT Trichy letterheads",
    "Not Started"
  ],
  [
    "Phase 3: Peak Master's Admissions & Major Deadlines",
    "Jan - Feb 2027",
    "• Jan 2, 2027 (15:00 UTC+2): Aalto University CoID application + Finland Scholarship deadline\n• Jan 10, 2027: Erasmus Mundus SSIs application cutoff (smart microsystems)\n• Jan 15, 2027: Sweden National Portal 4 Ranked University choices final submission cutoff\n• Jan 15, 2027: TU Delft general non-scholarship deadline & Erasmus Mundus SUSTAGRI / EMINENT cutoffs\n• Jan 29, 2027: Politecnico di Milano 2nd Call final deadline for design programs\n• Jan 31, 2027: Erasmus Mundus DREAM & EU-CORE cutoffs\n• Feb 1, 2027: TU/e Eindhoven ALSP Scholarship deadline (€15k + tuition waiver)\n• Feb 1, 2027: Wageningen Excellence Scholarship deadline & Sweden portal supporting documents deadline\n• Feb 9 - Feb 26, 2027: Swedish Institute SISGP Scholarship application portal window (3,000 hrs proof)",
    "Not Started"
  ],
  [
    "Phase 4: Safety Floor, Irish Portals & EM Spring Cutoffs",
    "Mar - Apr 2027",
    "• March 1, 2027: Danish Universities non-EU admission cutoff (Aalborg, Aarhus, Design School Kolding)\n• Mid-March 2027 (~March 13): Government of Ireland GOI-IES Scholarship portal cutoff (requires Irish offer)\n• March 13, 2027: Erasmus Mundus EMIMEP cutoff\n• March 25, 2027: Sweden National Admissions results announcement\n• March 31, 2027: UCD Global Excellence Scholarship deadline & Irish university rolling cutoffs\n• April 2027: Evaluate all admission offers and scholarship packages to finalize decision",
    "Not Started"
  ],
  [
    "Phase 5: Graduation, Visa & Relocation",
    "May - Sep 2027",
    "• May - June 2027: Student visa & residence permit application processing (MVV/VVR for NL, Residence Permit for Sweden/Finland/Italy/Ireland)\n• June 2027: Graduate B.Tech EEE from NIT Trichy with official degree certificate\n• July - August 2027: Housing confirmation, travel booking, and relocation preparation\n• September 2027: Master's program commencement in Europe 🎉",
    "Not Started"
  ]
];

const timelineSheetData = [
  ["📅 Aloka's Master's Roadmap: 2026 to 2027 Intake"],
  timelineHeaders,
  ...timelineRows
];

wb.Sheets['Timeline & Milestones'] = XLSX.utils.aoa_to_sheet(timelineSheetData);

// 4. Cold Mail Pipeline Sheet (Sanitized, no em dashes)
const coldMailHeaders = [
  "#", "Name", "Institute/Affiliation", "Group", "Domain", "Email", "Status", "Sent Date", "Follow-up Date", "Notes"
];

const coldMailRows = [
  [1, "Prof. Jan Carel Diehl", "TU Delft", "Group 1", "Design for Sustainability / Frugal Tech", "j.c.diehl@tudelft.nl", "Drafted", "", "", "IPD MSc thesis synergy, frugal off-grid hardware"],
  [2, "Prof. Arno Smets", "TU Delft", "Group 1", "PVMD / Solar & Storage Dynamics", "a.h.m.smets@tudelft.nl", "Sent", "2026-09-16", "2026-09-23", "Sent Sep 16, 2026. Follow-up window opens Sep 23 (PV & storage dynamics)"],
  [3, "Prof. Angele Reinders", "TU/e Eindhoven", "Group 1", "Industrial Design / Smart Energy Systems", "a.h.m.e.reinders@tue.nl", "Drafted", "", "", "User-centric energy hardware, prototyping"],
  [4, "Prof. Peter Groot Koerkamp", "Wageningen Univ.", "Group 1", "Farm Technology / Biosystems", "peter.grootkoerkamp@wur.nl", "Drafted", "", "", "Agricultural electrification, solar irrigation EMS"],
  [5, "Tilman", "TU Delft", "Group 1", "IPD Director", "", "Replied", "2026-08-15", "2026-09-28", "Responded previously with positive program guidance (follow-up Sep 28)"],
  [6, "Prof. Emanuela Colombo", "Politecnico di Milano", "Group 2", "Energy for Sustainable Development", "emanuela.colombo@polimi.it", "Drafted", "", "", "UNESCO Chair, off-grid microgrids, productive use in ag"],
  [7, "Prof. Francesco Fuso Nerini", "KTH Royal Institute", "Group 2", "Energy Systems & Climate Action", "francesco.fuso-nerini@energy.kth.se", "Drafted", "", "", "Rural electrification, decentralized mini-grids, SISGP target"],
  [8, "Dr. Richard Blanchard", "Loughborough Univ.", "Group 2", "CREST / Rural Energy & Agritech", "r.e.blanchard@lboro.ac.uk", "Drafted", "", "", "Solar water pumping, mini-grids, agritech hardware"],
  [9, "Dr. Philip Sandwell", "Imperial College London", "Group 2", "Energy Futures Lab / Mini-grids", "philip.sandwell@imperial.ac.uk", "Drafted", "", "", "Battery degradation in off-grid solar, open-source microgrids"]
];

const coldMailSheetData = [
  ["📧 Cold Mail Pipeline: Winter 2026 / Masters Guidance"],
  coldMailHeaders,
  ...coldMailRows
];

wb.Sheets['Cold Mail Pipeline'] = XLSX.utils.aoa_to_sheet(coldMailSheetData);

// 5. Portfolio Checklist Sheet (Sanitized, no em dashes)
const portfolioHeaders = ["Project", "Type", "IPD Fit", "Completion %", "Documented?", "Notes"];
const portfolioRows = [
  ["CHAARG (LiPo mod board)", "Hardware / PCB", "Technical depth ⭐⭐⭐", "5%", "No", "Strongest technical project. KiCad schematic next step. Document every design decision."],
  ["Deskimon (desk companion)", "Product Design", "Design thinking ⭐⭐⭐⭐", "5%", "No", "Best IPD-fit project. Needs form factor design, user story, pomodoro integration."],
  ["ESP32 Smart Keychain", "Embedded / IoT", "Technical ⭐⭐", "5%", "No", "Quickest win. Complete as 4th project. Good for showing embedded breadth."],
  ["Concrete Speaker", "Craft / Physical", "Process & craft ⭐⭐⭐", "80%", "No", "Physical build complete. Case study draft in progress."],
  ["DAB Converter & Power Electronics EMC (Research)", "Research / EEE", "Technical depth ⭐⭐⭐⭐", "40%", "Partial", "Current semester internship work with Dr. Vignesh Kumar. Feeds STEPS and EE motivation letters directly."],
  ["Solar-Aware Deferrable Load Scheduler", "Hardware / Embedded", "Technical depth ⭐⭐⭐⭐", "Proposal stage", "No", "ESP32 + INA226 + buck converter, rolling linear regression scheduler. Proposal drafted."],
  ["Polaris Dashboard", "Software / Product", "Design thinking ⭐⭐⭐", "Deployed", "Partial", "React + Vite + Supabase + D3 self-built productivity dashboard. Legitimate portfolio candidate."]
];

const portfolioSheetData = [
  ["🛠️ Portfolio Project Checklist"],
  portfolioHeaders,
  ...portfolioRows
];

wb.Sheets['Portfolio Checklist'] = XLSX.utils.aoa_to_sheet(portfolioSheetData);

// Write back updated workbook
XLSX.writeFile(wb, filePath);
console.log('Successfully updated Aloka_Masters_Tracker.xlsx across all sheets with zero em-dashes.');
