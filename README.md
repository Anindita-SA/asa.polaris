# POLARIS ⭐

Your personal life dashboard. Career clarity, gamified.

## Stack
- React + Vite
- Tailwind CSS
- Supabase (auth + database + storage)
- D3.js (constellation graph)
- GitHub Pages (hosting)

---

## Setup

### 1. Supabase — run SQL

Go to your Supabase project → SQL Editor → paste the entire SQL block from `src/lib/supabase.js` (the commented block at the bottom). Run it.

Also enable Google Auth:
- Supabase Dashboard → Authentication → Providers → Google → enable
- Add your Google OAuth credentials (create at console.cloud.google.com)
- Add `https://anindita-sa.github.io/asa.polaris/` to redirect URLs

### 2. GitHub Secrets

In your repo: Settings → Secrets → Actions → add:

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### 3. GitHub Pages

Settings → Pages → Source: GitHub Actions

### 4. Local development

```bash
cp .env.example .env
# fill in your Supabase values

npm install
npm run dev
```

---

## File structure

```
src/
  components/
    graph/        ConstellationGraph.jsx (D3 star map)
    journal/      Journal.jsx (highlights, habits, heatmap)
    layout/       HUD.jsx, Starfield.jsx
    panels/       NodePanel, FocusBoard, Timeline, FitnessBridge
    widgets/      GoalsPanel (weekly→5yr)
  data/           defaults.js (milestones, nodes, XP levels)
  hooks/          useAuth.jsx
  lib/            supabase.js
  pages/          Login.jsx, Dashboard.jsx
  styles/         global.css
```

---

## XP System

| Action | XP |
|---|---|
| Log daily highlight | +20 |
| Complete a habit | +10 |
| Complete a focus item | +75 |
| Complete a goal | +50–200 |
| Complete a milestone | +75–300 |

Levels: Stargazer → Apprentice Inventor → Circuit Weaver → Signal Architect → Renaissance Engineer → Polaris Navigator → Constellation Maker → Da Vinci Inheritor

---

## Fitness Bridge

Reads from existing tables in your Supabase project:
- `workout_logs` (user_id, workout_type, notes, created_at)
- `meal_logs` (user_id, meal_name, calories, created_at)
- `weight_logs` (user_id, weight, created_at)

If column names differ in your aloka-fit app, update the field references in `FitnessBridge.jsx`.
