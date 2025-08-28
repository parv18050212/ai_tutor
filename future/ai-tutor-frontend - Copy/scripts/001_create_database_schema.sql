-- Create accessibility profiles lookup table
CREATE TABLE IF NOT EXISTS public.accessibility_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default accessibility profiles
INSERT INTO public.accessibility_profiles (name, description, icon, settings) VALUES
('Focus & Structure', 'Minimalist interface with clear organization and reduced distractions', 'focus', '{"theme": "minimal", "animations": false, "sidebar": "collapsed"}'),
('Reading & Fonts', 'Optimized typography and reading experience', 'book', '{"fontSize": "large", "fontFamily": "dyslexic", "lineHeight": "relaxed"}'),
('Vision & Contrast', 'High contrast colors and enhanced visual accessibility', 'eye', '{"contrast": "high", "colorBlind": true, "largeButtons": true}'),
('Auditory & Captions', 'Audio descriptions and visual indicators for sound', 'volume', '{"captions": true, "visualIndicators": true, "reducedAudio": true}')
ON CONFLICT (name) DO NOTHING;

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  accessibility_profile_id UUID REFERENCES public.accessibility_profiles(id),
  custom_settings JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study threads table
CREATE TABLE IF NOT EXISTS public.study_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.study_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.accessibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accessibility_profiles (public read access)
CREATE POLICY "accessibility_profiles_select_all"
  ON public.accessibility_profiles FOR SELECT
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- RLS Policies for study_threads
CREATE POLICY "study_threads_select_own"
  ON public.study_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "study_threads_insert_own"
  ON public.study_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_threads_update_own"
  ON public.study_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "study_threads_delete_own"
  ON public.study_threads FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "messages_delete_own"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_accessibility_profile_id ON public.profiles(accessibility_profile_id);
CREATE INDEX IF NOT EXISTS idx_study_threads_user_id ON public.study_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_study_threads_updated_at ON public.study_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
