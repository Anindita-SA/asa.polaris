# Implementation Plan: Morning Brief News Scout & Anti-Repeat Optimization

## 1. Context & Motivation
The user requested two core adjustments to the Morning Brief news engine:
1. Replace pure biotech news (genetic engineering, cellular biology, CRISPR, gene drive) with:
   - Hardware, sensors, and human-machine interfaces (HMI, robotics, embedded systems, power electronics).
   - New methods of growing food and agritech (innovative agriculture, hydroponics, vertical farming, crop sensors, robotics).
   - Nutrition science, dietary research, and lifestyle interventions that support physical and mental wellbeing.
2. Fix the anti-repeat mechanism, which was repeatedly selecting the same categories due to:
   - A single-day lookback window that ignored past multi-day frequency.
   - A 5-pillar pool where selecting 3 items mathematically forced at least 1 repeat daily.
   - Candidate starvation on single-feed pillars forcing fallback to the same few sources.
   - A catch-all mapping that routed unmapped feeds to Community Ecology.

## 2. Architecture & Design

### 2.1 6-Pillar System (Zero Repeat Guarantee)
Expand the canonical pillars from 5 to 6:
1. `Hardware, sensors & human-machine interface`
2. `Food systems & agritech`
3. `Nutrition science & wellbeing`
4. `Tech & field implementation`
5. `Marine & ocean conservation`
6. `Community & grassroots ecology`

Because each daily brief selects exactly 3 items:
- Yesterday covers 3 pillars.
- 3 fresh pillars remain unrepresented today.
- When candidates exist for all 3 fresh pillars, `maxYesterdayAllowed = 0`, guaranteeing 100% fresh pillar coverage with zero consecutive-day repeat.

### 2.2 Verified Multi-Feed Redundancy (Min 2 Feeds Per Pillar)
Each canonical pillar is backed by at least 2 verified, fast, non-blocking RSS feeds:
- **Hardware/HMI:** Hackaday (`hackaday.com/feed`), TechXplore Robotics (`techxplore.com/rss-feed/robotics-news`), TechXplore Hardware (`techxplore.com/rss-feed/hardware-news`).
- **Food Systems:** AgFunderNews (`agfundernews.com/feed`), Phys.org Agriculture & Plants (`phys.org/rss-feed/biology-news/plants-animals`).
- **Nutrition & Wellbeing:** The Conversation Health & Wellbeing (`theconversation.com/global/health/articles.atom`), ScienceDaily Nutrition (`sciencedaily.com/rss/health_medicine/nutrition.xml`), ScienceDaily Fitness (`sciencedaily.com/rss/health_medicine/fitness.xml`).
- **Field Tech:** Phys.org Engineering (`phys.org/rss-feed/technology-news/engineering`), TechXplore Tech News (`techxplore.com/rss-feed`).
- **Marine:** Ocean Conservancy (`oceanconservancy.org/feed`), Phys.org Oceanography (`phys.org/rss-feed/earth-news/oceanography`).
- **Ecology:** Phys.org Environment (`phys.org/rss-feed/earth-news/environment`), Phys.org Ecology (`phys.org/rss-feed/biology-news/ecology`).

### 2.3 5-Day Anti-Repeat Frequency Tracking
Instead of checking only yesterday's brief, inspect the past 5 daily briefs:
- Tally frequency of appearance for each canonical pillar over the past 5 days.
- Priority Pass A: Select candidates from today's unrepresented fresh pillars, sorted ascending by 5-day frequency count (least recently covered first).
- Fallback Pass B: If fresh pillars lack candidates, fill remaining slots from remaining pillars sorted ascending by 5-day frequency count, breaking static array index bias.

### 2.4 Prompt Template Update (`personal_prompts.ts`)
Update `TARGET_NEWS_DOMAINS` and `newsPrompt` to explicitly instruct the model to avoid pure biotech/genetic engineering, prioritize hardware, food systems, and nutrition science, and mandate selection from today's fresh unrepresented pillars.

## 3. Files to Touch
- `supabase/functions/_shared/personal_prompts.ts`
- `supabase/functions/generate-morning-brief/index.ts`
- `src/lib/newsDiversity.js`
- `src/lib/newsDiversity.test.js`
- `package.json` (bump to 1.2.60)
- `docs/CHANGELOG.md` & `docs/PROGRESS.md`
