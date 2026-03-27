-- Migration: Restore 'win' state to banner_states.state_type constraint
-- Valid states: scratch, win, lose, redeem, brand
-- Run this in the Supabase SQL Editor

-- Drop the current CHECK constraint and add the updated one with 'win' included
ALTER TABLE public.banner_states
  DROP CONSTRAINT IF EXISTS banner_states_state_type_check;

ALTER TABLE public.banner_states
  ADD CONSTRAINT banner_states_state_type_check
  CHECK (state_type IN ('scratch', 'win', 'lose', 'redeem', 'brand'));
