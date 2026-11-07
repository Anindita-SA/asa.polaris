# Implementation Plan: Scout Category Tracker (3-Day Rolling Window)

## 1. Objective
Enable Polaris to track and persist category fetch counts in Supabase, dynamically rotate Firecrawl search queries to target zero-count and lowest-count categories over a 3-day rolling window, and display live category statuses inside the Settings popup.

## 2. Database Design & Migration (`scout_category_tracker`)
Create table `scout_category_tracker`:
- `id`: UUID Primary Key, default `gen_random_uuid()`
- `user_id`: UUID Not Null, references `auth.users(id)` on delete cascade
- `category`: TEXT Not Null (one of the 6 canonical pillars)
- `fetch_count`: INT Not Null, default 0
- `window_start_date`: DATE Not Null, default CURRENT_DATE
- `last_fetched_at`: TIMESTAMPTZ Nullable
- `created_at`: TIMESTAMPTZ Not Null, default NOW()
- `updated_at`: TIMESTAMPTZ Not Null, default NOW()
- Unique constraint on `(user_id, category)`.

### RLS Policies & Grants (Per Supabase Breaking Change Protocol)
- RLS enabled.
- Policy for authenticated users: `auth.uid() = user_id`.
- Explicit grants to `authenticated` and `service_role`:
  `GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_category_tracker TO authenticated, service_role;`

## 3. 3-Day Rolling Window Logic (`src/lib/scoutCategoryTracker.js`)
1. Canonical Categories:
   - `Hardware, sensors & human-machine interface`
   - `Food systems & agritech`
   - `Nutrition science & wellbeing`
   - `Tech & field implementation`
   - `Marine & ocean conservation`
   - `Community & grassroots ecology`
2. Rolling Window:
   - If `(today - window_start_date) >= 3 days`:
     Reset `fetch_count = 0` and set `window_start_date = today`.
3. Target Identification:
   - Determine minimum `fetch_count` among all 6 categories.
   - Categories with `fetch_count === minCount` are marked as `NEXT TARGET`.
4. Firecrawl Query Synthesis:
   - Generate query keywords targeting the lowest-count categories.
   - For Opportunity Scout:
     `("fully funded" OR stipend OR paid) (fellowship OR grant OR "seed funding" OR "open call" OR internship) (<target_keywords>) 2026 2027 -newsletter -roundup`
   - For Morning Brief:
     `(<target_keywords>) (breakthrough OR discovery OR research OR innovation OR deployment) 2026 -newsletter -roundup`

## 4. Edge Function Integration
- In `supabase/functions/scout-opportunities/index.ts`:
  - Read categories and counts from `scout_category_tracker`.
  - Apply 3-day window reset if needed.
  - Dynamically construct the Firecrawl search query using lowest-count categories.
  - After inserting opportunities, increment `fetch_count` for matching categories and update `last_fetched_at`.
- In `supabase/functions/generate-morning-brief/index.ts`:
  - Read categories from `scout_category_tracker`.
  - Prioritize candidates matching lowest-count categories.
  - Update `fetch_count` for the selected categories in `scout_category_tracker`.

## 5. Settings Popup UI (`src/components/panels/SettingsPanel.jsx`)
- In `SettingsPanel.jsx`, add a dedicated section "Signals & Scout" (or in the All Settings view):
  - Displays each of the 6 categories.
  - Displays current 3-day fetch count (e.g. `0 / 3d`, `1 / 3d`).
  - Displays badges: `NEXT FIRECRAWL TARGET` (amber) on lowest-count categories; `FETCHED TODAY` (green) if fetched today.
  - Displays cycle status: "Window Day X of 3".
  - Provides a "Reset 3-Day Window" button allowing manual reset of counts.

## 6. Verification & Quality Gates
- Document table in `docs/DATABASE_SCHEMA.md`.
- Unit tests in `src/lib/scoutCategoryTracker.test.js`.
- Run `npm test` and `npm run build`.
- Show exact prompt/queries to user.
- Scan for zero em dashes and zero CSS gradients.
