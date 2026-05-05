**POLARIS**

*Personal Life Dashboard — Project Overview & Design Document*

**Anindita Sarker Aloka**

anindita-sa.github.io/asa.polaris

Version 1.0  |  April 2026

| 1\. Project Overview |
| :---- |

## **What is Polaris?**

Polaris is a private, gamified life dashboard. It replaces scattered tools (Notion, spreadsheets, notes apps) with a single astronomical-themed command centre that maps career, academic, and personal goals as an interactive constellation graph. The name is intentional: Polaris is the North Star, the fixed point navigators use to orient themselves. The dashboard exists so that no matter how many directions life pulls, there is always a clear north.

## **The Problem It Solves**

| Without Polaris | With Polaris |
| :---- | :---- |
| Goals scattered across Notion, Notes, spreadsheets | Single constellation graph connecting everything |
| No visibility into what to focus on right now | Hard 3-item focus board with backburner system |
| 9 application deadlines tracked in a spreadsheet | Visual timeline with days-remaining and XP rewards |
| Fitness data completely separate | Bridge reads from existing Supabase aloka-fit tables |
| No record of daily wins | Journal with photo, highlight text, 90-day habit heatmap |
| No motivation system | XP \+ 8 levels \+ badges gamification layer |

## **Clarity Anchor**

| Engineer who thinks like a designer. *MSc Europe (TU Delft IPD / TU/e) \-\> FI through entrepreneurship within 7-10 years.* |
| :---- |

| 2\. Technology Stack |
| :---- |

| Layer | Technology | Why |
| :---- | :---- | :---- |
| **Frontend** | React 18 \+ Vite | Fast HMR, modern JSX, zero-config build |
| **Styling** | Tailwind CSS 3 | Utility-first, dark theme, custom design tokens |
| **Graph** | D3.js v7 | Full SVG control for constellation rendering |
| **Auth** | Supabase Auth (Google OAuth) | Session management, Row Level Security |
| **Database** | Supabase Postgres | 9 tables, RLS, private per-user data |
| **Storage** | Supabase Storage | Journal photos in private bucket |
| **Hosting** | GitHub Pages | Static deploy from asa.polaris repo |
| **CI/CD** | GitHub Actions | Auto-deploy on push to main branch |
| **Dates** | date-fns | Heatmap generation, deadline calculations |
| **Fonts** | Cinzel \+ Raleway \+ JetBrains Mono | Display / body / monospace |

| 3\. File Structure |
| :---- |

All files are in the asa.polaris GitHub repository. The src/ directory is the React application. Everything outside src/ is build config.

| File / Folder | Purpose |
| :---- | :---- |
| index.html | Vite entry point. Minimal by design — Vite injects the app via \<script type=module\>. No content lives here. |
| vite.config.js | Sets base: /asa.polaris/ for correct GitHub Pages asset paths. |
| tailwind.config.js | Custom color palette (void, nebula, pulsar, gold, aurora), Google Fonts, keyframe animations. |
| .env.example | Template for the two required env vars: VITE\_SUPABASE\_URL and VITE\_SUPABASE\_ANON\_KEY. |
| .github/workflows/deploy.yml | GitHub Actions: installs deps, builds with secrets injected, deploys dist/ to Pages. |
| src/main.jsx | React entry: mounts \<App /\> into \#root. |
| src/App.jsx | Auth wrapper: shows Login or Dashboard based on Supabase session. |
| src/styles/global.css | Tailwind directives \+ all custom CSS: starfield dots, nebula blobs, glass morphism, XP shimmer, modal/panel animations. |
| src/lib/supabase.js | Supabase client init \+ complete SQL schema as comments (paste into SQL Editor to run). |
| src/data/defaults.js | Seed data: 9 milestones, 4 main nodes, 9 subnodes, 8 XP level definitions. |
| src/hooks/useAuth.jsx | Auth context: session state, profile fetch, first-login seeding, XP increment (uses RPC), Google sign-in. |
| src/pages/Login.jsx | Full-screen login page: animated starfield, POLARIS wordmark, Google OAuth button. |
| src/pages/Dashboard.jsx | Main app shell: mounts HUD \+ Starfield, routes between 6 views, passes node selection to NodePanel. |
| src/components/layout/Starfield.jsx | 180 CSS-animated star dots \+ 5 nebula glow blobs. No canvas — pure DOM \+ CSS. |
| src/components/layout/HUD.jsx | Fixed top bar: Clarity Anchor (inline edit), Chapter (inline edit), nav tabs, XP bar \+ level, sign out. |
| src/components/graph/ConstellationGraph.jsx | D3 SVG constellation with ResizeObserver for correct sizing. Glow filter, dashed links, hover scale, click callback. |
| src/components/panels/NodePanel.jsx | Slide-in right panel on node click. Node goals with progress bars, add goal, linked milestones with done button. |
| src/components/panels/FocusBoard.jsx | 3 hard-locked focus slots \+ backburner list. Modal for adding items. Promote backburner \-\> focus. |
| src/components/panels/Timeline.jsx | Vertical milestone timeline. Auto-detects overdue. Inline note field, status dropdown, days-remaining. |
| src/components/panels/FitnessBridge.jsx | Read-only mirror of aloka-fit data: workout\_logs, meal\_logs, weight\_logs. Stats row \+ recent lists. |
| src/components/widgets/GoalsPanel.jsx | 5 scope tabs (weekly to 5yr). Progress bars, \+/- controls, XP on completion, configurable XP reward. |
| src/components/journal/Journal.jsx | Daily highlight text \+ photo upload. Habit checklist with XP. 90-day contribution heatmap \+ streak counter. |

