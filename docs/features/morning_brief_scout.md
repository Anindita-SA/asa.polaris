# Morning Brief & Opportunity Scout

## Overview
The Morning Brief & Opportunity Scout pipeline delivers curated news and verified external opportunities into Polaris every morning. It runs via Supabase Edge Functions and integrates directly into the Day Guide and Launch Pad.

## Pipeline Architecture

### 1. Positive Climate & Tech News Scout
- **Edge Function**: `generate-morning-brief` executes automatically once per day or on manual refresh.
- **6 Canonical Pillars**:
  1. Hardware, sensors and human-machine interface
  2. Food systems and agritech
  3. Nutrition science and wellbeing
  4. Tech and field implementation
  5. Marine and ocean conservation
  6. Community and grassroots ecology
- **Anti-Repeat Engine**:
  - Tracks pillar appearance frequency across the past 5 daily briefs.
  - Guarantees fresh pillar rotation each day, eliminating consecutive repeats.
- **Spark Popup**: Surfaces 3 summarized positive news stories upon morning login.

### 2. Opportunity Scout Pipeline
- **Edge Function**: `scout-opportunities` scrapes verified feeds and calls LLM inference to identify relevant grants, residencies, fellowships, and hardware competitions.
- **Verification Gates**:
  - Direct application page classification (filters out aggregators and press releases).
  - Explicit funding requirement (rejects unpaid or self-funded programs).
  - Realistic match scoring: `profile_match` (0-100) and `acceptance_chance` (0-100).
- **One-Click Task Conversion**:
  - Clicking "Flag to Apply" converts an opportunity into an active Polaris task pre-filled with deadline and eligibility notes.

