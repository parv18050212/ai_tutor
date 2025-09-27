-- Remove username and avatar_url columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;