-- Черновая схема для следующей версии RPG Live.
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  display_name text not null,
  level int not null default 1,
  xp int not null default 0,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  status text not null check (status in ('active','found','blocked','background','completed')),
  role text not null default 'support' check (role in ('main','support')),
  progress int not null default 0 check (progress between 0 and 100),
  condition text,
  requirement text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  happened_on date not null,
  category text not null,
  title text not null,
  amount numeric,
  unit text,
  minutes int,
  created_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  happened_on date not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists world_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  state_type text not null check (state_type in ('buff','debuff')),
  title text not null,
  icon text,
  source text,
  starts_on date not null default current_date,
  ends_on date not null,
  created_at timestamptz not null default now()
);

create table if not exists character_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  happened_on date not null,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  note text,
  created_at timestamptz not null default now()
);
