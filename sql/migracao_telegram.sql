-- =========================================================
-- MIGRAÇÃO: Lembretes via Telegram
-- Execute este script no SQL Editor do Supabase (após o schema.sql original).
-- Se você já rodou a antiga migracao_whatsapp.sql, este script substitui
-- aqueles campos por telefone/apikey do CallMeBot.
-- =========================================================

-- Remove os campos antigos do WhatsApp/CallMeBot (se existirem)
alter table public.usuarios
  drop column if exists telefone,
  drop column if exists callmebot_apikey;

-- Campos novos para vincular o Telegram e configurar a antecedência do aviso
alter table public.usuarios
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_link_code text,
  add column if not exists lembretes_ativos boolean not null default true,
  add column if not exists lembrete_dias int not null default 1,
  add column if not exists lembrete_horas int not null default 0,
  add column if not exists lembrete_minutos int not null default 0;

-- telegram_chat_id: identificador da conversa do usuário com o bot (preenchido
--                    automaticamente quando ele manda /start <código> no bot)
-- telegram_link_code: código temporário gerado pelo sistema para vincular a conta
-- lembretes_ativos: liga/desliga o envio de lembretes para o usuário
-- lembrete_dias/horas/minutos: quanto tempo antes do vencimento o aviso deve ser enviado

-- Índice para localizar rapidamente o usuário pelo código de vinculação
create index if not exists idx_usuarios_telegram_link_code on public.usuarios(telegram_link_code);

-- ---------------------------------------------------------
-- TABELA: lembretes_enviados (evita mandar o mesmo aviso duas vezes)
-- Só é criada aqui caso você ainda não tenha rodado a migração antiga.
-- ---------------------------------------------------------
create table if not exists public.lembretes_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  unique (tarefa_id)
);

alter table public.lembretes_enviados enable row level security;

drop policy if exists "lembretes_enviados_select_own" on public.lembretes_enviados;
create policy "lembretes_enviados_select_own" on public.lembretes_enviados
  for select using (auth.uid() = user_id);

-- Nenhuma policy de insert/update/delete: essa tabela só é escrita pela função
-- serverless usando a service_role key, que ignora RLS por padrão.
