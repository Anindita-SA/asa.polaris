-- ─────────────────────────────────────────────────────────────────────────────
-- POLARIS — COMPLETE Curriculum Seed for Aloka
-- Paste ALL of this into Supabase SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  uid uuid;
  cat_career uuid; cat_academic uuid; cat_self uuid; cat_media uuid;
  cid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'aninditasarker.aloka@gmail.com';
  IF uid IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  -- PURGE everything
  DELETE FROM curriculum_resources WHERE user_id = uid;
  DELETE FROM curriculum_topics WHERE user_id = uid;
  DELETE FROM curricula WHERE user_id = uid;
  DELETE FROM curriculum_categories WHERE user_id = uid;
  DELETE FROM media_log WHERE user_id = uid;
  DELETE FROM curriculum_chapters WHERE user_id = uid;

  -- CATEGORIES
  INSERT INTO curriculum_categories (user_id,title,accent_color,position) VALUES (uid,'Career','#3B82F6',0) RETURNING id INTO cat_career;
  INSERT INTO curriculum_categories (user_id,title,accent_color,position) VALUES (uid,'Academic','#8B5CF6',1) RETURNING id INTO cat_academic;
  INSERT INTO curriculum_categories (user_id,title,accent_color,position) VALUES (uid,'Self','#10B981',2) RETURNING id INTO cat_self;
  INSERT INTO curriculum_categories (user_id,title,accent_color,position) VALUES (uid,'Media & Lit','#F59E0B',3) RETURNING id INTO cat_media;

  -- ═══ CAREER ═══
  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_career,'PCB Design & Hardware','From schematic to manufactured board.',40,0) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'KiCad project setup and library management',2,true,0),(uid,cid,'Schematic capture — components, nets, power symbols',4,false,1),(uid,cid,'Footprint assignment and custom footprint creation',3,false,2),(uid,cid,'PCB layout — placement, routing, design rules',6,false,3),(uid,cid,'Power path design — switches, protection, LDOs',4,false,4),(uid,cid,'Thermal management and via arrays',3,false,5),(uid,cid,'Design for manufacture — DFM checklist',3,false,6),(uid,cid,'BOM generation and JLCPCB ordering workflow',2,false,7),(uid,cid,'Design review and documentation for portfolio',3,false,8);
  INSERT INTO curriculum_resources (user_id,curriculum_id,title,resource_type) VALUES (uid,cid,'TIDA-010054 reference design','article'),(uid,cid,'Phil''s Lab YouTube','video'),(uid,cid,'Altium Academy free content','course');

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_career,'Portfolio & Design Thinking','Building a portfolio that tells engineering stories.',25,1) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'What makes a great engineering portfolio',2,true,0),(uid,cid,'Problem → Process → Outcome framework',2,false,1),(uid,cid,'Technical photography and diagram creation',3,false,2),(uid,cid,'Writing case studies for non-engineers',3,false,3),(uid,cid,'MDX and Astro — building portfolio site',4,false,4),(uid,cid,'Design thinking fundamentals — IDEO',3,false,5),(uid,cid,'User research and prototyping basics',3,false,6),(uid,cid,'Presentation and pitch',2,false,7);
  INSERT INTO curriculum_resources (user_id,curriculum_id,title,resource_type) VALUES (uid,cid,'TU Delft IPD portfolio examples','article'),(uid,cid,'IDEO design thinking toolkit','article');

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_career,'MSc Application Strategy','Everything from program research to submitted application.',30,2) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Mapping programs — fit, requirements, funding',3,true,0),(uid,cid,'Statement of Purpose — structure',4,false,1),(uid,cid,'Writing a research proposal',3,false,2),(uid,cid,'CV for European MSc applications',2,false,3),(uid,cid,'Cold email strategy for faculty',2,false,4),(uid,cid,'IELTS preparation — test strategy',4,false,5),(uid,cid,'MOI and document logistics — NIT Trichy',2,false,6),(uid,cid,'Scholarship research and application',3,false,7),(uid,cid,'Interview preparation',2,false,8);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_career,'Research & Academic Writing','From reading papers to publishing them.',35,3) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'How to read a research paper efficiently',2,true,0),(uid,cid,'Literature review methodology',4,false,1),(uid,cid,'Research question formulation',2,false,2),(uid,cid,'Academic writing style — clarity, precision',3,false,3),(uid,cid,'DAB converter control strategies — content',6,false,4),(uid,cid,'IEEE paper structure and formatting',3,false,5),(uid,cid,'Citation management — Zotero workflow',2,false,6),(uid,cid,'Peer review process',2,false,7),(uid,cid,'Submission strategy — journal selection',2,false,8);

  -- ═══ ACADEMIC ═══
  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_academic,'Power Electronics — DAB Deep Dive','Research-level understanding of DAB converters.',45,4) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'DAB converter fundamentals — topology',4,true,0),(uid,cid,'Single Phase Shift modulation',3,false,1),(uid,cid,'Extended and Dual Phase Shift',3,false,2),(uid,cid,'Triple Active Bridge and multi-port',3,false,3),(uid,cid,'Small signal modeling and control design',5,false,4),(uid,cid,'MATLAB/Simulink simulation workflow',4,false,5),(uid,cid,'Thermal modeling for DAB',3,false,6),(uid,cid,'MPPT algorithms for PV integration',3,false,7),(uid,cid,'Bidirectional converter applications — V2G',3,false,8);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_academic,'Embedded Systems & Firmware','From C basics to RTOS.',40,5) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'C for embedded — pointers, memory, bits',4,true,0),(uid,cid,'Microcontroller architecture — STM32',3,false,1),(uid,cid,'GPIO, timers, interrupts',3,false,2),(uid,cid,'UART, SPI, I2C protocols',4,false,3),(uid,cid,'ADC and DAC — precision measurement',3,false,4),(uid,cid,'FreeRTOS basics — tasks, queues',4,false,5),(uid,cid,'Power management in firmware',3,false,6),(uid,cid,'Debugging — JTAG, scope, logic analyzer',3,false,7);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_academic,'Python, ML & AI for Engineers','Practical Python and ML for robotics and research.',50,6) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Python fundamentals — OOP',5,true,0),(uid,cid,'NumPy and Pandas for engineering data',4,false,1),(uid,cid,'Matplotlib and Plotly — visualization',3,false,2),(uid,cid,'Signal processing with SciPy',4,false,3),(uid,cid,'ML fundamentals — scikit-learn',4,false,4),(uid,cid,'Neural networks — PyTorch basics',5,false,5),(uid,cid,'CNNs for image classification',4,false,6),(uid,cid,'Time series forecasting — LSTM',4,false,7),(uid,cid,'ROS2 fundamentals',5,false,8),(uid,cid,'Computer vision with OpenCV',4,false,9);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_academic,'Systems Thinking','The mental model upgrade that connects everything.',20,7) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Stocks, flows, feedback loops',2,true,0),(uid,cid,'Causal loop diagrams',2,false,1),(uid,cid,'Leverage points — where to intervene',2,false,2),(uid,cid,'Resilience and self-organization',2,false,3),(uid,cid,'Systems thinking in engineering design',2,false,4),(uid,cid,'Ecological systems and planetary boundaries',2,false,5),(uid,cid,'Systems thinking in organizations',2,false,6),(uid,cid,'Map your own life as a system',2,false,7);

  -- ═══ SELF ═══
  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Stoicism & Emotional Architecture','Primary texts and actionable daily practice.',30,8) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Meditations — Books I-IV with annotation',4,true,0),(uid,cid,'Epictetus — The Enchiridion',2,false,1),(uid,cid,'Seneca — Letters from a Stoic, selected',3,false,2),(uid,cid,'The dichotomy of control — daily practice',2,false,3),(uid,cid,'Amor fati — loving what is',2,false,4),(uid,cid,'Managing rage — Seneca De Ira',3,false,5),(uid,cid,'Perfectionism as a trap — Stoic antidote',2,false,6),(uid,cid,'Rejection as data — reframing failure',2,false,7),(uid,cid,'Emotional detachment without numbness',2,false,8),(uid,cid,'Building a daily Stoic practice',2,false,9);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Philosophy — Foundations to Nietzsche','From the Greeks to existentialism.',40,9) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Pre-Socratics — the first questions',2,true,0),(uid,cid,'Plato — The Republic, key dialogues',4,false,1),(uid,cid,'Aristotle — Nicomachean Ethics',3,false,2),(uid,cid,'Epistemology — how do we know',3,false,3),(uid,cid,'Descartes and the modern turn',2,false,4),(uid,cid,'Hume and empiricism',2,false,5),(uid,cid,'Kant — what can we know',3,false,6),(uid,cid,'Schopenhauer — will, suffering, art',3,false,7),(uid,cid,'Nietzsche — Beyond Good and Evil',4,false,8),(uid,cid,'Existentialism — Sartre, Camus, Beauvoir',3,false,9),(uid,cid,'Philosophy of science — Popper, Kuhn',3,false,10);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'History & Civilization','Patterns of rise and fracture.',45,10) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Ancient Mesopotamia and Egypt',2,true,0),(uid,cid,'Classical Greece',3,false,1),(uid,cid,'Rome — republic to empire to fall',3,false,2),(uid,cid,'Islamic Golden Age',2,false,3),(uid,cid,'Medieval Europe and the Church',2,false,4),(uid,cid,'Renaissance and the rebirth of the individual',3,false,5),(uid,cid,'Colonialism and its long shadow',3,false,6),(uid,cid,'Industrial Revolution',2,false,7),(uid,cid,'20th century — world wars, decolonization',4,false,8),(uid,cid,'Japan — Edo to modern',4,false,9),(uid,cid,'South Asia — partition and aftermath',3,false,10),(uid,cid,'Contemporary geopolitics',3,false,11);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Japanese Language & Culture','Fixing the method with SRS and real context.',60,11) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Hiragana and Katakana — complete',4,true,0),(uid,cid,'Anki setup — building personal SRS deck',1,false,1),(uid,cid,'JLPT N5 vocabulary — core 800 words',10,false,2),(uid,cid,'Basic sentence structure — SOV, particles',3,false,3),(uid,cid,'Greetings and daily life phrases',3,false,4),(uid,cid,'JLPT N4 vocabulary — next 1500 words',15,false,5),(uid,cid,'Verb conjugation — te/ta/masu forms',4,false,6),(uid,cid,'Reading simple manga — Yotsuba',5,false,7),(uid,cid,'Japanese culture and history',4,false,8),(uid,cid,'Introduction to kanji — radicals method',4,false,9);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Fitness, Nutrition & Physiology','The science behind the Greek goddess physique.',35,12) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Muscle physiology — how hypertrophy works',3,true,0),(uid,cid,'Calisthenics programming — progressive overload',3,false,1),(uid,cid,'Macronutrient fundamentals',3,false,2),(uid,cid,'Micronutrients — iron, calcium, D, B12',2,false,3),(uid,cid,'Type 2 diabetes — management and nutrition',3,false,4),(uid,cid,'Cardiovascular disease — lifestyle factors',2,false,5),(uid,cid,'Spinal injuries — care and mobility',2,false,6),(uid,cid,'Sleep and recovery science',2,false,7),(uid,cid,'Stress and cortisol — effects on body composition',2,false,8);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Personal Finance & FI','Student to financially independent in 10 years.',30,13) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'How money actually works — the basics',2,true,0),(uid,cid,'Budgeting on a student income',2,false,1),(uid,cid,'Understanding compound interest',2,false,2),(uid,cid,'European banking and financial systems',2,false,3),(uid,cid,'Index funds and passive investing',3,false,4),(uid,cid,'How startups are funded',3,false,5),(uid,cid,'Freelancing and consulting income streams',2,false,6),(uid,cid,'Scholarship funding as financial strategy',2,false,7),(uid,cid,'Tax basics — EU differences',2,false,8),(uid,cid,'Building a 10-year FI roadmap',4,false,9);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Observation, Deduction & Vocabulary','The underlying skills that make everything sharper.',25,14) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'The art of close observation',2,true,0),(uid,cid,'Sherlock method — systematic deduction',2,false,1),(uid,cid,'Cognitive biases — what distorts perception',3,false,2),(uid,cid,'Etymology — where words come from',2,false,3),(uid,cid,'Vocabulary acquisition — deliberate method',2,false,4),(uid,cid,'Argument mapping — logic and fallacies',3,false,5),(uid,cid,'Active listening',2,false,6),(uid,cid,'Observation journaling — daily practice',1,false,7),(uid,cid,'Reading body language and context',2,false,8),(uid,cid,'Discernment — separating signal from noise',2,false,9);

  INSERT INTO curricula (user_id,category_id,title,description,estimated_hours,position) VALUES (uid,cat_self,'Writing & Articulation','Writing like Virginia Woolf is the goal.',40,15) RETURNING id INTO cid;
  INSERT INTO curriculum_topics (user_id,curriculum_id,title,estimated_hours,is_recommended_next,position) VALUES
    (uid,cid,'Sentence — the unit of thought',2,true,0),(uid,cid,'Paragraph structure — how ideas move',2,false,1),(uid,cid,'Voice — what it is and how to find yours',3,false,2),(uid,cid,'Reading like a writer — annotating for craft',3,false,3),(uid,cid,'Virginia Woolf — Mrs Dalloway craft study',4,false,4),(uid,cid,'Stream of consciousness technique',2,false,5),(uid,cid,'Essay writing — the personal essay',3,false,6),(uid,cid,'Writing complex ideas for non-experts',3,false,7),(uid,cid,'Editing — the discipline of cutting',2,false,8),(uid,cid,'Substack as writing practice',2,false,9),(uid,cid,'Academic vs personal voice — switching registers',2,false,10);

  -- ═══ MEDIA LOG ═══
  INSERT INTO media_log (user_id,title,author_or_creator,media_type,status,tags) VALUES
    (uid,'Thinking in Systems','Donella Meadows','book','want_to',ARRAY['systems-thinking']),
    (uid,'The Psychology of Money','Morgan Housel','book','want_to',ARRAY['finance']),
    (uid,'Meditations','Marcus Aurelius (Gregory Hays tr.)','book','in_progress',ARRAY['stoicism']),
    (uid,'Mrs Dalloway','Virginia Woolf','book','want_to',ARRAY['writing']),
    (uid,'Sapiens','Yuval Noah Harari','book','want_to',ARRAY['history']),
    (uid,'Bird by Bird','Anne Lamott','book','want_to',ARRAY['writing']),
    (uid,'Letters from a Stoic','Seneca','book','want_to',ARRAY['stoicism']),
    (uid,'Genki I','Eri Banno et al.','book','in_progress',ARRAY['japanese']),
    (uid,'The Simple Path to Wealth','JL Collins','book','want_to',ARRAY['finance']),
    (uid,'How to Think Like a Roman Emperor','Donald Robertson','book','want_to',ARRAY['stoicism']),
    (uid,'The Art of Thinking Clearly','Rolf Dobelli','book','want_to',ARRAY['psychology']),
    (uid,'Beyond Good and Evil','Nietzsche','book','want_to',ARRAY['philosophy']),
    (uid,'Guns Germs and Steel','Jared Diamond','book','want_to',ARRAY['history']),
    (uid,'The Silk Roads','Peter Frankopan','book','want_to',ARRAY['history']),
    (uid,'Yotsuba manga Vol 1','Kiyohiko Azuma','book','want_to',ARRAY['japanese']);

  RAISE NOTICE 'ALL DONE — 4 categories, 16 curricula, 15 media entries seeded!';
END $$;
