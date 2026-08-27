## Table `meal_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `logged_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `food_id` | `text` |  Nullable |
| `food_name` | `text` |  |
| `protein` | `numeric` |  |
| `carbs` | `numeric` |  |
| `fat` | `numeric` |  |
| `kcal` | `numeric` |  |
| `meal_tag` | `text` |  Nullable |
| `fiber` | `numeric` |  Nullable |
| `iron` | `numeric` |  Nullable |
| `calcium` | `numeric` |  Nullable |
| `vitamin_c` | `numeric` |  Nullable |
| `vitamin_d` | `numeric` |  Nullable |
| `vitamin_b12` | `numeric` |  Nullable |
| `cost` | `numeric` |  Nullable |
| `ai_grade` | `text` |  Nullable |
| `health_tags` | `jsonb` |  Nullable |
| `user_id` | `uuid` |  Nullable |

## Table `workout_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `logged_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `day_type` | `text` |  |
| `done` | `bool` |  Nullable |
| `plan_exercise_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |

## Table `weight_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `logged_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `weight_kg` | `numeric` |  |
| `user_id` | `uuid` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `clarity_anchor` | `text` |  Nullable |
| `current_chapter` | `text` |  Nullable |
| `xp` | `int4` |  Nullable |
| `level` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `nodes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `parent_id` | `uuid` |  Nullable |
| `type` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `x_pos` | `float8` |  Nullable |
| `y_pos` | `float8` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `goals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `node_id` | `uuid` |  Nullable |
| `scope` | `text` |  Nullable |
| `title` | `text` |  |
| `target` | `numeric` |  |
| `current` | `numeric` |  Nullable |
| `unit` | `text` |  Nullable |
| `xp_reward` | `int4` |  Nullable |
| `completed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `parent_goal_id` | `uuid` |  Nullable |
| `reminder_time` | `timestamptz` |  Nullable |
| `google_event_id` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `deadline` | `date` |  Nullable |

## Table `focus_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `category` | `text` |  Nullable |
| `why_now` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `position` | `int4` |  Nullable |

## Table `backburner`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `why_deferred` | `text` |  Nullable |
| `context_snapshot` | `text` |  Nullable |
| `revisit_after` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `milestones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `deadline` | `date` |  |
| `status` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `xp_reward` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `highlights`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `date` | `date` |  Nullable |
| `text` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `habits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `frequency` | `text` |  Nullable |
| `xp_reward` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `habit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `habit_id` | `uuid` |  Nullable |
| `date` | `date` |  Nullable |
| `completed` | `bool` |  Nullable |

## Table `eulogies`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `content` | `text` |  |
| `version_label` | `text` |  Nullable |
| `written_date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `pomodoro_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `date` | `date` |  Nullable |
| `duration_minutes` | `int4` |  |
| `node_id` | `uuid` |  Nullable |
| `label` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `subtasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `parent_id` | `uuid` |  Nullable |
| `parent_type` | `text` |  Nullable |
| `title` | `text` |  |
| `completed` | `bool` |  Nullable |
| `position` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `mood_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `logged_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `mood` | `text` |  Nullable |
| `energy` | `text` |  Nullable |
| `anxiety` | `text` |  Nullable |
| `menstruating` | `bool` |  Nullable |
| `mood_score` | `int2` |  Nullable |
| `energy_score` | `int2` |  Nullable |
| `stress_score` | `int2` |  Nullable |
| `user_id` | `uuid` |  Nullable |

## Table `supplements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `dose` | `text` |  Nullable |
| `timing` | `text` |  Nullable |
| `active` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `protein` | `numeric` |  Nullable |
| `carbs` | `numeric` |  Nullable |
| `fat` | `numeric` |  Nullable |
| `kcal` | `numeric` |  Nullable |
| `fiber` | `numeric` |  Nullable |
| `iron` | `numeric` |  Nullable |
| `calcium` | `numeric` |  Nullable |
| `vitamin_c` | `numeric` |  Nullable |
| `user_id` | `uuid` |  |
| `cost` | `numeric` |  Nullable |

## Table `supplement_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `logged_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `supplement_id` | `uuid` |  Nullable |
| `taken` | `bool` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `cost` | `numeric` |  Nullable |

