# Polaris Features

Polaris is a comprehensive life-management and productivity RPG dashboard. Below is a breakdown of all its core features.

## 1. The Constellation Graph
A 3D/2D interactive node-based map of your life's domains.
*   **Root Node**: Polaris itself.
*   **Domain Nodes**: Broad areas like Career, Academic, Self.
*   **Subnodes & Topics**: Nested actionable items.
*   **AI Task Breakdown**: Generate step-by-step action plans for any topic or subnode.

## 2. Focus Board & Backburner
A workspace for prioritizing active projects.
*   **Active Focus**: Max 3 items you are currently prioritizing. Includes Drag-and-Drop ranking.
*   **Backburner**: A place to defer ideas safely. Captures a "Context Snapshot" so you don't lose your train of thought when you revisit it.

## 3. Unified Daily Tasks & Multi-Scope Goals
A synchronized system for managing what you need to do today, this week, or this year.
*   **Daily Tasks**: Your immediate checklist for the day. Shared seamlessly between the **Focus Board** and **Reminders Panel**.
*   **Surprise Me Randomizer**: A gamified dice-roll button that randomly selects an incomplete daily task or goal for you to tackle next.
*   **Goals Engine**: Categorized by scope (daily, weekly, monthly, quarterly, yearly, 5yr). Completing long-term goals yields massive XP.

## 4. Pomodoro Timer & Leveling System
A built-in productivity tracker that rewards your effort.
*   **Persistent Timer**: A floating Pomodoro timer that survives navigation. Supports infinite loop mode.
*   **Level Progression**: Earn XP per minute of focus, and for completing tasks, rituals, and goals. Level up through ranks like *Stargazer* to *Da Vinci Inheritor*.

## 5. Daily Rituals & Journal
Tools to bookend your day.
*   **Ritual Stack**: Morning, Anytime, and Evening recurring habits that grant instant XP upon completion.
*   **Journal Logs**: Save daily reflections to Supabase.
*   **Year in Pixels**: A mood tracker visualizing your year in a grid.

## 6. Contacts, Nudges & Notifications
A CRM for your personal life.
*   **Reach Out**: Manage contacts categorized by tiers (Hearth, Parlour, Porch, Yard) with calculated overdue indicators to remind you to reconnect.
*   **Nudges**: Custom recurring reminders (e.g., "Drink Water", "Stretch") that hook into the browser's Push Notification API via a custom Service Worker.

## 7. Google Calendar & Tasks Integration
*   **Google Calendar Sync**: View your real-time Google Calendar events in a beautiful, translucent, color-matched interface.
*   **Google Tasks Sync**: Pull in your Google Tasks and merge them into your Polaris daily goals.

## 8. Curriculum & Media Log
A hub for tracking learning and consumption.
*   **Curriculum Shelf**: Track courses, books, and self-study topics.
*   **Media Log**: Rate and review movies, shows, games, and books.

## 9. Play View
A zero-pressure leisure hub.
*   **Mini-Games**: Embed or link out to relaxing web games. 
*   **Zero Tracking**: No XP, no timers. Just a place to unwind.

## 10. Timeline Graph
A visual history of your milestones.
*   **Milestones**: Log major life events, colored by category, plotted on a chronological timeline.

## 11. Recurring Tasks
Automated daily generation of recurring matrix tasks.
*   **Template-Driven**: Define recurring task templates with priority quadrant, estimated duration, and notes.
*   **Auto-Generation**: Templates auto-generate matrix tasks daily on Dashboard load.
*   **Duplicate Prevention**: Checks existing daily entries to ensure each template generates only once per day.
*   **State Tracking**: Updates template last generated timestamps automatically upon instantiation.

