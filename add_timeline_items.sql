-- Run this script in your Supabase SQL Editor to add the items directly to your timeline.
-- It assumes you are the primary user. If you have multiple users, replace the subquery
-- (SELECT id FROM auth.users LIMIT 1) with your specific user_id.

DO $$
DECLARE
    v_user_id uuid;
    m_id uuid;
BEGIN
    -- Get the user ID (assuming you are the main/only user)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users';
    END IF;

    -- Late July 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Portfolio graphics: deploy concrete-speaker.mdx properly, add visuals', '2026-07-28', 'upcoming', 150);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Concept product sketches (3-4, process-focused) for portfolio', '2026-07-28', 'upcoming', 100);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Polaris bug triage, fix only what blocks daily use', '2026-07-28', 'upcoming', 50);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Pin down EE/Robotics program at TU Delft', '2026-07-28', 'upcoming', 100)
    RETURNING id INTO m_id;
    
    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Find exact program name', 0),
    (v_user_id, m_id, 'milestone', 'Check specific requirements', 1),
    (v_user_id, m_id, 'milestone', 'Check if GRE is required', 2),
    (v_user_id, m_id, 'milestone', 'Verify if specific thesis topics are needed', 3);

    -- Early August 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Resume CHAARG, finish KiCad schematic to PCB-ready', '2026-08-10', 'upcoming', 150)
    RETURNING id INTO m_id;

    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Review current KiCad schematic', 0),
    (v_user_id, m_id, 'milestone', 'Complete schematic wiring', 1),
    (v_user_id, m_id, 'milestone', 'Assign missing footprints', 2),
    (v_user_id, m_id, 'milestone', 'Run ERC checks', 3);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Swedish Institute Scholarship opens, check eligibility and requirements', '2026-08-10', 'upcoming', 50);

    -- August 2026 (hard deadline)
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'DAB survey paper submission to Energies (MDPI)', '2026-08-31', 'upcoming', 250)
    RETURNING id INTO m_id;

    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Finalize manuscript content', 0),
    (v_user_id, m_id, 'milestone', 'Format to MDPI Energies template', 1),
    (v_user_id, m_id, 'milestone', 'Submit paper', 2);

    -- September 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'IELTS retake (or confirm MOI certificate waiver covers target countries)', '2026-09-30', 'upcoming', 150);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Design thinking + embedded certs, self-paced background work', '2026-09-30', 'upcoming', 150)
    RETURNING id INTO m_id;

    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Complete self-paced background work', 0),
    (v_user_id, m_id, 'milestone', 'Finish design thinking cert', 1),
    (v_user_id, m_id, 'milestone', 'Finish embedded cert', 2);

    -- Early October 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'MOI certificate from NIT Trichy registrar', '2026-10-10', 'upcoming', 50);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'CGPA conversion certificate from registrar', '2026-10-10', 'upcoming', 50);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Europass CV creation', '2026-10-10', 'upcoming', 100);

    -- 15 October 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Studielink opens, both TU Delft applications (IPD + EE/Robotics) can begin', '2026-10-15', 'upcoming', 100)
    RETURNING id INTO m_id;

    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Create Studielink account/login', 0),
    (v_user_id, m_id, 'milestone', 'Start IPD application', 1),
    (v_user_id, m_id, 'milestone', 'Start EE/Robotics application', 2);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Erasmus Mundus catalogue opens for Sept 2027 intake', '2026-10-15', 'upcoming', 50);

    -- November 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'GOI-IES Ireland scholarship deadline', '2026-11-30', 'upcoming', 100);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Portfolio should be fully swapped by now (no placeholders left)', '2026-11-30', 'upcoming', 200)
    RETURNING id INTO m_id;

    INSERT INTO subtasks (user_id, parent_id, parent_type, title, position) VALUES
    (v_user_id, m_id, 'milestone', 'Review all case studies', 0),
    (v_user_id, m_id, 'milestone', 'Remove any placeholder text/images', 1),
    (v_user_id, m_id, 'milestone', 'Final polish for committee review', 2);

    -- Before December 2026
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'EE-track SOP fully drafted (separate from IPD design SOP)', '2026-11-30', 'upcoming', 150);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'Check any EM scholarship deadlines (usually Dec-early Jan)', '2026-11-30', 'upcoming', 50);

    -- 15 January 2027 (hard deadline)
    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'TU Delft priority deadline: both IPD and EE/Robotics applications due', '2027-01-15', 'upcoming', 300);

    INSERT INTO milestones (user_id, title, deadline, status, xp_reward) 
    VALUES (v_user_id, 'NL Scholarship application due', '2027-01-15', 'upcoming', 150);

END $$;
