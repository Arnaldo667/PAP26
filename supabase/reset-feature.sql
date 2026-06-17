-- ============================================================
-- Funcionalidade: reset de votos pelo admin.
-- Correr UMA VEZ no SQL Editor do projeto Supabase (em bases já existentes).
-- (Em instalações novas já vem incluído no schema.sql.)
-- ============================================================

-- 1) Permitir ao admin (authenticated) apagar respostas.
grant delete on public.responses to authenticated;

drop policy if exists responses_delete_auth on public.responses;
create policy responses_delete_auth on public.responses
  for delete to authenticated using (true);

-- 2) Tabela de estado do inquérito (token de reset, linha única).
create table if not exists public.survey_meta (
  id          boolean primary key default true,
  reset_token uuid not null default gen_random_uuid(),
  constraint survey_meta_singleton check (id)
);
insert into public.survey_meta (id) values (true) on conflict (id) do nothing;

grant select on public.survey_meta to anon, authenticated;
grant update on public.survey_meta to authenticated;

alter table public.survey_meta enable row level security;

drop policy if exists survey_meta_select_public on public.survey_meta;
create policy survey_meta_select_public on public.survey_meta
  for select to anon, authenticated using (true);

drop policy if exists survey_meta_update_auth on public.survey_meta;
create policy survey_meta_update_auth on public.survey_meta
  for update to authenticated using (true) with check (true);
