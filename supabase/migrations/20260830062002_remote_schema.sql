SET local check_function_bodies = off;

CREATE TABLE "public"."backburner" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"          uuid                     NOT NULL,
  "title"            text                     NOT NULL,
  "why_deferred"     text,
  "context_snapshot" text,
  "revisit_after"    date,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "backburner_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."backburner"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."brief_sources" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        uuid                     NOT NULL,
  "name"           text                     NOT NULL,
  "url"            text                     NOT NULL,
  "type"           text,
  "active"         boolean                  DEFAULT true,
  "created_at"     timestamp with time zone DEFAULT now(),
  "manual_summary" text,
  CONSTRAINT "brief_sources_pkey" PRIMARY KEY (id),
  CONSTRAINT "brief_sources_type_check" CHECK ((type = ANY (ARRAY['curated'::text, 'fixed'::text])))
);

ALTER TABLE "public"."brief_sources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."calendar_backups" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"         uuid                     NOT NULL,
  "snapshot_name"   text                     NOT NULL,
  "event_count"     integer                  DEFAULT 0,
  "raw_ics_content" text,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "calendar_backups_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."calendar_backups"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."calendar_events" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"       uuid                     NOT NULL,
  "gcal_event_id" text,
  "summary"       text                     NOT NULL,
  "description"   text,
  "start_time"    timestamp with time zone NOT NULL,
  "end_time"      timestamp with time zone NOT NULL,
  "is_all_day"    boolean                  DEFAULT false,
  "color_id"      text,
  "location"      text,
  "source"        text                     DEFAULT 'gcal'::text,
  "status"        text                     DEFAULT 'confirmed'::text,
  "raw_payload"   jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."calendar_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."contacts" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "name"              text                     NOT NULL,
  "tier"              text                     NOT NULL,
  "category"          text,
  "frequency_days"    integer                  NOT NULL,
  "last_contacted_at" date,
  "contact_number"    text,
  "social_handle"     text,
  "notes"             text,
  "gcal_event_id"     text,
  "active"            boolean                  DEFAULT true,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "contacts_pkey" PRIMARY KEY (id),
  CONSTRAINT "contacts_tier_check" CHECK ((tier = ANY (ARRAY['hearth'::text, 'parlour'::text, 'porch'::text, 'yard'::text])))
);

ALTER TABLE "public"."contacts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."curricula" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"         uuid                     NOT NULL,
  "category_id"     uuid,
  "title"           text                     NOT NULL,
  "description"     text,
  "cover_url"       text,
  "banner_url"      text,
  "estimated_hours" integer,
  "position"        integer                  DEFAULT 0,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "curricula_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."curricula"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."curriculum_categories" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"      uuid                     NOT NULL,
  "title"        text                     NOT NULL,
  "accent_color" text,
  "position"     integer                  DEFAULT 0,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "curriculum_categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."curriculum_categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."curriculum_chapters" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"     uuid                     NOT NULL,
  "title"       text                     NOT NULL,
  "description" text,
  "node_title"  text,
  "position"    integer                  DEFAULT 0,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "curriculum_chapters_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."curriculum_chapters"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."curriculum_resources" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"        uuid                     NOT NULL,
  "curriculum_id"  uuid,
  "title"          text                     NOT NULL,
  "author"         text,
  "resource_type"  text                     DEFAULT 'book'::text,
  "url"            text,
  "recommended_by" text,
  "notes"          text,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "curriculum_resources_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."curriculum_resources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."curriculum_topics" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"             uuid                     NOT NULL,
  "chapter_id"          uuid,
  "title"               text                     NOT NULL,
  "description"         text,
  "status"              text                     DEFAULT 'not_started'::text,
  "position"            integer                  DEFAULT 0,
  "created_at"          timestamp with time zone DEFAULT now(),
  "curriculum_id"       uuid,
  "estimated_hours"     numeric,
  "is_recommended_next" boolean                  DEFAULT false,
  "date_started"        date,
  "date_completed"      date,
  "notes"               text,
  CONSTRAINT "curriculum_topics_pkey" PRIMARY KEY (id),
  CONSTRAINT "curriculum_topics_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'done'::text])))
);

