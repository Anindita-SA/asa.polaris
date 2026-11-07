# Day Guide & Today Agenda

## Overview
The Day Guide is Polaris's primary execution cockpit. It consolidates daily execution into a focused daily agenda, enforces a strict 3-primary task cap, and provides synchronized timeboxing and progress tracking.

## Core Capabilities

### 1. 3-Primary Task Cap
- **Cognitive Protection**: Capped at a maximum of 3 primary tasks per calendar day to ensure realistic daily throughput.
- **Primary Task Criteria**: Any task with medium or high mental load, or an estimated duration >= 20 minutes, counts as a primary task.
- **Overflow Prevention**: Secondary and quick routine tasks are grouped cleanly below primaries.

### 2. Timebox Allocation & Stream Blocks
- **Flexible Scheduling**: Plan tasks into morning, afternoon, or evening blocks with designated focus durations.
- **Tally Box Progression**: Visual check-boxes represent discrete 25-minute Pomodoro intervals.
- **XP Integration**: Checking off a focus box or completing a scheduled task awards instant XP and plays an audio chime.

### 3. Loop Detector & Sync Safety
- **Idle Loop Detection**: Monitors Dexie local cache and remote Supabase tables to prevent redundant writes or infinite pull-push loops.
- **Unbroken State**: Local edits are applied optimistically on frame zero, with background queue synchronization and cooldown guards.

### 4. Surprise Me Randomizer
- Built-in dice-roll utility that randomly selects an incomplete daily objective or primary task to eliminate decision paralysis and kickstart action.

