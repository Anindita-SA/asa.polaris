# Design Process

Polaris was designed to solve the problem of fragmented productivity. Before Polaris, the user had to jump between Notion, Google Calendar, Todoist, and habit tracking apps. 

## The Core Philosophy
1. **Unification**: Everything in one place. Your goals, your calendar, your tasks, and your contacts.
2. **Gamification**: Boring tasks become quests. The XP and Leveling engine acts as a positive reinforcement loop.
3. **Space Aesthetics**: Productivity apps are usually sterile. Polaris feels like a sci-fi cockpit. The UI uses deep space backgrounds (`#0a0a0f`), glowing starlight text (`#e2e8f0`), and vibrant highlights (`aurora`, `pulsar`, `nova`).
4. **No Guilt**: Overdue items shouldn't make the user feel bad. The UI gracefully handles missed days without glaring red warnings (e.g., using amber or subtle indicators, or capping overdue counters).

## UI Elements
- **Glassmorphism**: By using subtle blurs (`backdrop-blur-xl`), the app feels deep and layered.
- **Micro-interactions**: Hover lifts (`hover:-translate-y-1`) make the app feel tactile and responsive.
- **Consistent Borders**: Thin, low-opacity borders (`border-blue-900/20`) define sections without clutter.
