# Polaris Architecture

## Tech Stack Overview
Polaris is built as a modern, client-side rendered single-page application with a cloud-autonomous backend layer.
- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom CSS (`global.css`)
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS, pg_cron)
- **Edge Functions**: Deno (News Scout, Opportunity Scout via Firecrawl)
- **Local Automation**: Local LLMs (qwen2.5:3b) for Task Triage, PowerShell tasks
- **Icons**: Lucide React
- **Visualizations**: D3.js (Constellation Graph), Recharts (Stats/XP)

## State Management
State is largely managed via custom React hooks that interface with Supabase:
- `useAuth`: Manages the user session and the XP/Leveling system.
- `useTodaysTasks`: Unifies daily tasks, scheduled items, and daily goals into a single interface.
- `useMorningSequence` & `useMorningBrief`: Wires up the Morning Brief and SparkPopup.
- `useNudgeScheduler`: Handles background timers and service worker push notifications.
- `useContactReminders`: Manages relationship tiers and calculates overdue communication.
- `useGoogleTasks`: Handles OAuth synchronization with Google APIs.

## UI/UX Paradigms
- **Glassmorphism**: UI components heavily utilize backdrop blurs (`glass` class), subtle translucent borders, and hover lift animations (`glass-hover`, `hover:-translate-y-1`).
- **Space Aesthetic**: Colors map to celestial themes (void, starlight, pulsar, aurora).

## Project Structure
```text
src/
├── components/
│   ├── anchor/      (Clarity anchor, Eulogy)
│   ├── curriculum/  (Learning tracking, Media logs)
│   ├── graph/       (Constellation D3 visualizations)
│   ├── journal/     (Daily logs, Rituals, Year in Pixels)
│   ├── layout/      (HUD, BottomNav)
│   ├── modals/      (Stats, Auth, Add Media, Surprise Task)
│   ├── orbit/       (Fitness, Relationships, Play View)
│   ├── panels/      (Main dashboard views: Focus, Timeline, Reminders, Calendar)
│   └── widgets/     (Pomodoro, Goals, IO Balance Bar)
├── hooks/           (Custom logic, DB abstractions)
├── lib/             (Supabase client, Sound utils)
├── data/            (XP rewards, default schemas)
├── styles/          (global.css, tailwind base)
└── pages/           (Dashboard, Login)
scripts/
├── lib/             (safe_supabase.js)
├── logs/            (audit.jsonl)
└── task_triage.js   (Local LLM triage pipeline)
supabase/
└── functions/       (scout-opportunities, generate-morning-brief)
```

## Security
- **Row Level Security (RLS)**: Every table in Supabase enforces `user_id = auth.uid()` to guarantee complete data isolation.
- **Local Automation Security**: `safe_supabase.js` acts as a wrapper blocking background scripts from touching unauthorized tables or executing `.delete()`.
- **Audit Logging**: `scripts/logs/audit.jsonl` tracks every automated database write.
- **API Keys**: Google API keys and Supabase anon keys are stored securely in `.env`. Edge Functions use `vault.secrets`.