ALTER TABLE "public"."curriculum_topics"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."custom_foods" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "portion"     text                     DEFAULT ''::text,
  "protein"     numeric                  DEFAULT 0,
  "carbs"       numeric                  DEFAULT 0,
  "fat"         numeric                  DEFAULT 0,
  "kcal"        numeric                  DEFAULT 0,
  "cost"        numeric                  DEFAULT 0,
  "is_homemade" boolean                  DEFAULT false,
  "sort_order"  integer                  DEFAULT 0,
  "active"      boolean                  DEFAULT true,
  "created_at"  timestamp with time zone DEFAULT now(),
  "ai_grade"    text                     DEFAULT '—'::text,
  "health_tags" jsonb                    DEFAULT '[]'::jsonb,
  "fiber"       numeric                  DEFAULT 0,
  "iron"        numeric                  DEFAULT 0,
  "calcium"     numeric                  DEFAULT 0,
  "vitamin_c"   numeric                  DEFAULT 0,
  "vitamin_d"   numeric                  DEFAULT 0,
  "vitamin_b12" numeric                  DEFAULT 0,
  CONSTRAINT "custom_foods_pkey" PRIMARY KEY (id),
  "user_id"     uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."custom_foods"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."custom_recipes" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"         text                     NOT NULL,
  "ingredients"  jsonb                    DEFAULT '[]'::jsonb,
  "instructions" text                     DEFAULT ''::text,
  "protein"      numeric                  DEFAULT 0,
  "carbs"        numeric                  DEFAULT 0,
  "fat"          numeric                  DEFAULT 0,
  "kcal"         numeric                  DEFAULT 0,
  "cost"         numeric                  DEFAULT 0,
  "active"       boolean                  DEFAULT true,
  "created_at"   timestamp with time zone DEFAULT now(),
  "user_id"      uuid                     NOT NULL,
  CONSTRAINT "custom_recipes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."custom_recipes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."daily_tasks" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "title"      text                     NOT NULL,
  "completed"  boolean                  DEFAULT false,
  "date"       date                     DEFAULT CURRENT_DATE,
  "created_at" timestamp with time zone DEFAULT now(),
  "recurring"  boolean                  DEFAULT false,
  CONSTRAINT "daily_tasks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."daily_tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."day_plan_blocks" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "log_date"         date                     NOT NULL,
  "start_time"       text                     NOT NULL,
  "duration_minutes" integer                  NOT NULL,
  "title"            text                     NOT NULL,
  "type"             text                     NOT NULL,
  "source_type"      text,
  "source_id"        uuid,
  "done"             boolean                  NOT NULL DEFAULT false,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "day_plan_blocks_pkey" PRIMARY KEY (id),
  "user_id"          uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."day_plan_blocks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."eulogies" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"       uuid                     NOT NULL,
  "content"       text                     NOT NULL,
  "version_label" text,
  "written_date"  date                     DEFAULT CURRENT_DATE,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "eulogies_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."eulogies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."fitness_logs" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"         uuid,
  "log_date"        date                     NOT NULL,
  "steps"           integer                  DEFAULT 0,
  "active_calories" integer                  DEFAULT 0,
  "exercise_count"  integer                  DEFAULT 0,
  "created_at"      timestamp with time zone DEFAULT now(),
  "distance_km"     double precision         DEFAULT 0,
  CONSTRAINT "fitness_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "fitness_logs_user_id_log_date_key" UNIQUE (user_id, log_date)
);

ALTER TABLE "public"."fitness_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."focus_items" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "title"      text                     NOT NULL,
  "category"   text,
  "why_now"    text,
  "status"     text                     DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "position"   integer                  DEFAULT 0,
  CONSTRAINT "focus_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."focus_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."goals" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"         uuid                     NOT NULL,
  "node_id"         uuid,
  "scope"           text,
  "title"           text                     NOT NULL,
  "target"          numeric                  NOT NULL,
  "current"         numeric                  DEFAULT 0,
  "unit"            text,
  "xp_reward"       integer                  DEFAULT 50,
  "completed"       boolean                  DEFAULT false,
  "created_at"      timestamp with time zone DEFAULT now(),
  "parent_goal_id"  uuid,
  "reminder_time"   timestamp with time zone,
  "google_event_id" text,
  "description"     text,
  "deadline"        date,
  "google_task_id"  text,
  CONSTRAINT "goals_pkey" PRIMARY KEY (id),
  CONSTRAINT "goals_scope_check" CHECK ((scope = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text, '5yr'::text, 'side_quest'::text])))
);

