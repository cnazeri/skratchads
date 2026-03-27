-- Migration 001: Add campaign_brief and research_data columns to campaigns table
-- Run this in the Supabase SQL Editor

-- Campaign brief stores the goal, product description, competitors, and research questions
alter table public.campaigns add column if not exists campaign_brief jsonb;

-- Research data stores the full Perplexity response for caching
alter table public.campaigns add column if not exists research_data text;
