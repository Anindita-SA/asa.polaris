# Pomodoro Timer & Compact Leveling System

## Overview
Polaris merges real-time timeboxing with a lifelong 200-level gamified progression curve. Every minute of focus, task completion, habit consistency, and periodic review contributes to permanent character progression.

## 1. Pomodoro & Task Duration Timer

### Timer Modes
- **Pomodoro (25m Focus / 5m Break / 15m Long Break)**: Standard productivity cadence with audio chimes.
- **Task Measurement Mode**: Measures authentic duration taken to complete a task, establishing real-world calibration baselines.
- **Overtime Protection**: When estimated task duration is reached, the timer plays a double chime and shifts into visual amber overtime rather than cutting off work. Hard safety caps pause after prolonged inactivity.

### Always-on-Top Floating Widget
- **Document Picture-in-Picture (PiP)**: Uses the `window.documentPictureInPicture.requestWindow()` API to float above desktop software (KiCad, VS Code, terminals) without getting hidden.
- **Wall-Clock Accuracy**: Calculates elapsed time using `Date.now() - sessionStart` on each frame, preventing timer freeze when the main tab is throttled in the background.

---

## 2. Lifelong Leveling Curve (Levels 1 to 200)

Progression uses a quadratic curve scaling to Level 200 without slowing down to an unachievable grind:
```text
XP Required for Level L = 15 * L^2
```

Key milestones:
- **Level 2**: 60 XP (Rapid initial momentum)
- **Level 10**: 1,500 XP
- **Level 50**: 37,500 XP
- **Level 100**: 150,000 XP
- **Level 200**: 600,000 XP (Lifelong mastery cap)

---

## 3. Dynamic Rank Titles (20 Tiers / 10 Levels Per Tier)

Each rank tier spans 10 levels (Grade 10 descending to Grade 1) up to Level 200:

| Level Range | Rank / Title | Cumulative XP |
| :---: | :--- | :---: |
| **1 - 10** | **Stargazer** | 15 - 1,500 XP |
| **11 - 20** | **Apprentice Inventor** | 1,815 - 6,000 XP |
| **21 - 30** | **Circuit Weaver** | 6,615 - 13,500 XP |
| **31 - 40** | **Signal Architect** | 14,415 - 24,000 XP |
| **41 - 50** | **Logic Designer** | 25,215 - 37,500 XP |
| **51 - 60** | **Hardware Tinkerer** | 39,015 - 54,000 XP |
| **61 - 70** | **Embedded Coder** | 55,815 - 73,500 XP |
| **71 - 80** | **System Planner** | 75,615 - 96,000 XP |
| **81 - 90** | **Renaissance Engineer** | 98,415 - 121,500 XP |
| **91 - 100** | **Polaris Navigator** | 124,215 - 150,000 XP |
| **101 - 110** | **Constellation Maker** | 153,015 - 181,500 XP |
| **111 - 120** | **Da Vinci Inheritor** | 184,815 - 216,000 XP |
| **121 - 130** | **Algorithmic Alchemist** | 219,615 - 253,500 XP |
| **131 - 140** | **Dynamic Modeler** | 257,415 - 294,000 XP |
| **141 - 150** | **Quantum Engineer** | 298,215 - 337,500 XP |
| **151 - 160** | **Celestial Cartographer** | 342,015 - 384,000 XP |
| **161 - 170** | **Cosmic Architect** | 388,815 - 433,500 XP |
| **171 - 180** | **Galaxy Weaver** | 438,615 - 486,000 XP |
| **181 - 190** | **Infinite Explorer** | 491,415 - 541,500 XP |
| **191 - 200+** | **Ascended Visionary** | 547,215 - 600,000+ XP |

---

## 4. Periodic Sweep Awards

Honor-code awards for completing all planned objectives in a given timeframe:
- **Daily Sweep**: +50 XP (All daily habits and primary tasks complete)
- **Weekly Sweep**: +200 XP (All scheduled weekly goals complete)
- **Monthly Sweep**: +500 XP (All monthly targets cleared)
- **Quarterly Sweep**: +1,500 XP (All quarterly targets cleared)

---

## 5. Heartfelt AI Mentor

An empathetic life mentor prompt tuned to analyze recent workout logs, meal consistency, and study habits, providing validating encouragement and one gentle, high-impact focus recommendation.

