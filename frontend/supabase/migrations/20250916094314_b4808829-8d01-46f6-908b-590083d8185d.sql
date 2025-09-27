-- Add exam_id to profiles table to store user's preferred exam
ALTER TABLE public.profiles 
ADD COLUMN exam_id UUID REFERENCES public.exams(id);

-- Update the handle_new_user function to not set onboarding_completed to false by default
-- This allows users to complete onboarding properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, accessibility_needs, onboarding_completed)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    ARRAY[]::TEXT[],
    FALSE
  );
  RETURN NEW;
END;
$function$;