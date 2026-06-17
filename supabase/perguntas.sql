-- ============================================================
-- Substituir as perguntas pelo conjunto definitivo (16 perguntas).
-- Correr no SQL Editor do projeto Supabase.
--
-- ATENÇÃO: apaga TODAS as respostas existentes (eram de teste) e
-- as perguntas anteriores, antes de inserir as novas.
-- ============================================================

-- 1) Limpar respostas de teste (apaga em cascata as answers).
delete from public.responses;

-- 2) Remover perguntas anteriores.
delete from public.questions;

-- 3) Inserir as perguntas definitivas, por ordem.
insert into public.questions (texto, ordem) values
  ('Como avalia o comportamento dos alunos?', 1),
  ('Como avalia a comida da cantina?', 2),
  ('Como avalia os professores?', 3),
  ('Como avalia a direção da escola?', 4),
  ('Como avalia as instalações da escola?', 5),
  ('Como avalia a limpeza da escola?', 6),
  ('Como avalia a segurança da escola?', 7),
  ('Como avalia as atividades extracurriculares?', 8),
  ('Como avalia o atendimento dos funcionários?', 9),
  ('Como avalia a qualidade do ensino?', 10),
  ('Como avalia os equipamentos e materiais?', 11),
  ('Como avalia a disciplina de Português?', 12),
  ('Como avalia a disciplina de Matemática?', 13),
  ('Como avalia a disciplina de Inglês?', 14),
  ('Como avalia a disciplina de AIE?', 15),
  ('Como avalia a disciplina de Educação Física?', 16);
