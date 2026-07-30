-- =========================================================
-- MIGRAÇÃO: Lembretes via WhatsApp (CallMeBot)
-- Execute este script no SQL Editor do Supabase (após o schema.sql original).
-- =========================================================

alter table public.usuarios
  add column if not exists telefone text,
  add column if not exists callmebot_apikey text,
  add column if not exists lembretes_ativos boolean not null default true,
  add column if not exists dias_antecedencia int not null default 1;

-- telefone: número no formato internacional, ex: 5511999998888 (DDI+DDD+número, só dígitos)
-- callmebot_apikey: chave gerada pelo CallMeBot (ver instruções no README)
-- lembretes_ativos: liga/desliga o envio de lembretes para o usuário
-- dias_antecedencia: quantos dias antes do vencimento o aviso deve ser enviado (padrão: 1)

-- Controle para não enviar o mesmo aviso duas vezes
create table if not exists public.lembretes_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  unique (tarefa_id)
);

alter table public.lembretes_enviados enable row level security;

create policy "lembretes_enviados_select_own" on public.lembretes_enviados
  for select using (auth.uid() = user_id);

-- Nenhuma policy de insert/update/delete: essa tabela só é escrita pela função
-- serverless usando a service_role key, que ignora RLS por padrão.