ALTER TABLE "public"."goals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."habit_logs" (
  "id"        uuid    NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"   uuid    NOT NULL,
  "habit_id"  uuid,
  "date"      date    DEFAULT CURRENT_DATE,
  "completed" boolean DEFAULT true,
  CONSTRAINT "habit_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "habit_logs_user_id_habit_id_date_key" UNIQUE (user_id, habit_id, date)
);

ALTER TABLE "public"."habit_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."habits" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "title"      text                     NOT NULL,
  "frequency"  text                     DEFAULT 'daily'::text,
  "xp_reward"  integer                  DEFAULT 10,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "habits_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."habits"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."hardware_opportunities" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "title"             text                     NOT NULL,
  "url"               text,
  "deadline"          date,
  "effort"            text,
  "project_fit"       text,
  "what_offered"      text,
  "application_draft" text,
  "status"            text                     DEFAULT 'new'::text,
  "task_id"           uuid,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "hardware_opportunities_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."hardware_opportunities"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."highlights" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "date"       date                     DEFAULT CURRENT_DATE,
  "text"       text,
  "photo_url"  text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "highlights_pkey" PRIMARY KEY (id),
  CONSTRAINT "highlights_user_id_date_key" UNIQUE (user_id, date)
);

ALTER TABLE "public"."highlights"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."io_logs" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "type"       text                     NOT NULL,
  "category"   text                     NOT NULL,
  "minutes"    integer                  NOT NULL,
  "date"       date                     DEFAULT CURRENT_DATE,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "io_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "io_logs_type_check" CHECK ((type = ANY (ARRAY['input'::text, 'output'::text])))
);

ALTER TABLE "public"."io_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meal_logs" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "logged_at"   timestamp with time zone DEFAULT now(),
  "log_date"    date                     NOT NULL,
  "food_id"     text,
  "food_name"   text                     NOT NULL,
  "protein"     numeric                  NOT NULL DEFAULT 0,
  "carbs"       numeric                  NOT NULL DEFAULT 0,
  "fat"         numeric                  NOT NULL DEFAULT 0,
  "kcal"        numeric                  NOT NULL DEFAULT 0,
  "meal_tag"    text                     DEFAULT ''::text,
  "fiber"       numeric                  DEFAULT 0,
  "iron"        numeric                  DEFAULT 0,
  "calcium"     numeric                  DEFAULT 0,
  "vitamin_c"   numeric                  DEFAULT 0,
  "vitamin_d"   numeric                  DEFAULT 0,
  "vitamin_b12" numeric                  DEFAULT 0,
  "cost"        numeric                  DEFAULT 0,
  "ai_grade"    text                     DEFAULT '—'::text,
  "health_tags" jsonb                    DEFAULT '[]'::jsonb,
  CONSTRAINT "meal_logs_pkey" PRIMARY KEY (id),
  "user_id"     uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."meal_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."media_log" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"           uuid                     NOT NULL,
  "title"             text                     NOT NULL,
  "author_or_creator" text,
  "media_type"        text,
  "status"            text                     DEFAULT 'want_to'::text,
  "date_started"      date,
  "date_finished"     date,
  "recommended_by"    text,
  "rating"            integer,
  "one_line_takeaway" text,
  "full_review"       text,
  "tags"              text[],
  "cover_url"         text,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "media_log_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."media_log"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."milestones" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "title"      text                     NOT NULL,
  "deadline"   date                     NOT NULL,
  "status"     text                     DEFAULT 'upcoming'::text,
  "note"       text,
  "xp_reward"  integer                  DEFAULT 100,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "milestones_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."milestones"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mini_games" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "title"      text                     NOT NULL,
  "url"        text                     NOT NULL,
  "type"       text                     NOT NULL,
  "icon"       text,
  "category"   text,
  "active"     boolean                  DEFAULT true,
  "sort_order" integer                  DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "mini_games_pkey" PRIMARY KEY (id),
  CONSTRAINT "mini_games_type_check" CHECK ((type = ANY (ARRAY['link'::text, 'embed'::text])))
);