| 4\. Database Schema |
| :---- |

All 9 tables live in your existing Supabase project alongside the aloka-fit tables. Row Level Security (RLS) is enabled on every table — data is completely private even if the anon key is exposed. The SQL to create all tables is in src/lib/supabase.js as comments; paste the block into Supabase SQL Editor and run it.

| Table | Key Columns | Purpose |
| :---- | :---- | :---- |
| **profiles** | id, clarity\_anchor, current\_chapter, xp, level | One row per user. HUD state: anchor, chapter, XP. Created on first login. |
| **nodes** | id, parent\_id, type, title, x\_pos, y\_pos, status | Constellation graph nodes. parent\_id self-references for subnodes. x\_pos/y\_pos are 0-1 ratios. |
| **goals** | id, node\_id, scope, title, target, current, unit, xp\_reward | Goals attached to nodes. scope: weekly/monthly/quarterly/yearly/5yr. |
| **focus\_items** | id, title, category, why\_now, status | Max 3 active (status=active). Completed/backburned kept with updated status. |
| **backburner** | id, title, why\_deferred, context\_snapshot, revisit\_after | Deferred items with full context. Can be promoted back to focus. |
| **milestones** | id, title, deadline, status, note, xp\_reward | 9 pre-seeded milestones. Overdue computed client-side from deadline date. |
| **highlights** | id, date, text, photo\_url | One row per day (unique: user\_id \+ date). photo\_url \-\> Supabase Storage. |
| **habits** | id, title, frequency, xp\_reward | User-defined habits. xp\_reward defaults to 10\. |
| **habit\_logs** | habit\_id, date, completed | One per habit per day (unique constraint). Powers heatmap \+ streak. |

## **Required Supabase RPC (add to SQL Editor)**

| create or replace function increment\_xp(user\_id uuid, amount int) returns void language sql security definer as $$   update profiles set xp \= xp \+ amount where id \= user\_id; $$; |
| :---- |

This function prevents XP race conditions by doing the increment atomically in Postgres instead of reading/writing from the client.

| 5\. Design System |
| :---- |

## **Theme: Astronomical / Deep Space**

The visual language is built around deep space: a near-black void background, 180 CSS-animated star dots, 5 nebula glow blobs with slow drift animations, and D3 constellation lines connecting the graph nodes. All UI surfaces use glass morphism (backdrop-blur \+ semi-transparent dark fill \+ 1px blue border). The effect is that information feels like it exists inside the cosmos, not on top of it.

## **Color Palette**

| Token | Hex | Usage |
| :---- | :---- | :---- |
| **void** | \#030712 | Page background — near-black |
| **nebula** | \#0A0F1E | Glass panel background |
| **stardust** | \#111827 | Input fields, subtle fills |
| **cosmic** | \#1E2D4A | Active nav items, section headers, card borders |
| **pulsar** | \#3B82F6 | Primary blue — career nodes, focus, primary actions |
| **nova** | \#60A5FA | Lighter blue — hover states, XP bar gradient end |
| **starlight** | \#E2E8F0 | Primary text |
| **dim** | \#64748B | Secondary text, placeholders, icon default state |
| **gold** | \#F59E0B | XP values, root node, POLARIS wordmark, level names |
| **aurora** | \#8B5CF6 | Academic nodes, chapter subtitle, quarterly scope |
| **emerald** | \#10B981 | Self nodes, habit done, milestone complete, done states |
| **danger** | \#EF4444 | Overdue milestones, delete/destructive actions |

## **Typography**

| Typeface | Tailwind class | Used for |
| :---- | :---- | :---- |
| **Cinzel (serif)** | font-display | POLARIS wordmark, section headings, level names, nav tabs, button labels, node labels on graph |
| **Raleway (sans-serif)** | font-body | Body text, descriptions, form inputs, placeholder text, journal entries, italic notes |
| **JetBrains Mono** | font-mono | XP numbers, dates, deadlines, hex values, category tags, code snippets |

