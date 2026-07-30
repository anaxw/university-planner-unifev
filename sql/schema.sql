-- =========================================================
-- ROTINA FACULDADE — SCHEMA SUPABASE (PostgreSQL)
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- TABELA: usuarios (perfil complementar ao auth.users)
-- ---------------------------------------------------------
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.usuarios enable row level security;

create policy "usuarios_select_own" on public.usuarios
  for select using (auth.uid() = id);
create policy "usuarios_insert_own" on public.usuarios
  for insert with check (auth.uid() = id);
create policy "usuarios_update_own" on public.usuarios
  for update using (auth.uid() = id);
create policy "usuarios_delete_own" on public.usuarios
  for delete using (auth.uid() = id);

-- Cria automaticamente uma linha em "usuarios" quando um novo usuário se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- TABELA: materias
-- ---------------------------------------------------------
create table if not exists public.materias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  professor text,
  horario text,
  cor text not null default '#4F7DF3',
  created_at timestamptz not null default now()
);

alter table public.materias enable row level security;

create policy "materias_select_own" on public.materias
  for select using (auth.uid() = user_id);
create policy "materias_insert_own" on public.materias
  for insert with check (auth.uid() = user_id);
create policy "materias_update_own" on public.materias
  for update using (auth.uid() = user_id);
create policy "materias_delete_own" on public.materias
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- TABELA: tarefas
-- ---------------------------------------------------------
create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  materia_id uuid references public.materias(id) on delete set null,
  titulo text not null,
  descricao text,
  data_entrega date,
  tipo text not null default 'tarefa', -- 'tarefa' | 'prova'
  prioridade text not null default 'media', -- 'baixa' | 'media' | 'alta'
  status text not null default 'pendente', -- 'pendente' | 'concluida'
  created_at timestamptz not null default now()
);

alter table public.tarefas enable row level security;

create policy "tarefas_select_own" on public.tarefas
  for select using (auth.uid() = user_id);
create policy "tarefas_insert_own" on public.tarefas
  for insert with check (auth.uid() = user_id);
create policy "tarefas_update_own" on public.tarefas
  for update using (auth.uid() = user_id);
create policy "tarefas_delete_own" on public.tarefas
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- TABELA: anotacoes
-- ---------------------------------------------------------
create table if not exists public.anotacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  materia_id uuid references public.materias(id) on delete set null,
  titulo text not null,
  conteudo text,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.anotacoes enable row level security;

create policy "anotacoes_select_own" on public.anotacoes
  for select using (auth.uid() = user_id);
create policy "anotacoes_insert_own" on public.anotacoes
  for insert with check (auth.uid() = user_id);
create policy "anotacoes_update_own" on public.anotacoes
  for update using (auth.uid() = user_id);
create policy "anotacoes_delete_own" on public.anotacoes
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- TABELA: eventos (calendário: eventos avulsos, provas manuais, etc.)
-- ---------------------------------------------------------
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text,
  data date not null,
  tipo text not null default 'evento', -- 'evento' | 'prova' | 'tarefa'
  cor text default '#4F7DF3',
  created_at timestamptz not null default now()
);

alter table public.eventos enable row level security;

create policy "eventos_select_own" on public.eventos
  for select using (auth.uid() = user_id);
create policy "eventos_insert_own" on public.eventos
  for insert with check (auth.uid() = user_id);
create policy "eventos_update_own" on public.eventos
  for update using (auth.uid() = user_id);
create policy "eventos_delete_own" on public.eventos
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- ÍNDICES úteis
-- ---------------------------------------------------------
create index if not exists idx_materias_user on public.materias(user_id);
create index if not exists idx_tarefas_user on public.tarefas(user_id);
create index if not exists idx_tarefas_materia on public.tarefas(materia_id);
create index if not exists idx_tarefas_data on public.tarefas(data_entrega);
create index if not exists idx_anotacoes_user on public.anotacoes(user_id);
create index if not exists idx_anotacoes_materia on public.anotacoes(materia_id);
create index if not exists idx_eventos_user on public.eventos(user_id);
create index if not exists idx_eventos_data on public.eventos(data);