ALTER TABLE "public"."mini_games"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mood_logs" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "logged_at"    timestamp with time zone DEFAULT now(),
  "log_date"     date                     NOT NULL,
  "mood"         text,
  "energy"       text,
  "anxiety"      text,
  "menstruating" boolean                  DEFAULT false,
  "mood_score"   smallint,
  "energy_score" smallint,
  "stress_score" smallint,
  CONSTRAINT "mood_logs_pkey" PRIMARY KEY (id),
  "user_id"      uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."mood_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."morning_briefs" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "date"       date                     NOT NULL,
  "items"      jsonb,
  "seen"       boolean                  DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "morning_briefs_pkey" PRIMARY KEY (id),
  CONSTRAINT "morning_briefs_user_id_date_key" UNIQUE (user_id, date)
);

ALTER TABLE "public"."morning_briefs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."nodes" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"     uuid                     NOT NULL,
  "parent_id"   uuid,
  "type"        text,
  "title"       text                     NOT NULL,
  "description" text,
  "x_pos"       double precision,
  "y_pos"       double precision,
  "status"      text                     DEFAULT 'active'::text,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "nodes_pkey" PRIMARY KEY (id),
  CONSTRAINT "nodes_type_check" CHECK ((type = ANY (ARRAY['career'::text, 'academic'::text, 'self'::text, 'root'::text, 'subnode'::text, 'topic'::text])))
);

ALTER TABLE "public"."nodes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."nudges" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"          uuid                     NOT NULL,
  "title"            text                     NOT NULL,
  "interval_minutes" integer                  NOT NULL,
  "active"           boolean                  DEFAULT true,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "nudges_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."nudges"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."plan_exercises" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "plan_id"    uuid,
  "name"       text                     NOT NULL,
  "sets"       text                     DEFAULT ''::text,
  "target"     text                     DEFAULT ''::text,
  "badge"      text                     DEFAULT 'safe'::text,
  "sort_order" integer                  DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "plan_exercises_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."plan_exercises"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pomodoro_logs" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"          uuid                     NOT NULL,
  "date"             date                     DEFAULT CURRENT_DATE,
  "duration_minutes" integer                  NOT NULL,
  "node_id"          uuid,
  "label"            text,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "pomodoro_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."pomodoro_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"              uuid                     NOT NULL,
  "clarity_anchor"  text                     DEFAULT 'Engineer who thinks like a designer.'::text,
  "current_chapter" text                     DEFAULT 'Chapter I: The Foundation'::text,
  "xp"              integer                  DEFAULT 0,
  "level"           integer                  DEFAULT 1,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."push_subscriptions" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid                     NOT NULL,
  "endpoint"   text                     NOT NULL,
  "p256dh"     text                     NOT NULL,
  "auth"       text                     NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE (user_id, endpoint)
);

ALTER TABLE "public"."push_subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recurring_task_templates" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             uuid                     NOT NULL,
  "title"               text                     NOT NULL,
  "notes"               text,
  "quadrant"            text                     DEFAULT 'important_not_urgent'::text,
  "estimated_minutes"   integer                  DEFAULT 30,
  "frequency"           text                     DEFAULT 'daily'::text,
  "last_generated_date" date,
  "is_active"           boolean                  DEFAULT true,
  "created_at"          timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "recurring_task_templates_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."recurring_task_templates"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."rejection_challenge" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"          uuid                     NOT NULL,
  "target_score"     integer                  NOT NULL,
  "period_days"      integer                  NOT NULL,
  "cycle_start_date" date                     NOT NULL,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "rejection_challenge_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."rejection_challenge"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."rejections" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "text"       text                     NOT NULL,
  "weight"     integer                  NOT NULL,
  "log_date"   date,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "rejections_pkey" PRIMARY KEY (id),
  CONSTRAINT "rejections_weight_check" CHECK ((weight = ANY (ARRAY[1, 3, 5])))
);

ALTER TABLE "public"."rejections"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ritual_items" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"     uuid                     NOT NULL,
  "title"       text                     NOT NULL,
  "time_of_day" text,
  "position"    integer                  DEFAULT 0,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "ritual_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "ritual_items_time_of_day_check" CHECK ((time_of_day = ANY (ARRAY['morning'::text, 'anytime'::text, 'evening'::text])))
);

ALTER TABLE "public"."ritual_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ritual_logs" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"      uuid                     NOT NULL,
  "item_id"      uuid,
  "date"         date                     DEFAULT CURRENT_DATE,
  "completed_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "ritual_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "ritual_logs_user_id_item_id_date_key" UNIQUE (user_id, item_id, date)
);

