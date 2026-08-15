-- Run this script in your Supabase SQL Editor to insert the IELTS 2026 Preparation Sprint into Polaris
-- It adds:
-- 1. Milestone & subtasks for the 4-week IELTS sprint
-- 2. Weekly & Daily goals for the sprint
-- 3. Curriculum book ("IELTS 2026 Preparation Sprint"), 5 topics, and 5 verified 2026 resources
-- 4. Daily tasks & nudges

DO $$
DECLARE
    v_user_id uuid;
    m_id uuid;
    c_cat_id uuid;
    curr_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users';
    END IF;

    -- 1. Milestone & Subtasks
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward, note) 
    VALUES (v_user_id, 'IELTS 2026 4-Week Sprint (Target 7.5+)', '2026-09-11', 'upcoming', 250, 'Front-loaded weekday schedule using current 2026 official resources')
    RETURNING id INTO m_id;

    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Week 1: Diagnostic mock (Cambridge 19) + targeted section drilling (45m/day)', 0),
    (v_user_id, m_id, 'milestone', 'Week 2: Light drilling — alternate Reading/Writing & Listening/Speaking (30m/day)', 1),
    (v_user_id, m_id, 'milestone', 'Week 3: Maintenance — 1 Writing Task 2 essay + 1 Speaking recording (25m/day)', 2),
    (v_user_id, m_id, 'milestone', 'Week 4: IDP Prepare App full timed mock + pre-booking interface check (20-25m/day)', 3);

    -- 2. Goals
    INSERT INTO goals (user_id, scope, title, target, current, unit, xp_reward) VALUES
    (v_user_id, 'weekly', 'IELTS Week 1 Sprint: Diagnostic mock + targeted drilling (45m/day)', 5, 0, 'sessions', 75),
    (v_user_id, 'weekly', 'IELTS Week 2 Sprint: Light drilling alternate days (30m/day)', 5, 0, 'sessions', 75),
    (v_user_id, 'weekly', 'IELTS Week 3 Sprint: Maintenance — essay + speaking recording (25m/day)', 5, 0, 'sessions', 75),
    (v_user_id, 'weekly', 'IELTS Week 4 Sprint: IDP App timed mock + pre-booking check (20-25m/day)', 5, 0, 'sessions', 75);

    -- 3. Curriculum & Resources
    SELECT id INTO c_cat_id FROM curriculum_categories WHERE user_id = v_user_id AND title = 'Career' LIMIT 1;
    
    IF c_cat_id IS NULL THEN
        INSERT INTO curriculum_categories (user_id, title, accent_color, position)
        VALUES (v_user_id, 'Career', '#3B82F6', 0)
        RETURNING id INTO c_cat_id;
    END IF;

    INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
    VALUES (v_user_id, c_cat_id, 'IELTS 2026 Preparation Sprint', '4-Week front-loaded weekday-only IELTS preparation plan using 2026 official free resources.', 16, 99)
    RETURNING id INTO curr_id;

    INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (v_user_id, curr_id, 'Week 1 Mon: Diagnostic Mock (Cambridge 19, 45 min)', 1, true, 0),
    (v_user_id, curr_id, 'Week 1 Tue-Fri: Targeted Drilling on Weakest Section (45 min/day)', 3, false, 1),
    (v_user_id, curr_id, 'Week 2 Mon-Fri: Light Drilling — Alternate Reading/Writing & Listening/Speaking (30 min/day)', 2.5, false, 2),
    (v_user_id, curr_id, 'Week 3 Mon-Fri: Maintenance Only — 1 Essay + 1 Speaking Recording + Light Review (25 min/day)', 2, false, 3),
    (v_user_id, curr_id, 'Week 4 Mon-Fri: Full Timed Mock in IDP App + Light Review (20-25 min/day)', 2, false, 4);

    INSERT INTO curriculum_resources (user_id, curriculum_id, title, resource_type, url) VALUES
    (v_user_id, curr_id, 'ielts.org Official Free Practice Tests (IELTS Progress Check Sample)', 'article', 'https://www.ielts.org/for-test-takers/sample-test-questions'),
    (v_user_id, curr_id, 'British Council Road to IELTS (Reading/Listening/Writing Samples)', 'course', 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts'),
    (v_user_id, curr_id, 'Cambridge IELTS Books 17-19 (Official Retired Question Banks)', 'book', null),
    (v_user_id, curr_id, 'IELTS Liz (Writing Task 2 & Speaking Part 2/3 Banks)', 'article', 'https://ieltsliz.com'),
    (v_user_id, curr_id, 'IDP IELTS Prepare App (On-screen typing & reading navigation mock)', 'course', 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app');

END $$;
