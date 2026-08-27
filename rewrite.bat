set FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch public/ielts_2026_study_schedule.ics \"dev guides/scout_migration.sql\" scripts/agent_supabase_sync.js scripts/agent_supabase_sync_app_milestones.js scripts/agent_supabase_sync_milestones.js scripts/fix_survey_milestones.js" --prune-empty --tag-name-filter cat -- --all
