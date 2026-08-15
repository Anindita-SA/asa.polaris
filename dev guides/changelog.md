# Polaris — Development Timeline & Changelog

This document tracks feature releases, architecture changes, and major bug fixes across the Polaris ecosystem.

## [2026-06-09] Database Schema Audit & Fixes
- **Bug Fix (Goals Panel):** Identified and resolved a constraint issue where the `goals` table's `goals_scope_check` blocked `daily` and `side_quest` goal scopes.
- **Bug Fix (Goals Panel):** Added missing `description` and `deadline` columns to the `goals` table to ensure the GoalsPanel functions without silently dropping data.
- **Bug Fix (Fitness Bridge):** Added rigorous `user_id` filtering to the `workout_logs`, `meal_logs`, and `weight_logs` queries in `FitnessBridge.jsx` to prevent data leaking across users if Row Level Security (RLS) is disabled or misconfigured.
- **Bug Fix (Pomodoro Data):** Corrected a silent failure in `CurriculumView.jsx` where it attempted to read a non-existent `duration` column from `pomodoro_logs` instead of the correct `duration_minutes` column.

## [2026-05-24] Curriculum UI/UX Visual Overhaul
- **Aesthetic Update:** Implemented a single-row horizontal scrolling bookshelf, replacing the older grid layout, giving a highly premium "library" feel.
- **Interactive Books:** Upgraded `BookSpine.jsx` to feature 3D interactions. Books now lift outward `translateY(-16px) scale(1.06)` on hover, and execute a fully animated `rotateY` 3D "page flip" when opening.
- **Layout Alignment:** Matched the padding across the `CurriculumView` to mirror the `Timeline` panel (`max-w-2xl mx-auto`), dropping edge-to-edge layouts for a more contained, readable experience.
- **Resources Restructure:** Moved Curriculum Resources from a rigid side-column into an elegant, collapsible dropdown menu nested directly beneath the syllabus.
- **Scrollbar Suppression:** Injected `.scrollbar-hide` CSS utilities into `global.css` to permanently hide ugly browser scrollbars while retaining full horizontal scroll capabilities.

## [2026-05-23] Curriculum Architecture Complete Rewrite (v2)
- **Database Schema Overhaul:** Scrapped the flat curriculum design in favor of a 5-table relational structure: `curriculum_categories`, `curricula`, `curriculum_topics`, `curriculum_resources`, and `media_log`.
- **Database Seeding (`seed_complete.sql`):** Created a monolithic SQL transaction that purges old legacy curriculum data and cleanly seeds 4 master categories, 16 comprehensive subjects (Career, Academic, Self, Media & Lit), and 15 media log watchlist items.
- **Media Log / Watchlist:** Implemented a dedicated tracking system for Books, Movies, and Shows, allowing the user to mark items as "In Progress" or "Want to Read", add 5-star ratings, and tag them by genre.

## [2026-05-08] Leveling & XP Engine Integration
- **Centralized Logic:** Deployed `src/data/xpRewards.js` as the single source of truth for all XP values across the entire application (Pomodoros, Curriculum topics, Goals, I/O Balance).
- **Punishment Removal:** Stripped out the negative (-300 XP) punitive buttons, favoring a purely positive-reinforcement structure based on the user's ADHD-friendly requirements.
- **Global Font Swap:** Set `DM Serif Display` as the global header font to achieve the desired "Dark Academia" aesthetic.

---
*(End of current logs)*