ALTER TABLE "public"."ritual_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sleep_logs" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "log_date"   date                     NOT NULL,
  "hours"      numeric(4,2)             NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "sleep_logs_pkey" PRIMARY KEY (id),
  "user_id"    uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."sleep_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."subtasks" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"     uuid                     NOT NULL,
  "parent_id"   uuid,
  "parent_type" text,
  "title"       text                     NOT NULL,
  "completed"   boolean                  DEFAULT false,
  "position"    integer                  DEFAULT 0,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "subtasks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."subtasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplement_logs" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "logged_at"     timestamp with time zone DEFAULT now(),
  "log_date"      date                     NOT NULL,
  "supplement_id" uuid,
  "taken"         boolean                  DEFAULT true,
  "cost"          numeric                  DEFAULT 0,
  CONSTRAINT "supplement_logs_pkey" PRIMARY KEY (id),
  "user_id"       uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."supplement_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplements" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"          text                     NOT NULL,
  "dose"          text,
  "timing"        text                     DEFAULT 'evening'::text,
  "active"        boolean                  DEFAULT true,
  "sort_order"    integer                  DEFAULT 0,
  "protein"       numeric                  DEFAULT 0,
  "carbs"         numeric                  DEFAULT 0,
  "fat"           numeric                  DEFAULT 0,
  "kcal"          numeric                  DEFAULT 0,
  "fiber"         numeric                  DEFAULT 0,
  "iron"          numeric                  DEFAULT 0,
  "calcium"       numeric                  DEFAULT 0,
  "vitamin_c"     numeric                  DEFAULT 0,
  "user_id"       uuid                     NOT NULL,
  "cost"          numeric                  DEFAULT 0,
  "is_medication" boolean                  DEFAULT false,
  "schedule_time" text,
  "deleted_at"    timestamp with time zone,
  CONSTRAINT "supplements_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supplements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tasks" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "title"              text                     NOT NULL,
  "notes"              text,
  "quadrant"           text,
  "deadline"           date,
  "estimated_minutes"  integer,
  "estimate_source"    text,
  "status"             text                     NOT NULL DEFAULT 'inbox'::text,
  "created_at"         timestamp with time zone DEFAULT now(),
  "scheduled_day"      text,
  "day_position"       integer                  DEFAULT 0,
  "source_template_id" uuid,
  CONSTRAINT "tasks_estimate_source_check" CHECK (((estimate_source IS NULL) OR (estimate_source = ANY (ARRAY['user'::text, 'ai'::text])))),
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_quadrant_check"
    CHECK (((quadrant IS NULL) OR (quadrant = ANY (ARRAY['urgent_important'::text, 'important_not_urgent'::text, 'urgent_not_important'::text, 'neither'::text])))),
  CONSTRAINT "tasks_scheduled_day_check"
    CHECK
    (((scheduled_day IS NULL) OR (scheduled_day = ANY (ARRAY['monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text, 'friday'::text, 'saturday'::text,
    'sunday'::text])))),
  CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['inbox'::text, 'active'::text, 'in_progress'::text, 'scheduled'::text, 'done'::text]))),
  "user_id"            uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_integrations" (
  "user_id"              uuid                     NOT NULL,
  "google_refresh_token" text,
  "updated_at"           timestamp with time zone DEFAULT now(),
  CONSTRAINT "user_integrations_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."user_integrations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_settings" (
  "id"              integer NOT NULL DEFAULT 1,
  "health_profile"  text    DEFAULT ''::text,
  "birth_year"      integer,
  "gender"          text,
  "weight"          numeric,
  "height"          numeric,
  "activity_level"  text,
  "sync_cycle"      boolean DEFAULT true,
  "goals"           text    DEFAULT ''::text,
  "conditions"      text    DEFAULT ''::text,
  "restrictions"    text    DEFAULT ''::text,
  "allergens"       text    DEFAULT ''::text,
  "dislikes"        text    DEFAULT ''::text,
  "likes"           text    DEFAULT ''::text,
  "ai_report"       text    DEFAULT ''::text,
  "ai_report_days"  text    DEFAULT ''::text,
  "name"            text    DEFAULT ''::text,
  "reminder_time_1" text    DEFAULT '09:00'::text,
  "reminder_time_2" text    DEFAULT '14:00'::text,
  "reminder_time_3" text    DEFAULT '20:00'::text,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY (id),
  "user_id"         uuid    DEFAULT auth.uid()
);

