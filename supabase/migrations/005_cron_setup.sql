-- migration 005 — cron setup
-- runs daily at 04:00 UTC (09:00 PKT / Asia/Karachi)

select cron.schedule(
  'daily-reminders',
  '0 4 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_functions_url') || '/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || current_setting('app.service_role_key')
               ),
    body    := '{}'::jsonb
  )
  $$
);
