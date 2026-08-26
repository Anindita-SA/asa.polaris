# POLARIS 🌟

**Polaris** is a gamified personal life dashboard and productivity RPG. Built with a dark glassmorphic UI, it unifies task management, habit tracking, life-domain mapping, and Pomodoro focus into a single, cohesive ecosystem.

![Polaris Identity](public/pwa-192x192.png)

## 🚀 Core Features

- **The Constellation Graph**: A 2D/3D interactive node-based map of your life's domains (Career, Academic, Self). Break down massive life goals into actionable steps using AI.
- **Task Matrix (Eisenhower/WSJF)**: Prioritize your tasks effectively with automated WSJF (Weighted Shortest Job First) scoring and Eisenhower Matrix quadrants.
- **AI Day Guide**: A smart AI assistant that looks at your calendar, goals, and tasks to curate a customized plan for your day.
- **Persistent Pomodoro Timer**: A globally accessible focus timer that tracks your deep work sessions and awards XP for your effort. Fully integrated with your Task Matrix.
- **RPG Leveling System**: Earn XP for logging habits, completing focus sessions, and hitting milestones. Rank up from *Stargazer* to *Da Vinci Inheritor*.
- **Focus Board & Backburner**: A dedicated workspace to drag-and-drop your top 3 active priorities. Park the rest safely in the Backburner.
- **Google Integrations**: Seamlessly pulls in your real-time Google Calendar events and Google Tasks into a translucent, unified view.
- **PWA Ready**: Installable as a Progressive Web App (PWA) on your devices, featuring background auto-updating and native offline support.

## 🛠 Tech Stack

- **Frontend**: React, Vite
- **Styling**: Tailwind CSS (Dark Glassmorphism)
- **Backend & Auth**: Supabase (PostgreSQL, Edge Functions, OAuth)
- **Data Visualization**: D3.js
- **AI Integration**: Groq API (LLM inference)
- **Hosting**: GitHub Pages

---

## ⚙️ Setup Instructions

### 1. Supabase Initialization
1. Go to your Supabase project → **SQL Editor**.
2. Paste the SQL setup script from `src/lib/supabase.js` (commented block at the bottom) and run it to set up tables.
3. Enable **Google Auth** in Supabase:
   - Supabase Dashboard → Authentication → Providers → Google.
   - Add your Google OAuth client ID and Secret.
   - Ensure you add your hosted URL (e.g., `https://username.github.io/asa.polaris/`) to the Redirect URLs.

### 2. GitHub Secrets (for GitHub Pages deployment)
In your repository, navigate to **Settings → Secrets and variables → Actions** and add:
- `VITE_SUPABASE_URL`: Your Supabase API URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key.

### 3. Local Development

```bash
# Clone the repository
git clone https://github.com/Anindita-SA/asa.polaris.git
cd asa.polaris

# Set up local environment variables
cp .env.example .env
# Fill in your Supabase values in .env

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Tests & Quality Assurance
Polaris uses Vitest and React Testing Library for automated testing.
```bash
# Run unit tests
npm run test
```

## 📂 File Structure Overview

```text
src/
  components/
    graph/        # ConstellationGraph.jsx (D3 star map)
    journal/      # Highlight logging, Heatmaps
    layout/       # App Shell, Starfield background, Global HUD
    panels/       # Sliding sidebar panels (FocusBoard, Timeline, FitnessBridge)
    widgets/      # Reusable dashboard widgets (Goals, Matrix, Pomodoro)
  data/           # Seed data and application constants
  hooks/          # Custom React hooks (useAuth, useWSJFScore)
  lib/            # Utility functions (supabase.js, llm.js)
  pages/          # Top-level route components
  styles/         # Tailwind directives and custom animations
```