ALTER TABLE "public"."user_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."water_logs" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "log_date"   date                     NOT NULL,
  "amount_ml"  integer                  NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "water_logs_pkey" PRIMARY KEY (id),
  "user_id"    uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."water_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."weekly_reports" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "week_start"   date                     NOT NULL,
  "week_end"     date                     NOT NULL,
  "report_json"  jsonb,
  "generated_at" timestamp with time zone DEFAULT now(),
  "user_id"      uuid                     NOT NULL,
  CONSTRAINT "weekly_reports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."weekly_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."weight_logs" (
  "id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "logged_at" timestamp with time zone DEFAULT now(),
  "log_date"  date                     NOT NULL,
  "weight_kg" numeric                  NOT NULL,
  CONSTRAINT "weight_logs_pkey" PRIMARY KEY (id),
  "user_id"   uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."weight_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."wins" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "text"       text                     NOT NULL,
  "size"       text                     NOT NULL,
  "node_id"    uuid,
  "log_date"   date                     DEFAULT CURRENT_DATE,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "wins_pkey" PRIMARY KEY (id),
  CONSTRAINT "wins_size_check" CHECK ((size = ANY (ARRAY['micro'::text, 'big'::text])))
);

ALTER TABLE "public"."wins"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workout_goals" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "day_type"      text                     NOT NULL,
  "exercise_name" text                     NOT NULL,
  "target_sets"   integer,
  "target_reps"   text,
  "personal_best" text,
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "workout_goals_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."workout_goals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workout_logs" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "logged_at"        timestamp with time zone DEFAULT now(),
  "log_date"         date                     NOT NULL,
  "day_type"         text                     NOT NULL,
  "done"             boolean                  DEFAULT true,
  "plan_exercise_id" uuid,
  CONSTRAINT "workout_logs_pkey" PRIMARY KEY (id),
  "user_id"          uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."workout_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workout_performance" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "logged_at"     timestamp with time zone DEFAULT now(),
  "log_date"      date                     NOT NULL,
  "day_type"      text                     NOT NULL,
  "exercise_name" text                     NOT NULL,
  "sets_done"     integer,
  "reps_done"     text,
  "notes"         text,
  CONSTRAINT "workout_performance_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."workout_performance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workout_plans" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "description" text                     DEFAULT ''::text,
  "days"        integer[]                DEFAULT '{}'::integer[],
  "sort_order"  integer                  DEFAULT 0,
  "active"      boolean                  DEFAULT true,
  "created_at"  timestamp with time zone DEFAULT now(),
  "user_id"     uuid                     NOT NULL,
  CONSTRAINT "workout_plans_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."workout_plans"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_xp (
  user_id uuid,
  amount  integer
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  UPDATE profiles
  SET xp = GREATEST(0, xp + amount)
  WHERE id = user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_calendar_event (
  p_user_id       uuid,
  p_gcal_event_id text,
  p_summary       text,
  p_description   text,
  p_start_time    timestamp with time zone,
  p_end_time      timestamp with time zone,
  p_is_all_day    boolean,
  p_color_id      text,
  p_source        text,
  p_status        text
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF p_gcal_event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM calendar_events WHERE user_id = p_user_id AND gcal_event_id = p_gcal_event_id
  ) THEN
    UPDATE calendar_events
    SET 
      summary = p_summary,
      description = p_description,
      start_time = p_start_time,
      end_time = p_end_time,
      is_all_day = p_is_all_day,
      color_id = p_color_id,
      source = p_source,
      status = p_status,
      updated_at = now()
    WHERE user_id = p_user_id AND gcal_event_id = p_gcal_event_id;
  ELSE
    INSERT INTO calendar_events (
      user_id, gcal_event_id, summary, description, start_time, end_time, is_all_day, color_id, source, status
    ) VALUES (
      p_user_id, p_gcal_event_id, p_summary, p_description, p_start_time, p_end_time, p_is_all_day, p_color_id, p_source, p_status
    );
  END IF;
END;
$function$;

ALTER TABLE "public"."backburner"
  ADD CONSTRAINT "backburner_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."calendar_backups"
  ADD CONSTRAINT "calendar_backups_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."calendar_events"
  ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."curricula"
  ADD CONSTRAINT "curricula_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."curricula"
  ADD CONSTRAINT "curricula_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.curriculum_categories(id) ON DELETE CASCADE;

