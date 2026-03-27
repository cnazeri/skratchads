-- Migration: Update banner_states.state_type constraint
-- Removes 'win' state, adds 'redeem' state
-- New valid states: scratch, lose, redeem, brand
-- Run this in the Supabase SQL Editor

-- Step 1: Delete any existing 'win' state rows (they will be replaced by 'redeem')
DELETE FROM public.banner_states WHERE state_type = 'win';

-- Step 2: Drop the old CHECK constraint and add the new one
ALTER TABLE public.banner_states
  DROP CONSTRAINT IF EXISTS banner_states_state_type_check;

ALTER TABLE public.banner_states
  ADD CONSTRAINT banner_states_state_type_check
  CHECK (state_type IN ('scratch', 'lose', 'redeem', 'brand'));
