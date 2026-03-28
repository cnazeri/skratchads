-- Analytics events table for tracking feature usage and generation metrics
-- Run this in the Supabase SQL Editor

create table if not exists public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete set null,
  event_name text not null,
  event_category text not null,  -- 'campaign', 'generation', 'research', 'export', 'editor', 'auth'
  campaign_id uuid references public.campaigns(id) on delete set null,
  properties jsonb default '{}',  -- flexible metadata (format, state, duration_ms, error, etc.)
  created_at timestamptz default now()
);

-- Index for querying by user, event, and time range
create index idx_analytics_user_id on public.analytics_events(user_id);
create index idx_analytics_event_name on public.analytics_events(event_name);
create index idx_analytics_created_at on public.analytics_events(created_at);
create index idx_analytics_category on public.analytics_events(event_category);

-- RLS: users can insert their own events, only admins can read all
alter table public.analytics_events enable row level security;

create policy "Users can insert own events"
  on public.analytics_events for insert
  with check (auth.uid() = user_id);

create policy "Users can read own events"
  on public.analytics_events for select
  using (auth.uid() = user_id);
