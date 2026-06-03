-- ============================================================================
-- Programar la actualización automática de resultados cada 15 minutos.
-- Pegá esto en Supabase → SQL Editor DESPUÉS de:
--   1) haber hecho deploy de la función:  supabase functions deploy sync-results --no-verify-jwt
--   2) cargado el secreto FOOTBALL_API_KEY
--
-- Reemplazá <PROJECT_REF> y <ANON_KEY> por los tuyos
-- (Project Settings → General: Reference ID; y Project Settings → API: anon key).
-- ============================================================================

-- Extensiones necesarias (en Supabase ya suelen estar; esto las habilita).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Si ya existía, lo borramos para no duplicar.
select cron.unschedule('sync-mundial')
where exists (select 1 from cron.job where jobname = 'sync-mundial');

-- Corre cada 15 minutos.
select cron.schedule(
  'sync-mundial',
  '*/15 * * * *',
  $$
    select net.http_post(
      url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-results',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY>'
      )
    );
  $$
);

-- Para ver el historial:   select * from cron.job_run_details order by start_time desc limit 20;
-- Para apagarlo:           select cron.unschedule('sync-mundial');
