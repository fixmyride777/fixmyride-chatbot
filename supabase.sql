-- Run this in Supabase SQL editor.
-- Uses simple tables for: session conversation, dedupe, and last-sent echo guard.

-- Simple updated_at trigger (no extensions required)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.chat_sessions (
  session_id text primary key,
  messages jsonb not null default '[]'::jsonb,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create table if not exists public.chat_seen_message_ids (
  message_id text primary key,
  seen_at timestamptz not null default now()
);

create table if not exists public.chat_last_sent (
  session_id text primary key,
  text text not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists chat_last_sent_set_updated_at on public.chat_last_sent;
create trigger chat_last_sent_set_updated_at
before update on public.chat_last_sent
for each row execute function public.set_updated_at();
