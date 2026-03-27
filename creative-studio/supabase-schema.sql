-- SkratchAds Creative Studio - Supabase Database Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  company text,
  plan_tier text default 'free' check (plan_tier in ('free', 'pro', 'enterprise')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Campaigns
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  brand_name text not null,
  target_audience text,
  industry text,
  campaign_brief jsonb,
  research_data text,
  status text default 'draft' check (status in ('draft', 'researching', 'creating', 'complete')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Research sessions
create table public.research (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  raw_response jsonb,
  structured_report jsonb,
  selected_insights jsonb,
  created_at timestamptz default now()
);

-- Creatives
create table public.creatives (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  format_name text not null,
  format_width integer not null,
  format_height integer not null,
  variation_label text not null,
  selected boolean default false,
  created_at timestamptz default now()
);

-- Banner states (5 per creative: scratch, win, lose, redeem, brand)
create table public.banner_states (
  id uuid default uuid_generate_v4() primary key,
  creative_id uuid references public.creatives(id) on delete cascade not null,
  state_type text not null check (state_type in ('scratch', 'win', 'lose', 'redeem', 'brand')),
  image_url text,
  canvas_json jsonb,
  preview_url text,
  prompt_used text,
  created_at timestamptz default now()
);

-- User assets (uploaded logos, images)
create table public.assets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  asset_type text not null check (asset_type in ('logo', 'image', 'font')),
  filename text not null,
  storage_path text not null,
  mime_type text,
  file_size integer,
  created_at timestamptz default now()
);

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.research enable row level security;
alter table public.creatives enable row level security;
alter table public.banner_states enable row level security;
alter table public.assets enable row level security;

-- Users can only access their own data
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view own campaigns" on public.campaigns
  for select using (auth.uid() = user_id);

create policy "Users can create campaigns" on public.campaigns
  for insert with check (auth.uid() = user_id);

create policy "Users can update own campaigns" on public.campaigns
  for update using (auth.uid() = user_id);

create policy "Users can delete own campaigns" on public.campaigns
  for delete using (auth.uid() = user_id);

create policy "Users can view own research" on public.research
  for select using (
    campaign_id in (select id from public.campaigns where user_id = auth.uid())
  );

create policy "Users can create research" on public.research
  for insert with check (
    campaign_id in (select id from public.campaigns where user_id = auth.uid())
  );

create policy "Users can view own creatives" on public.creatives
  for select using (
    campaign_id in (select id from public.campaigns where user_id = auth.uid())
  );

create policy "Users can create creatives" on public.creatives
  for insert with check (
    campaign_id in (select id from public.campaigns where user_id = auth.uid())
  );

create policy "Users can update own creatives" on public.creatives
  for update using (
    campaign_id in (select id from public.campaigns where user_id = auth.uid())
  );

create policy "Users can view own banner states" on public.banner_states
  for select using (
    creative_id in (
      select c.id from public.creatives c
      join public.campaigns ca on c.campaign_id = ca.id
      where ca.user_id = auth.uid()
    )
  );

create policy "Users can create banner states" on public.banner_states
  for insert with check (
    creative_id in (
      select c.id from public.creatives c
      join public.campaigns ca on c.campaign_id = ca.id
      where ca.user_id = auth.uid()
    )
  );

create policy "Users can view own assets" on public.assets
  for select using (auth.uid() = user_id);

create policy "Users can upload assets" on public.assets
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own assets" on public.assets
  for delete using (auth.uid() = user_id);

-- Create storage bucket for assets
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict do nothing;

-- Storage policies
create policy "Users can upload assets" on storage.objects
  for insert with check (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own assets" on storage.objects
  for select using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public can view assets" on storage.objects
  for select using (bucket_id = 'assets');