ALTER TABLE "public"."curriculum_categories"
  ADD CONSTRAINT "curriculum_categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."curriculum_chapters"
  ADD CONSTRAINT "curriculum_chapters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."curriculum_resources"
  ADD CONSTRAINT "curriculum_resources_curriculum_id_fkey" FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE "public"."curriculum_resources"
  ADD CONSTRAINT "curriculum_resources_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."curriculum_topics"
  ADD CONSTRAINT "curriculum_topics_chapter_id_fkey" FOREIGN KEY (chapter_id) REFERENCES public.curriculum_chapters(id) ON DELETE CASCADE;

ALTER TABLE "public"."curriculum_topics"
  ADD CONSTRAINT "curriculum_topics_curriculum_id_fkey" FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE "public"."curriculum_topics"
  ADD CONSTRAINT "curriculum_topics_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."daily_tasks"
  ADD CONSTRAINT "daily_tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."eulogies"
  ADD CONSTRAINT "eulogies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."fitness_logs"
  ADD CONSTRAINT "fitness_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."focus_items"
  ADD CONSTRAINT "focus_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."goals"
  ADD CONSTRAINT "goals_parent_goal_id_fkey" FOREIGN KEY (parent_goal_id) REFERENCES public.goals(id) ON DELETE SET NULL;

ALTER TABLE "public"."goals"
  ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."habit_logs"
  ADD CONSTRAINT "habit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."habit_logs"
  ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY (habit_id) REFERENCES public.habits(id);

ALTER TABLE "public"."habits"
  ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."highlights"
  ADD CONSTRAINT "highlights_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."io_logs"
  ADD CONSTRAINT "io_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."media_log"
  ADD CONSTRAINT "media_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."milestones"
  ADD CONSTRAINT "milestones_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."mini_games"
  ADD CONSTRAINT "mini_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."goals"
  ADD CONSTRAINT "goals_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public.nodes(id);

ALTER TABLE "public"."nodes"
  ADD CONSTRAINT "nodes_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.nodes(id);

ALTER TABLE "public"."nodes"
  ADD CONSTRAINT "nodes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."pomodoro_logs"
  ADD CONSTRAINT "pomodoro_logs_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public.nodes(id);

ALTER TABLE "public"."pomodoro_logs"
  ADD CONSTRAINT "pomodoro_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id);

ALTER TABLE "public"."push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."recurring_task_templates"
  ADD CONSTRAINT "recurring_task_templates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."ritual_items"
  ADD CONSTRAINT "ritual_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."ritual_logs"
  ADD CONSTRAINT "ritual_logs_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.ritual_items(id) ON DELETE CASCADE;

ALTER TABLE "public"."ritual_logs"
  ADD CONSTRAINT "ritual_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."subtasks"
  ADD CONSTRAINT "subtasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."supplement_logs"
  ADD CONSTRAINT "supplement_logs_supplement_id_fkey" FOREIGN KEY (supplement_id) REFERENCES public.supplements(id);

ALTER TABLE "public"."hardware_opportunities"
  ADD CONSTRAINT "hardware_opportunities_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_source_template_id_fkey" FOREIGN KEY (source_template_id) REFERENCES public.recurring_task_templates(id);

ALTER TABLE "public"."user_integrations"
  ADD CONSTRAINT "user_integrations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."workout_logs"
  ADD CONSTRAINT "workout_logs_plan_exercise_id_fkey" FOREIGN KEY (plan_exercise_id) REFERENCES public.plan_exercises(id) ON DELETE CASCADE;

ALTER TABLE "public"."plan_exercises"
  ADD CONSTRAINT "plan_exercises_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.workout_plans(id) ON DELETE CASCADE;

CREATE INDEX idx_calendar_events_user_dates ON public.calendar_events USING btree (user_id, start_time, end_time);

