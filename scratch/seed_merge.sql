-- ─────────────────────────────────────────────────────────────────────────────
-- POLARIS — Merge Seed Script (Additive — keeps existing data)
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Get your user ID (replace if you know it already)
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users LIMIT 1;

  -- ── Ensure 'daily' scope is allowed ───────────────────────────────────────
  ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_scope_check;
  ALTER TABLE goals ADD CONSTRAINT goals_scope_check 
    CHECK (scope IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', '5yr'));

  -- ── GOALS (skip if title already exists for this user) ────────────────────

  -- DAILY
  INSERT INTO goals (user_id, title, scope, target, unit, xp_reward) 
  SELECT uid, t.title, t.scope, t.target, t.unit, t.xp_reward
  FROM (VALUES
    ('Read and annotate 1 DAB paper',                     'daily', 1,   'paper',   20),
    ('Add content to a portfolio case study',             'daily', 1,   'session', 20),
    ('Complete Greek Commoner Workout or 30min movement', 'daily', 1,   'session', 15),
    ('10 minutes of non-technical creative work',         'daily', 10,  'minutes', 10)
  ) AS t(title, scope, target, unit, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = uid AND g.title = t.title);

  -- WEEKLY
  INSERT INTO goals (user_id, title, scope, target, unit, xp_reward) 
  SELECT uid, t.title, t.scope, t.target, t.unit, t.xp_reward
  FROM (VALUES
    ('Read and annotate DAB papers for literature base',           'weekly', 5,   'papers',   50),
    ('Write 500 words of survey paper draft',                      'weekly', 500, 'words',    50),
    ('Make progress on CHAARG-L schematic in KiCad',               'weekly', 1,   'session',  50),
    ('Work on solar scheduler firmware or hardware',                'weekly', 2,   'sessions', 50),
    ('Work on portfolio site or project documentation',             'weekly', 2,   'sessions', 50),
    ('Research one university or scholarship on tracker',           'weekly', 1,   'entry',    50),
    ('Complete 4 resistance band sessions',                        'weekly', 4,   'sessions', 50),
    ('Write one Substack draft or creative entry',                 'weekly', 1,   'draft',    50),
    ('Stay on top of assigned coursework — no backlogs',           'weekly', 1,   'review',   50),
    ('Meet with or update Dr. Vignesh Kumar on DAB progress',      'weekly', 1,   'update',   50)
  ) AS t(title, scope, target, unit, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = uid AND g.title = t.title);

  -- MONTHLY
  INSERT INTO goals (user_id, title, scope, target, unit, xp_reward) 
  SELECT uid, t.title, t.scope, t.target, t.unit, t.xp_reward
  FROM (VALUES
    ('Complete one full section of the survey paper',             'monthly', 1,  'section',    50),
    ('Collect and categorize 20+ DAB papers in Zotero',           'monthly', 20, 'papers',     50),
    ('Complete one major CHAARG milestone (schematic/BOM/PCB)',   'monthly', 1,  'milestone',  50),
    ('Complete one phase of solar scheduler project',             'monthly', 1,  'phase',      50),
    ('Publish one complete project case study to portfolio site',  'monthly', 1,  'case study', 50),
    ('Research and verify 5 university deadlines + requirements', 'monthly', 5,  'unis',       50),
    ('Track progressive overload — increase reps or resistance',  'monthly', 1,  'milestone',  50),
    ('Publish one Substack post',                                  'monthly', 1,  'post',       50),
    ('Review spending and scholarship deadlines for the month',   'monthly', 1,  'review',     50),
    ('Complete all lab assignments and submissions on time',      'monthly', 1,  'month',      50)
  ) AS t(title, scope, target, unit, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = uid AND g.title = t.title);

  -- QUARTERLY
  INSERT INTO goals (user_id, title, scope, target, unit, xp_reward) 
  SELECT uid, t.title, t.scope, t.target, t.unit, t.xp_reward
  FROM (VALUES
    ('Complete full draft of DAB survey paper (Sections 1-6)', 'quarterly', 1, 'draft',     50),
    ('CHAARG-L PCB ordered and validated',                    'quarterly', 1, 'milestone', 50),
    ('Solar scheduler baseline data collection complete',      'quarterly', 1, 'milestone', 50),
    ('3 case studies live on portfolio site',                  'quarterly', 3, 'projects',  50),
    ('Cold email 5 TU Delft/TU/e/Aalto faculty',              'quarterly', 5, 'emails',    50),
    ('Identify and apply to 2 relevant competitions',         'quarterly', 2, 'entries',   50),
    ('Establish consistent 4x/week workout habit',             'quarterly', 1, 'habit',     50),
    ('Complete 3 Substack posts — find your writing voice',   'quarterly', 3, 'posts',     50),
    ('Map full masters funding gap and scholarship options',   'quarterly', 1, 'plan',      50)
  ) AS t(title, scope, target, unit, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = uid AND g.title = t.title);

  -- YEARLY
  INSERT INTO goals (user_id, title, scope, target, unit, xp_reward) 
  SELECT uid, t.title, t.scope, t.target, t.unit, t.xp_reward
  FROM (VALUES
    ('Submit DAB survey paper to IEEE Access or Energies',        'yearly', 1,  'submission',   50),
    ('Submit solar scheduler paper to IEEE conference',           'yearly', 1,  'submission',   50),
    ('CHAARG-L fully documented and on portfolio site',           'yearly', 1,  'project',      50),
    ('Portfolio fully populated — 4 real projects live',          'yearly', 4,  'projects',     50),
    ('Submit all 37 MSc applications by January 2027',           'yearly', 37, 'applications', 50),
    ('Retake IELTS — score 7.5 or above',                        'yearly', 1,  'test',         50),
    ('Obtain MOI certificate from NIT Trichy registrar',         'yearly', 1,  'document',     50),
    ('Secure at least 2 strong recommendation letters',          'yearly', 2,  'letters',      50),
    ('Make meaningful hardware contribution to DAB converter',    'yearly', 1,  'milestone',    50),
    ('Build foundation — consistent strength and movement habit', 'yearly', 1,  'year',         50),
    ('12 Substack posts — consistent voice established',         'yearly', 12, 'posts',        50),
    ('Apply to Swedish Institute Scholarship (opens Aug 2026)',  'yearly', 1,  'application',  50)
  ) AS t(title, scope, target, unit, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = uid AND g.title = t.title);

  -- 5-YEAR
  INSERT INTO goals (user_id, title, scope, target, unit, xp_reward) 
  SELECT uid, t.title, t.scope, t.target, t.unit, t.xp_reward
  FROM (VALUES
    ('Complete MSc at a top European university',                          '5yr', 1,   'degree',      750),
    ('CHAARG-P deployed as real product — first 100 units sold',          '5yr', 100, 'units',       1000),
    ('Solar scheduler deployed in real off-grid community',               '5yr', 1,   'deployment',  1000),
    ('Deskimon launched as a commercial product',                         '5yr', 1,   'launch',      750),
    ('Generate first revenue from a product you built',                   '5yr', 1,   'milestone',   1000),
    ('Achieve financial independence — not dependent on salary',          '5yr', 1,   'milestone',   1000),
    ('Establish a creative practice — art, writing, or both',             '5yr', 1,   'practice',    500),
    ('Achieve Athena physique benchmark — strong, capable, free',        '5yr', 1,   'milestone',   750),
    ('Portfolio recognized — leads to speaking, collaboration, or press', '5yr', 1,   'recognition', 750)
  ) AS t(title, scope, target, unit, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = uid AND g.title = t.title);

  -- ── HABITS (skip if title already exists) ─────────────────────────────────
  INSERT INTO habits (user_id, title, frequency, xp_reward)
  SELECT uid, t.title, t.frequency, t.xp_reward
  FROM (VALUES
    ('Morning movement — resistance bands or walk, minimum 15 minutes',     'daily',  15),
    ('Hit protein target for the day',                                       'daily',  10),
    ('One Pomodoro session on the top Focus Board item',                     'daily',  20),
    ('Read one paper, article, or chapter — anything that feeds curiosity',  'daily',  10),
    ('No doom scrolling before 10am — protect morning brain',               'daily',  10),
    ('Weekly review — update Focus Board, check deadlines, clear backburner','weekly', 30),
    ('Contact home — call or message family',                               'weekly', 15),
    ('One act of creative output — sketch, write, make anything',           'weekly', 20)
  ) AS t(title, frequency, xp_reward)
  WHERE NOT EXISTS (SELECT 1 FROM habits h WHERE h.user_id = uid AND h.title = t.title);

  -- ── FOCUS ITEMS (skip if title already exists) ────────────────────────────
  INSERT INTO focus_items (user_id, title, category, why_now, status)
  SELECT uid, t.title, t.category, t.why_now, 'active'
  FROM (VALUES
    ('DAB Survey Paper',                          'research',  'June 2026 deadline is the single most important near-term milestone. A submitted paper changes the entire SOP narrative.'),
    ('CHAARG-L PCB Schematic',                    'hardware',  'Schematic started but not complete. PCB ordered = portfolio piece locked. Strongest technical project for IPD admission.'),
    ('Concrete Speaker — Deploy to Portfolio Site','portfolio', 'MDX file is written and sitting in outputs. Zero excuse. Deploy it today.')
  ) AS t(title, category, why_now)
  WHERE NOT EXISTS (SELECT 1 FROM focus_items f WHERE f.user_id = uid AND f.title = t.title);

  -- ── BACKBURNER (skip if title already exists) ─────────────────────────────
  INSERT INTO backburner (user_id, title, why_deferred, context_snapshot)
  SELECT uid, t.title, t.why_deferred, t.context_snapshot
  FROM (VALUES
    ('Deskimon',
     'Product concept locked and IP protected. Cannot split focus while CHAARG and paper are active.',
     'Physical desk companion with built-in pomodoro timer. James Dyson Award 2026 candidate (deadline July 15). Do NOT share publicly until filed.'),
    ('Winter Internship Abroad',
     'Applications open August-October 2026. No action needed until then.',
     'Targets: KAUST VSRP, NUS IRIS Singapore, cold email TU Delft/TU/e faculty. Start applications August 2026.'),
    ('oikos International — Communications Role',
     'Email drafted, not yet sent. Low urgency but high network value.',
     'Impact Communications role, 3-5 hrs/week remote. Fits creative identity. Keep only if it energizes.'),
    ('ME3+ / MESPOM Erasmus Mundus',
     'Council revised priority downward once entrepreneurship was weighted properly.',
     'Full ride Erasmus Mundus programs. Both have Jan 2027 deadlines. Apply with template SOP adaptation, not bespoke effort.')
  ) AS t(title, why_deferred, context_snapshot)
  WHERE NOT EXISTS (SELECT 1 FROM backburner b WHERE b.user_id = uid AND b.title = t.title);

  -- ── EULOGY (skip if one exists) ───────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM eulogies WHERE user_id = uid) THEN
    INSERT INTO eulogies (user_id, content, version_label, written_date) VALUES (
      uid,
      'Anindita Sarker was a kind hearted, honest, empathetic woman who loved to help others in need and be around the people whom she loved. She was always devoted to her morals and values and to education — not academic learning in general — and she always looked forward to bettering herself in all the ways possible. She had an endless thirst of knowledge and tickling hands for making cool stuff. All her life, she devoted herself to make a good life for her family and the needy. She always advocated for sustainable living, reusing trash to form treasure and teach and motivate others to do the same. She built a brand and multiple companies that focused on creative output, expression, sustainable products, agri-tech and robotics with a non profit working towards a better future for ecosystems. She was one of the greatest artists of her time, using her art as a guide and a vessel for growing the things that she held dear. She pursued her MSc in Europe not as an end goal but as a launchpad — building toward companies at the intersection of engineering, design, and sustainability. She achieved financial independence through invention, not employment, within a decade. A Renaissance woman in the truest sense: engineer, designer, artist, inventor. She never left her family''s side and was always present for her mother and father. She might not have been a perfect human being, but she always strived to be a good, loving, caring person and a good daughter, sister and friend.',
      'Original — June 2024',
      '2024-06-25'
    );
  END IF;

  -- ── Update Profile defaults ───────────────────────────────────────────────
  UPDATE profiles SET
    clarity_anchor = COALESCE(clarity_anchor, 'Engineer who thinks like a designer. Inventor, not just engineer. Build things that matter for people who need them.'),
    current_chapter = COALESCE(current_chapter, 'Chapter I: The Foundation')
  WHERE id = uid;

  RAISE NOTICE 'Merge seed complete for user %', uid;
END $$;
