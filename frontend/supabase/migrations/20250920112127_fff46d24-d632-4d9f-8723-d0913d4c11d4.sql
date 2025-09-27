-- Fix chat_history role constraint to allow correct role values
-- The edge function uses 'user' and 'assistant' but the current constraint only allows 'student' and 'tutor'

-- Drop the existing role constraint
ALTER TABLE public.chat_history DROP CONSTRAINT IF EXISTS chat_history_role_check;

-- Create new constraint that allows all required role values
ALTER TABLE public.chat_history ADD CONSTRAINT chat_history_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'student'::text, 'tutor'::text]));