CREATE POLICY "own backburner" ON "public"."backburner"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can only access their own brief_sources" ON "public"."brief_sources"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own calendar_backups" ON "public"."calendar_backups"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own calendar_events" ON "public"."calendar_events"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own contacts" ON "public"."contacts"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own curricula" ON "public"."curricula"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own curriculum_categories" ON "public"."curriculum_categories"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own curriculum_chapters" ON "public"."curriculum_chapters"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own curriculum_resources" ON "public"."curriculum_resources"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own curriculum_topics" ON "public"."curriculum_topics"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Allow all for authenticated" ON "public"."custom_recipes"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "own daily_tasks" ON "public"."daily_tasks"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own eulogies" ON "public"."eulogies"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own fitness logs" ON "public"."fitness_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "own focus" ON "public"."focus_items"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own goals" ON "public"."goals"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own habit_logs" ON "public"."habit_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own habits" ON "public"."habits"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own hardware opportunities" ON "public"."hardware_opportunities"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "own highlights" ON "public"."highlights"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own io_logs" ON "public"."io_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "allow update" ON "public"."meal_logs"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "auth only" ON "public"."meal_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "own media_log" ON "public"."media_log"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own milestones" ON "public"."milestones"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own mini_games" ON "public"."mini_games"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "auth only" ON "public"."mood_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can only access their own morning_briefs" ON "public"."morning_briefs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own nodes" ON "public"."nodes"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own nudges" ON "public"."nudges"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Allow all for authenticated" ON "public"."plan_exercises"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "own pomodoro" ON "public"."pomodoro_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own profile" ON "public"."profiles"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "Users can delete their own push subscriptions" ON "public"."push_subscriptions"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own push subscriptions" ON "public"."push_subscriptions"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own push subscriptions" ON "public"."push_subscriptions"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own push subscriptions" ON "public"."push_subscriptions"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage own recurring templates" ON "public"."recurring_task_templates"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can only access their own rejection_challenges" ON "public"."rejection_challenge"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can only access their own rejections" ON "public"."rejections"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own ritual_items" ON "public"."ritual_items"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own ritual_logs" ON "public"."ritual_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "own subtasks" ON "public"."subtasks"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "auth only" ON "public"."supplement_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "auth only" ON "public"."supplements"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can manage their own integrations" ON "public"."user_integrations"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Allow all for authenticated" ON "public"."weekly_reports"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "auth only" ON "public"."weight_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can only access their own wins" ON "public"."wins"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "auth only" ON "public"."workout_goals"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "auth only" ON "public"."workout_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "auth only" ON "public"."workout_performance"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Allow all for authenticated" ON "public"."workout_plans"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "own photos" ON "storage"."objects"
  FOR ALL
  TO PUBLIC
  USING (((auth.uid())::text = (storage.foldername(name))[1]));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

GRANT EXECUTE ON FUNCTION "public"."increment_xp"(uuid, integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE
  ON FUNCTION "public"."upsert_calendar_event"(uuid, text, text, text, timestamp WITH time zone, timestamp WITH time zone, boolean, text, text, text)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."backburner" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."brief_sources" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."calendar_backups" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."calendar_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."contacts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."curricula" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."curriculum_categories" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."curriculum_chapters" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."curriculum_resources" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."curriculum_topics" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."custom_foods" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."custom_recipes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."daily_tasks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."day_plan_blocks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."eulogies" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fitness_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."focus_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."goals" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."habit_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."habits" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."hardware_opportunities" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."highlights" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."io_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meal_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."media_log" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."milestones" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mini_games" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mood_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."morning_briefs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."nodes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."nudges" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plan_exercises" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pomodoro_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."push_subscriptions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_task_templates" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rejection_challenge" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rejections" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ritual_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ritual_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sleep_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subtasks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."supplement_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."supplements" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_integrations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_settings" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."water_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weekly_reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weight_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wins" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workout_goals" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workout_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workout_performance" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workout_plans" TO "anon", "authenticated", "postgres", "service_role";

CREATE POLICY "Multi-tenant user access" ON "public"."custom_foods"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can access their own day plan blocks" ON "public"."day_plan_blocks"
  FOR ALL
  TO PUBLIC
  USING (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())))
  WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));

CREATE POLICY "Multi-tenant user access" ON "public"."meal_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Multi-tenant user access" ON "public"."mood_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Multi-tenant user access" ON "public"."sleep_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Multi-tenant user access" ON "public"."supplement_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can access their own tasks" ON "public"."tasks"
  FOR ALL
  TO PUBLIC
  USING (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())))
  WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));

CREATE POLICY "Multi-tenant user access" ON "public"."user_settings"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Multi-tenant user access" ON "public"."water_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Multi-tenant user access" ON "public"."weight_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Multi-tenant user access" ON "public"."workout_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

