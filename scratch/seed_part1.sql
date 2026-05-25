-- ─────────────────────────────────────────────────────────────────────────────
-- POLARIS — Seed Curriculum v2 for Aloka's account
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  uid uuid;
  cat_career uuid;
  cat_academic uuid;
  cat_self uuid;
  cat_media uuid;
  curr_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO uid FROM auth.users WHERE email = 'aninditasarker.aloka@gmail.com';
  IF uid IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  RAISE NOTICE 'User: %', uid;

  -- ── PURGE old data ──
  DELETE FROM curriculum_resources WHERE user_id = uid;
  DELETE FROM curriculum_topics WHERE user_id = uid;
  DELETE FROM curricula WHERE user_id = uid;
  DELETE FROM curriculum_categories WHERE user_id = uid;
  DELETE FROM media_log WHERE user_id = uid;
  -- Also purge old v1 tables if they exist
  DELETE FROM curriculum_chapters WHERE user_id = uid;
  RAISE NOTICE 'Purged old data';

  -- ── INSERT CATEGORIES ──
  INSERT INTO curriculum_categories (user_id, title, accent_color, position) VALUES (uid, 'Career', '#3B82F6', 0) RETURNING id INTO cat_career;
  INSERT INTO curriculum_categories (user_id, title, accent_color, position) VALUES (uid, 'Academic', '#8B5CF6', 1) RETURNING id INTO cat_academic;
  INSERT INTO curriculum_categories (user_id, title, accent_color, position) VALUES (uid, 'Self', '#10B981', 2) RETURNING id INTO cat_self;
  INSERT INTO curriculum_categories (user_id, title, accent_color, position) VALUES (uid, 'Media & Lit', '#F59E0B', 3) RETURNING id INTO cat_media;

  -- ══════════════════════════════════════════════════════════════════════════
  -- CAREER CURRICULA
  -- ══════════════════════════════════════════════════════════════════════════

  -- 1. PCB Design & Hardware
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_career, 'PCB Design & Hardware', 'From schematic to manufactured board — everything needed for CHAARG and beyond.', 40, 0) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'KiCad project setup and library management', 2, true, 0),
    (uid, curr_id, 'Schematic capture — components, nets, power symbols', 4, false, 1),
    (uid, curr_id, 'Footprint assignment and custom footprint creation', 3, false, 2),
    (uid, curr_id, 'PCB layout — placement, routing, design rules', 6, false, 3),
    (uid, curr_id, 'Power path design — switches, protection, LDOs', 4, false, 4),
    (uid, curr_id, 'Thermal management and via arrays', 3, false, 5),
    (uid, curr_id, 'Design for manufacture — tolerances, stackup, DFM checklist', 3, false, 6),
    (uid, curr_id, 'BOM generation and JLCPCB ordering workflow', 2, false, 7),
    (uid, curr_id, 'Design review and documentation for portfolio', 3, false, 8);
  INSERT INTO curriculum_resources (user_id, curriculum_id, title, resource_type) VALUES
    (uid, curr_id, 'TIDA-010054 reference design', 'article'),
    (uid, curr_id, 'Phil''s Lab YouTube', 'video'),
    (uid, curr_id, 'Altium Academy free content', 'course');

  -- 2. Portfolio & Design Thinking
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_career, 'Portfolio & Design Thinking', 'Building a portfolio that tells engineering stories, not just lists projects.', 25, 1) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'What makes a great engineering portfolio — case study structure', 2, true, 0),
    (uid, curr_id, 'Problem → Process → Outcome framework', 2, false, 1),
    (uid, curr_id, 'Technical photography and diagram creation', 3, false, 2),
    (uid, curr_id, 'Writing case studies that non-engineers understand', 3, false, 3),
    (uid, curr_id, 'MDX and Astro — building your portfolio site', 4, false, 4),
    (uid, curr_id, 'Design thinking fundamentals — IDEO framework', 3, false, 5),
    (uid, curr_id, 'User research and prototyping basics', 3, false, 6),
    (uid, curr_id, 'Presentation and pitch — communicating your work', 2, false, 7);
  INSERT INTO curriculum_resources (user_id, curriculum_id, title, resource_type) VALUES
    (uid, curr_id, 'TU Delft IPD portfolio examples', 'article'),
    (uid, curr_id, 'IDEO design thinking toolkit', 'article');

  -- 3. MSc Application Strategy
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_career, 'MSc Application Strategy', 'Everything from program research to submitted application.', 30, 2) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'Mapping programs — fit, requirements, funding', 3, true, 0),
    (uid, curr_id, 'Statement of Purpose — structure and what committees actually read', 4, false, 1),
    (uid, curr_id, 'Writing a research proposal', 3, false, 2),
    (uid, curr_id, 'CV for European MSc applications', 2, false, 3),
    (uid, curr_id, 'Contacting faculty — cold email strategy that works', 2, false, 4),
    (uid, curr_id, 'IELTS preparation — test strategy', 4, false, 5),
    (uid, curr_id, 'MOI and document logistics — NIT Trichy specific', 2, false, 6),
    (uid, curr_id, 'Scholarship research and application', 3, false, 7),
    (uid, curr_id, 'Interview preparation', 2, false, 8);

  -- 4. Research & Academic Writing
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_career, 'Research & Academic Writing', 'From reading papers to publishing them.', 35, 3) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'How to read a research paper efficiently', 2, true, 0),
    (uid, curr_id, 'Literature review methodology', 4, false, 1),
    (uid, curr_id, 'Research question formulation', 2, false, 2),
    (uid, curr_id, 'Academic writing style — clarity, precision, hedging', 3, false, 3),
    (uid, curr_id, 'DAB converter control strategies — technical content', 6, false, 4),
    (uid, curr_id, 'IEEE paper structure and formatting', 3, false, 5),
    (uid, curr_id, 'Citation management — Zotero workflow', 2, false, 6),
    (uid, curr_id, 'Peer review process — how it works, how to respond', 2, false, 7),
    (uid, curr_id, 'Submission strategy — journal selection, cover letter', 2, false, 8);

  -- ══════════════════════════════════════════════════════════════════════════
  -- ACADEMIC CURRICULA
  -- ══════════════════════════════════════════════════════════════════════════

  -- 5. Power Electronics — DAB Deep Dive
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_academic, 'Power Electronics — DAB Deep Dive', 'Everything beyond what the coursework covers, calibrated for research-level understanding.', 45, 4) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'DAB converter fundamentals — topology and operating modes', 4, true, 0),
    (uid, curr_id, 'Single Phase Shift modulation — analysis and limits', 3, false, 1),
    (uid, curr_id, 'Extended Phase Shift and Dual Phase Shift', 3, false, 2),
    (uid, curr_id, 'Triple Active Bridge and multi-port converters', 3, false, 3),
    (uid, curr_id, 'Small signal modeling and control design', 5, false, 4),
    (uid, curr_id, 'MATLAB/Simulink simulation workflow', 4, false, 5),
    (uid, curr_id, 'Thermal modeling for DAB', 3, false, 6),
    (uid, curr_id, 'MPPT algorithms for PV integration', 3, false, 7),
    (uid, curr_id, 'Bidirectional converter applications — V2G, ESS', 3, false, 8);

  -- 6. Embedded Systems & Firmware
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_academic, 'Embedded Systems & Firmware', 'From C basics to RTOS — the firmware side of hardware projects.', 40, 5) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'C for embedded — pointers, memory, bit manipulation', 4, true, 0),
    (uid, curr_id, 'Microcontroller architecture — STM32 family', 3, false, 1),
    (uid, curr_id, 'GPIO, timers, interrupts', 3, false, 2),
    (uid, curr_id, 'UART, SPI, I2C protocols', 4, false, 3),
    (uid, curr_id, 'ADC and DAC — precision measurement', 3, false, 4),
    (uid, curr_id, 'FreeRTOS basics — tasks, queues, semaphores', 4, false, 5),
    (uid, curr_id, 'Power management in firmware', 3, false, 6),
    (uid, curr_id, 'Debugging — JTAG, oscilloscope, logic analyzer', 3, false, 7);

  -- 7. Python, ML & AI for Engineers
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_academic, 'Python, ML & AI for Engineers', 'Practical Python and ML calibrated for robotics, electronics, and research.', 50, 6) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'Python fundamentals — data structures, functions, OOP', 5, true, 0),
    (uid, curr_id, 'NumPy and Pandas for engineering data', 4, false, 1),
    (uid, curr_id, 'Matplotlib and Plotly — visualizing sensor data', 3, false, 2),
    (uid, curr_id, 'Signal processing with SciPy', 4, false, 3),
    (uid, curr_id, 'Machine learning fundamentals — scikit-learn', 4, false, 4),
    (uid, curr_id, 'Neural networks — PyTorch basics', 5, false, 5),
    (uid, curr_id, 'CNNs for image classification — robotics applications', 4, false, 6),
    (uid, curr_id, 'Time series forecasting — LSTM for power systems', 4, false, 7),
    (uid, curr_id, 'ROS2 fundamentals — nodes, topics, services', 5, false, 8),
    (uid, curr_id, 'Computer vision with OpenCV', 4, false, 9);

  -- 8. Systems Thinking
  INSERT INTO curricula (user_id, category_id, title, description, estimated_hours, position)
  VALUES (uid, cat_academic, 'Systems Thinking', 'The mental model upgrade that connects everything.', 20, 7) RETURNING id INTO curr_id;
  INSERT INTO curriculum_topics (user_id, curriculum_id, title, estimated_hours, is_recommended_next, position) VALUES
    (uid, curr_id, 'What is a system — stocks, flows, feedback loops', 2, true, 0),
    (uid, curr_id, 'Causal loop diagrams', 2, false, 1),
    (uid, curr_id, 'Leverage points — where to intervene in a system', 2, false, 2),
    (uid, curr_id, 'Resilience, self-organization, hierarchy', 2, false, 3),
    (uid, curr_id, 'Systems thinking in engineering design', 2, false, 4),
    (uid, curr_id, 'Ecological systems and planetary boundaries', 2, false, 5),
    (uid, curr_id, 'Systems thinking in organizations', 2, false, 6),
    (uid, curr_id, 'Applied exercise — map your own life as a system', 2, false, 7);

  RAISE NOTICE 'Career + Academic done';
END $$;
