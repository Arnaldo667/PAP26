-- ============================================================
-- Inquérito de Satisfação Esprodouro — schema + RLS
-- Correr no SQL Editor do projeto Supabase.
-- ============================================================

-- Tabelas -----------------------------------------------------
create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  texto      text not null,
  ordem      int  not null default 0,
  ativa      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  grau        int  not null check (grau between 1 and 4),
  created_at  timestamptz not null default now()
);

-- Grants (RLS continua a ser a barreira real) -----------------
grant select, insert on public.questions to anon, authenticated;
grant update, delete on public.questions to authenticated;
grant insert on public.responses to anon, authenticated;
grant select on public.responses to authenticated;
grant insert on public.answers to anon, authenticated;
grant select on public.answers to authenticated;

-- RLS ---------------------------------------------------------
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.answers   enable row level security;

-- questions
drop policy if exists questions_select_public_active on public.questions;
create policy questions_select_public_active on public.questions
  for select to anon using (ativa = true);

drop policy if exists questions_select_auth_all on public.questions;
create policy questions_select_auth_all on public.questions
  for select to authenticated using (true);

drop policy if exists questions_modify_auth on public.questions;
create policy questions_modify_auth on public.questions
  for all to authenticated using (true) with check (true);

-- responses
drop policy if exists responses_insert_public on public.responses;
create policy responses_insert_public on public.responses
  for insert to anon, authenticated with check (true);

drop policy if exists responses_select_auth on public.responses;
create policy responses_select_auth on public.responses
  for select to authenticated using (true);

-- answers
drop policy if exists answers_insert_public on public.answers;
create policy answers_insert_public on public.answers
  for insert to anon, authenticated with check (true);

drop policy if exists answers_select_auth on public.answers;
create policy answers_select_auth on public.answers
  for select to authenticated using (true);

-- Perguntas exemplo (apagar/editar à vontade no admin) --------
insert into public.questions (texto, ordem) values
  ('Como avalia a sua satisfação global com a Esprodouro?', 1),
  ('Como avalia as instalações e os equipamentos?', 2),
  ('Como avalia o desempenho dos professores/formadores?', 3),
  ('Como avalia o atendimento dos serviços administrativos (secretaria)?', 4),
  ('Como avalia a comunicação e a informação prestada pela escola?', 5),
  ('Como avalia a oferta formativa e as atividades?', 6),
  ('Como avalia o ambiente e a relação na comunidade escolar?', 7),
  ('Recomendaria a Esprodouro a outras pessoas?', 8);