## **Key Animations**

* Starfield: 180 individual stars with randomised twinkle duration (2-6s) and opacity. Pure CSS keyframes.

* Nebula blobs: 5 large blurred circles drifting slowly with alternate animation. Opacity 0.06.

* XP bar shimmer: a white gradient sweeps left to right every 2.5s on the filled portion.

* Node hover: D3 transition scales circles 1.2x over 200ms.

* Side panel slide: CSS animation translateX(100%) \-\> 0 over 0.3s with cubic-bezier easing.

* Modal scale-in: scale(0.95) \+ translateY(10px) \-\> scale(1) \+ 0 over 0.25s.

| 6\. Views & Functionality |
| :---- |

## **HUD (Always Visible)**

Fixed top bar (z-50) that persists across all views. Four zones:

* Logo: gold star \+ POLARIS in Cinzel with wide letter-spacing.

* Clarity Anchor: your core narrative text, click to edit inline, Enter saves to Supabase. Below it: current chapter name (also inline-editable). Both persist across sessions.

* Navigation: 6 tabs — Constellation, Focus, Goals, Timeline, Journal, Fitness. Active tab gets cosmic background \+ pulsar border.

* XP system: level name (Cinzel gold) \+ XP / next-level counter (mono) \+ progress bar with shimmer \+ Lv.N badge. Updates live when XP is earned anywhere in the app.

## **1\. Constellation Graph**

The landing view. A full-screen D3 SVG renders your life as a navigable star map.

* Root node (gold, centre): POLARIS

* 3 main nodes (larger circles): Career (blue), Academics (purple), Self (green)

* 9 subnodes: Portfolio, MSc Applications, CHAARG, DAB Converter, Survey Paper, Coursework, Fitness, Creative, Financial

* Dashed lines connect nodes to parents, coloured by node type with 25% opacity

* SVG glow filter applied to all node circles for the luminous star effect

* Hover scales the node 1.2x via D3 transition (200ms)

* Click opens the Node Side Panel from the right

* ResizeObserver recalculates positions on window resize

## **2\. Node Side Panel**

Slides in from the right when any constellation node is clicked. Contents:

* Node type badge (career/academic/self) \+ title \+ description

* Goals section: all goals for this node with animated progress bars, \+/- increment buttons, XP badge on completion

* Add goal inline: title, scope dropdown (weekly to 5yr), numeric target, unit label, custom XP reward

* Linked milestones: auto-filtered by node type. Career shows portfolio/CHAARG/application milestones. Academic shows DAB/IELTS. Mark done from panel, awards XP.

## **3\. Focus Board**

Enforces the Make Time 'highlight' methodology — maximum 3 things active at once.

* 3 hard-locked slots. The 4th add button is disabled with label 'FOCUS FULL (max 3)'.

* Each item: title, category tag (academic/portfolio/application/health/creative/research), 'why now' note.

* Complete: removes from active, awards 75 XP.

* Send to backburner: moves item with context preserved into the backburner list.

* Backburner: title, why deferred, context snapshot (what you know so far), optional revisit-after date.

* Promote from backburner back to focus — blocked if all 3 slots full.

## **4\. Goals Panel**

Five scope tabs: weekly, monthly, quarterly, yearly, 5yr. Each shows goals filtered by that scope.

* Per-goal progress bar: green (weekly), blue (monthly), purple (quarterly), gold (yearly), nova (5yr).

* \+1 / \-1 buttons for numeric progress. Checkmark appears when current \= target \- 1\.

* XP awarded on completion, shown inline as '+N XP'.

* Summary row above goals: X/Y complete, total XP earned from this scope.

* Add goal modal: title, target number, unit label, custom XP reward (defaults to 50).

## **5\. Milestone Timeline**

Vertical timeline of your 9 application milestones, pre-seeded automatically on first login.

* 'Next milestone' banner at top shows the nearest upcoming deadline with days remaining.

* Each milestone: title, date, days until/since (red if overdue, gold if \< 60 days).

* Overdue status computed client-side — no cron job needed.

* Status dropdown appears on hover: Upcoming / In Progress / Done.

* Inline note field saves on blur. Marking Done awards XP.

## **6\. Journal**

Three sections on one scrollable page:

* Daily Highlight: one text field \+ optional photo per day. Unique DB constraint prevents duplicates. Photo stored in Supabase Storage private bucket.

* Habits: add/delete habits. Check off per day — each check awards the habit's XP reward. Stored in habit\_logs.

* 90-day heatmap: GitHub contribution-style grid. Columns \= weeks, cells \= days. Emerald fill \= any habit logged. Today gets a pulsar blue border. Streak count shown above.

