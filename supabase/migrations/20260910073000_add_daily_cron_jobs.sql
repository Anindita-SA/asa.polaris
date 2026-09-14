-- Enable pg_cron and pg_net if not already enabled
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Schedule morning brief generation at 6:00 AM IST (00:30 UTC)
select cron.schedule(
  'daily-morning-brief',
  '30 0 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-morning-brief',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}',
    timeout_milliseconds := 30000
  );
  $$
);

-- Schedule opportunity scout at 6:15 AM IST (00:45 UTC)
select cron.schedule(
  'daily-opportunity-scout',
  '45 0 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scout-opportunities',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}',
    timeout_milliseconds := 60000
  );
  $$
);
