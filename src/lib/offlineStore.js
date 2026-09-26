import Dexie from 'dexie';

const db = new Dexie('PolarisOffline');

db.version(1).stores({
  // Phase 1 tables - indexed columns listed after the primary key
  tasks: 'id, user_id, status, quadrant, category, deadline, parent_task_id',
  daily_tasks: 'id, user_id, date, completed',
  goals: 'id, user_id, scope, completed, node_id',
  milestones: 'id, user_id, status, deadline',
  day_plan_blocks: 'id, user_id, log_date, done',
  profiles: 'id',

  // Sync queue - tracks pending mutations
  _syncQueue: '++localId, table, operation, synced, createdAt',
  
  // Metadata - tracks last sync timestamps per table
  _syncMeta: 'table',
});

db.version(2).stores({
  focus_items: 'id, user_id, status, position',
  backburner: 'id, user_id, revisit_after',
  subtasks: 'id, user_id, parent_id, parent_type, completed',
  recurring_task_templates: 'id, user_id, is_active, last_generated_date',
  hardware_opportunities: 'id, user_id, task_id, status',
  eulogies: 'id, user_id, written_date'
});

db.version(3).stores({
  tasks: 'id, user_id, status, quadrant, category, deadline, parent_task_id, milestone_id',
});

db.version(4).stores({
  tasks: 'id, user_id, status, quadrant, category, deadline, parent_task_id, milestone_id, time_estimate_minutes, mental_load',
  task_estimate_calibration: 'id, user_id, task_id, created_at',
});



db.version(5).stores({
  practice_scores: 'id, user_id, curriculum_id, category, date'
});

db.version(6).stores({
  curriculum_topics: 'id, user_id, curriculum_id',
  mini_games: 'id, user_id, sort_order',
  calendar_events: 'id, user_id, gcal_event_id, start_time',
  calendar_backups: 'id, user_id',
  habits: 'id, user_id',
  nodes: 'id, user_id, parent_id',
  curricula: 'id, user_id, category_id',
  curriculum_resources: 'id, user_id, curriculum_id',
  curriculum_categories: 'id, user_id',
  media_log: 'id, user_id',
  sync_errors: '++localId, table, operation, error_code, created_at'
});

export default db;


