# Implementation Plan: Hardening Polaris Opportunity Scout Pipeline

## Objective
Prevent credit runaway and unintended repeated invocations of the Opportunity Scout pipeline by:
1. Stopping expensive full-page scrapes in Firecrawl within `scout-opportunities`.
2. Enforcing a strict daily execution lock both in the Supabase edge function and locally in `scripts/run_cloud_scouts.js`.
3. Updating Windows Task Scheduler setup to trigger exclusively on user logon (removing screen unlock triggers) and ensuring wrapper safety.
4. Auditing frontend event listeners and component mount behavior to ensure zero automatic remote scout invocations.

## Proposed Changes

### 1. Firecrawl Scraping Optimization & 402 Fallback (`supabase/functions/scout-opportunities/index.ts`)
- In the Firecrawl `/v1/search` POST body:
  - Remove `scrapeOptions: { formats: ["markdown"] }`.
  - Maintain `query`, `limit: 8`, `tbs: 'qdr:m'`.
- Status & error handling:
  - If `firecrawlRes.status === 402` or Firecrawl response contains payment/credit errors:
    - Log a warning: `console.warn("Firecrawl credit exhaustion / payment required (status 402). Falling back directly to RSS feeds.")`
    - Bypass any further Firecrawl processing or retries and proceed immediately to RSS feeds.
  - In snippet minification (`minifiedPool`), adapt source text resolution to check `r.description || r.snippet || r.content || r.markdown || ''`.

### 2. Daily Idempotency Lock (`supabase/functions/scout-opportunities/index.ts` & `scripts/run_cloud_scouts.js`)
- In `supabase/functions/scout-opportunities/index.ts`:
  - Read JSON payload from `req`: extract `force`, `admin_override` / `force_admin`.
  - Check whether a scout run or brief for today (`today = new Date().toLocaleDateString('en-CA')`) already exists:
    - Query `morning_briefs` for `user_id = user.id` and `date = today` where `items` contains items of `type === 'opportunity'`.
    - Query `hardware_opportunities` for `user_id = user.id` and `created_at >= today + 'T00:00:00.000Z'`.
  - If today's run already exists and `!adminOverride`:
    - Return status 200 with `{ success: true, message: 'Scout already ran for today. Skipping duplicate execution.', skipped: true }`.
    - Note: `{ force: true }` without `admin_override` will NOT bypass this lock.
- In `scripts/run_cloud_scouts.js`:
  - Path: `scripts/.last_scout_date`.
  - Check file on startup. If date equals today's date and `--force-admin` is not passed, log notice and exit cleanly (`process.exit(0)`).
  - Update payload sent to `scout-opportunities` to `{ force: false }`.
  - Upon successful scout run, write today's date into `scripts/.last_scout_date`.

### 3. Task Scheduler & Wrapper Fixes (`scripts/setup_triage_task.ps1` & `scripts/run_triage_wrapper.ps1`)
- In `scripts/setup_triage_task.ps1`:
  - Remove `<SessionStateChangeTrigger>` entirely. Keep only `<LogonTrigger>`.
  - Update user notification message to reflect logon-only scheduling.
- In `scripts/run_triage_wrapper.ps1`:
  - Ensure `$LastRun = (Get-Content $DateFile | Out-String).Trim()` handles whitespace robustly.
  - Confirm `.last_run_date` check stops execution before any scripts are invoked.

### 4. Audit Event Listeners & Auto-Invokes
- Confirm `src/lib/syncManager.js` does not trigger edge functions.
- Confirm `polaris-tasks-changed` and `polaris-sync-complete` have no listeners that invoke remote scout functions.
- Confirm `HardwareScoutPanel.jsx` only triggers `scout-opportunities` on manual button click (`RUN SCOUT NOW`) and never on component mount.

### 5. Verification & Version Bump
- App version bump in `package.json` to `1.2.59`.
- Run `npm test` and `npm run build`.
- Update `docs/CHANGELOG.md`.
- Dispatch `ImplementationAuditor` and `SecurityAuditor`.
