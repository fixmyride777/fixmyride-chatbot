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

-- Advisor WhatsApp number(s) used when handoff_human runs (server reads from here).
create table if not exists public.advisor_numbers (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  created_at timestamptz not null default now()
);

comment on table public.advisor_numbers is 'Active advisor numbers for chatbot human handoff; handoff_human loads one active row.';

-- Single-row (or latest) personality text edited by admin; prepended to the LLM system prompt.
create table if not exists public.chatbot_personality (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists chatbot_personality_set_updated_at on public.chatbot_personality;
create trigger chatbot_personality_set_updated_at
before update on public.chatbot_personality
for each row execute function public.set_updated_at();

comment on table public.chatbot_personality is 'Admin-edited assistant tone and style; agent loads one row (prefer order by updated_at desc).';
