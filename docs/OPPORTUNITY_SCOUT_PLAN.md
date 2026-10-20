# Opportunity Scout Overhaul & Auto-Run Remediation Plan

## Context & Objectives
The Opportunity Scout system in Polaris has two major usability and reliability gaps:
1. **Information Scarcity in UI**: Opportunity cards only display a vague, 3 to 4 word description (e.g., "Offered: Travel and project funding"), hiding the crucial program summary, scope, and strategic fit details needed to make an informed decision to apply or dismiss.
2. **Silent Failure of Auto Scout Runs**: Over the past 3 weeks, no new opportunities have been scouted because the Edge Function falls into a silent fallback loop (`appendPreviousOpps`), returning HTTP 200 while recycling old records without inserting new ones, compounded by invalid Gemini model fallbacks and overly restrictive feed blocklists.
3. **Database Quality Drift**: The database contains several noisy aggregators and listicles (e.g., US-only Instrumentl lists, Substack roundups) alongside high-value opportunities that lack complete details, while key opportunities documented in Side Quests, Reminders, and Master Strategy remain unseeded.

---

## Technical Approach & Architecture

### 1. UI Enhancements

#### A. HardwareScoutPanel (`src/components/panels/HardwareScoutPanel.jsx`) - Orbit Tab (Scout Nav)
- **Expandable Structured Summary**:
  - By default, cards show an inviting 2-sentence summary teaser with an expandable "View Strategic Details" toggle.
  - When expanded (or clicked), it reveals three clearly delineated sections:
    1. **Program Overview**: What the opportunity is, host organization/institution, and scope.
    2. **Strategic Fit & Eligibility**: Exact fit for Anindita (Bangladeshi national, student visa in India, 7th semester EEE, power electronics, product design, conservation tech) and any eligibility flags.
    3. **What is Offered**: Explicit funding amounts, stipends, equipment coverage, travel sponsorship, or mentorship.
    4. **Application Draft**: Monospace drafting block if draft text exists.
  - **Comprehensive Edit Mode**:
    - Allow direct inline editing of `title`, `url`, `deadline`, `effort`, `profile_match`, `acceptance_chance`, `what_offered`, `project_fit`, and `application_draft`.
  - **Design Discipline**:
    - Dark glassmorphic theme with amber accents.
    - Zero CSS gradients (solid colors and borders only).
    - Zero em dashes and en dashes (use commas, colons, or ' - ').

#### B. DayBriefView (`src/components/views/DayBriefView.jsx`) - Brief Sub-Tab
- **Compact Card View**:
  - Retain quick-scanning density with title, external link, source, match badge, effort badge, and deadline.
  - Render a concise, 2-sentence high-information summary combining program scope, eligibility, and funding.
  - Keep seamless actions: Star toggle, Flag to Apply, and Dismiss modal.

---

### 2. Auto Scout Pipeline & Edge Function Hardening

#### A. Supabase Edge Function (`supabase/functions/scout-opportunities/index.ts`)
- **Eliminate Silent Stagnation Loop**:
  - Replace `appendPreviousOpps` fallback with explicit, logged diagnostics.
  - If Firecrawl fails or yields no valid direct links, utilize robust, multi-source RSS ingestion with active feeds that publish real calls (Opportunity Desk open calls, FundsForNGOs grants, Conservation Careers, Terra.do).
  - Unblock viable opportunity feeds from `URL_BLOCKLIST_PATTERNS`.
  - Fix prompt in `supabase/functions/_shared/personal_prompts.ts` to instruct the LLM to output a rich, structured 2-3 sentence `project_fit` summary and explicit `what_offered` terms.

#### B. LLM Fallback Model Rectification (`supabase/functions/_shared/llm_utils.ts` & `scripts/lib/llm_utils.js`)
- Replace non-existent `gemini-3.7-flash` and `gemini-3.5-flash` model IDs with canonical Google AI Studio model IDs:
  - Primary: `gemini-2.5-flash`
  - Fallback: `gemini-1.5-flash`
- This ensures that if Groq rate limits or fails, the Gemini fallback succeeds rather than throwing a silent 404 error.

#### C. Scheduled Automation
- Add a dedicated GitHub Actions workflow (`.github/workflows/scout_opportunities.yml`) scheduled to run bi-weekly (e.g., Monday and Thursday at 06:00 UTC) to execute `scripts/scout_opportunities.js` or trigger cloud scouts automatically with proper alerts.

---

### 3. Database Curation & Opportunity Enrichment

#### A. Triage and Clean Existing Database Entries (`hardware_opportunities`)
- **Dismiss / Reject Ineligible Aggregators**:
  - `196+ Active Marine Grants in The U.S. - Instrumentl` -> Dismiss (US non-profit 501(c)(3) required, aggregator listicle).
  - `Travel Grants and Fellowships for Educators - Edutopia` -> Dismiss (K-12 educators only).
  - Generic Substack newsletters & roundups (SevenSeas, ImpactFunding, PAEPARD Africa-only) -> Dismiss.
- **Enrich High-Fit Active Entries**:
  - `Mohamed bin Zayed Species Conservation Fund`: Add rich summary, note that Sept 30 round has passed, next round opens Feb 2027 (up to $25k in-situ endangered species conservation).
  - `GEF Small Grants Programme`: Enrich summary explaining up to $50k community funding in Bangladesh via local NGO/CBO partnership.
  - `Wild Animal Initiative Fellowships`: Enrich with $200k validation grant details (Oct 31, 2026 deadline).
  - `Wild Animal Initiative Seed Grants`: Enrich with $30k pilot hardware/monitoring scope.
  - `beVisioneers: The Mercedes-Benz Fellowship Program`: Enrich with 12-month environmental venture grant details.
  - `Melton Foundation Global Solvers Accelerator 2027`: Enrich with Nov 15, 2026 deadline and stipend details.

#### B. Seed High-Value Opportunities from Side Quests & Master Strategy
1. **UN Online Volunteering Program 2026**:
   - Remote tech and sustainability positions with UN agencies. 100% free, Bangladeshi nationals fully eligible, earns an official UN certificate while studying at NIT Trichy.
2. **Erasmus Mundus STEPS (Sustainable Transportation and Electrical Power Systems)**:
   - Full-ride European master's scholarship (€1,400/month + full tuition waiver). Application window: Oct 1 to Dec 31, 2026. Direct alignment with DAB converter and power electronics research with Dr. Vignesh.
3. **Knight Center for Journalism in the Americas**:
   - Free, self-paced, university-certified training in data journalism, open-source investigation, and narrative storytelling (University of Texas at Austin).
4. **TU Delft Justus & Louise van Effen Scholarship**:
   - Full ride (€30,000/year, tuition waiver + €15,000 living allowance). Cutoff: Dec 1, 2026. Top priority for MSc Integrated Product Design & MSc EE.
5. **Politecnico di Milano Merit Scholarship**:
   - Early bird window closing Dec 1, 2026. Base tuition ~€4,000/yr with Platinum (€10,000) and Gold (€5,000) merit awards.

---

## Verification & Quality Gates
1. Run `npm test` across all 27 test suites.
2. Run `npm run build` to verify clean Vite production bundle and service worker precaching.
3. Run ImplementationAuditor to verify discrete requirements.
4. Run SecurityAuditor before any Git operations.
5. Strict scan: Zero em dashes, zero en dashes, and zero gradients.
6. Bump version in `package.json` to `v1.2.48`.