## **7\. Fitness Bridge**

Read-only panel. Reads from the same Supabase project as aloka-fit. No new data entry here.

* Stats row: workout count, meal count, latest weight with delta vs previous entry.

* Recent workouts: last 14 days, up to 10 entries (workout\_type, notes, date).

* Recent meals: last 14 days, up to 10 entries (meal\_name, calories, date).

* Weight log: last 10 weigh-ins in reverse chronological order.

* Graceful error state if tables are missing or unreachable.

| 7\. Gamification System |
| :---- |

## **XP Sources**

| Action | XP | Notes |
| :---- | :---- | :---- |
| Log daily highlight | **\+20** | Once per day maximum |
| Complete a habit | **\+10 (default)** | Configurable per habit in Journal view |
| Complete a focus item | **\+75** | On status change to done |
| Complete a goal | **\+50 (default)** | Configurable per goal when created |
| Complete milestone: MOI / Applications open | **\+75** | \- |
| Complete milestone: DAB / CHAARG / Portfolio / IELTS | **\+150-200** | \- |
| Complete milestone: Submit all applications | **\+300** | Largest single XP event |

## **Level Progression**

| Lv | Name | Min XP | Milestone context |
| :---- | :---- | :---- | :---- |
| **1** | **Stargazer** | 0 | Starting level |
| **2** | **Apprentice Inventor** | 200 | \~10 habits \+ 1 goal done |
| **3** | **Circuit Weaver** | 500 | First few milestones complete |
| **4** | **Signal Architect** | 1,000 | \~1 month active use |
| **5** | **Renaissance Engineer** | 2,000 | Most milestones complete |
| **6** | **Polaris Navigator** | 3,500 | Applications submitted |
| **7** | **Constellation Maker** | 5,500 | Offer received / MSc started |
| **8** | **Da Vinci Inheritor** | 8,000 | Mastery — long-term use |

| 8\. Deployment & Setup Checklist |
| :---- |

| \# | Step | Detail |
| :---- | :---- | :---- |
| **1** | **Run SQL schema** | Open src/lib/supabase.js, copy the full commented SQL block, paste into Supabase SQL Editor, run. |
| **2** | **Add increment\_xp RPC** | Run the function SQL from Section 4 in the SQL editor. Required for XP to work without race conditions. |
| **3** | **Enable Google OAuth** | Supabase \> Authentication \> Providers \> Google \> enable. Paste Client ID \+ Secret from Google Cloud Console. |
| **4** | **Set redirect URIs** | In Google Cloud Console add: https://\[ref\].supabase.co/auth/v1/callback and https://anindita-sa.github.io/asa.polaris/ |
| **5** | **Add GitHub Secrets** | Repo \> Settings \> Secrets \> Actions \> add VITE\_SUPABASE\_URL and VITE\_SUPABASE\_ANON\_KEY. |
| **6** | **Enable GitHub Pages** | Repo \> Settings \> Pages \> Source: GitHub Actions. |
| **7** | **Push to main** | GitHub Actions deploys automatically. First build \~2 mins. Live at anindita-sa.github.io/asa.polaris/ |
| **8** | **First login** | Sign in with Google. Profile \+ all default nodes \+ 9 milestones seeded automatically on first login. |
| **9** | **Verify fitness bridge** | Check Fitness view. If column names differ from aloka-fit, update field references in FitnessBridge.jsx. |

## **Local Development**

| cp .env.example .env              \# copy the template \# fill in VITE\_SUPABASE\_URL and VITE\_SUPABASE\_ANON\_KEY npm install npm run dev                        \# opens at localhost:5173/asa.polaris/ |
| :---- |

| 9\. Known Limitations & Future Work |
| :---- |

## **Current Limitations**

* Mobile: HUD nav tabs overflow on narrow screens. A hamburger menu is planned for a future version.

* Node positions are fixed ratios — no drag-to-reposition on graph. Can be added with D3 drag \+ Supabase update.

* Fitness bridge column names are hardcoded to aloka-fit schema. If columns differ, FitnessBridge.jsx needs a manual update.

* No offline support — requires Supabase connection for all reads and writes.

* Journal photos are stored in Supabase Storage but accessed via public URL. For stricter privacy, switch to signed URLs with expiry.

## **Potential Future Features**

* Drag-to-reposition nodes on constellation graph, saves x\_pos/y\_pos back to DB

* Add and delete custom nodes and edges from the graph view

* Weekly review mode: XP earned, habit hit rate, milestones moved, goals progressed

* Revisit-after date badge on the backburner tab when dates have passed

* Chapter history log: timestamped record of chapter changes

* Export journal entries as PDF

* Mobile-optimised HUD with hamburger nav

* Dark/light mode toggle (dark is the intended primary experience)