## Table `workout_goals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `day_type` | `text` |  |
| `exercise_name` | `text` |  |
| `target_sets` | `int4` |  Nullable |
| `target_reps` | `text` |  Nullable |
| `personal_best` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `workout_performance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `logged_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `day_type` | `text` |  |
| `exercise_name` | `text` |  |
| `sets_done` | `int4` |  Nullable |
| `reps_done` | `text` |  Nullable |
| `notes` | `text` |  Nullable |

## Table `io_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `type` | `text` |  |
| `category` | `text` |  |
| `minutes` | `int4` |  |
| `date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `curriculum_chapters`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `node_title` | `text` |  Nullable |
| `position` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `curriculum_topics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `chapter_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `position` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `curriculum_id` | `uuid` |  Nullable |
| `estimated_hours` | `numeric` |  Nullable |
| `is_recommended_next` | `bool` |  Nullable |
| `date_started` | `date` |  Nullable |
| `date_completed` | `date` |  Nullable |
| `notes` | `text` |  Nullable |

## Table `ritual_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `time_of_day` | `text` |  Nullable |
| `position` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ritual_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `item_id` | `uuid` |  Nullable |
| `date` | `date` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |

## Table `daily_tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `completed` | `bool` |  Nullable |
| `date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `curriculum_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `accent_color` | `text` |  Nullable |
| `position` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `curricula`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `banner_url` | `text` |  Nullable |
| `estimated_hours` | `int4` |  Nullable |
| `position` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `curriculum_resources`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `curriculum_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `author` | `text` |  Nullable |
| `resource_type` | `text` |  Nullable |
| `url` | `text` |  Nullable |
| `recommended_by` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `media_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `author_or_creator` | `text` |  Nullable |
| `media_type` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `date_started` | `date` |  Nullable |
| `date_finished` | `date` |  Nullable |
| `recommended_by` | `text` |  Nullable |
| `rating` | `int4` |  Nullable |
| `one_line_takeaway` | `text` |  Nullable |
| `full_review` | `text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `custom_foods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `portion` | `text` |  Nullable |
| `protein` | `numeric` |  Nullable |
| `carbs` | `numeric` |  Nullable |
| `fat` | `numeric` |  Nullable |
| `kcal` | `numeric` |  Nullable |
| `cost` | `numeric` |  Nullable |
| `is_homemade` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `ai_grade` | `text` |  Nullable |
| `health_tags` | `jsonb` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `fiber` | `numeric` |  Nullable |
| `iron` | `numeric` |  Nullable |
| `calcium` | `numeric` |  Nullable |
| `vitamin_c` | `numeric` |  Nullable |
| `vitamin_d` | `numeric` |  Nullable |
| `vitamin_b12` | `numeric` |  Nullable |

## Table `workout_plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `days` | `_int4` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  |

## Table `plan_exercises`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `plan_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `sets` | `text` |  Nullable |
| `target` | `text` |  Nullable |
| `badge` | `text` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `weekly_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `week_start` | `date` |  |
| `week_end` | `date` |  |
| `report_json` | `jsonb` |  Nullable |
| `generated_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  |

## Table `custom_recipes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `ingredients` | `jsonb` |  Nullable |
| `instructions` | `text` |  Nullable |
| `protein` | `numeric` |  Nullable |
| `carbs` | `numeric` |  Nullable |
| `fat` | `numeric` |  Nullable |
| `kcal` | `numeric` |  Nullable |
| `cost` | `numeric` |  Nullable |
| `active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  |

## Table `sleep_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `log_date` | `date` |  |
| `hours` | `numeric` |  |
| `created_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  Nullable |

## Table `water_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `log_date` | `date` |  |
| `amount_ml` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  Nullable |

## Table `user_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `health_profile` | `text` |  Nullable |
| `birth_year` | `int4` |  Nullable |
| `gender` | `text` |  Nullable |
| `weight` | `numeric` |  Nullable |
| `height` | `numeric` |  Nullable |
| `activity_level` | `text` |  Nullable |
| `sync_cycle` | `bool` |  Nullable |
| `goals` | `text` |  Nullable |
| `conditions` | `text` |  Nullable |
| `restrictions` | `text` |  Nullable |
| `allergens` | `text` |  Nullable |
| `dislikes` | `text` |  Nullable |
| `likes` | `text` |  Nullable |
| `ai_report` | `text` |  Nullable |
| `ai_report_days` | `text` |  Nullable |
| `name` | `text` |  Nullable |
| `user_id` | `uuid` |  Nullable |

