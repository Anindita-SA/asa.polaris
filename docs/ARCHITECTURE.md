# Polaris Architecture

## Tech Stack Overview
Polaris is built as a modern, client-side rendered single-page application.
- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom CSS (`global.css`)
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS)
- **Icons**: Lucide React
- **Visualizations**: D3.js (Constellation Graph), Recharts (Stats/XP)

## State Management
State is largely managed via custom React hooks that interface with Supabase:
- `useAuth`: Manages the user session and the XP/Leveling system.
- `useTodaysTasks`: Unifies daily tasks and daily goals into a single interface.
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
```

## Security
- **Row Level Security (RLS)**: Every table in Supabase enforces `user_id = auth.uid()` to guarantee complete data isolation.
- **API Keys**: Google API keys and Supabase anon keys are stored securely in `.env`.
