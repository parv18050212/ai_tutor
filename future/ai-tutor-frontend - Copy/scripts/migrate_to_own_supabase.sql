-- Migration script for your own Supabase instance
-- Run this in your Supabase SQL editor

-- Create accessibility_profiles table
CREATE TABLE IF NOT EXISTS public.accessibility_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    accessibility_profile_id UUID REFERENCES public.accessibility_profiles(id),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    custom_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_threads table
CREATE TABLE IF NOT EXISTS public.study_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES public.study_threads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default accessibility profiles
INSERT INTO public.accessibility_profiles (name, description, icon, settings) VALUES
('Focus & Structure', 'Minimalist interface with clear navigation and reduced distractions', '🎯', '{"theme": "minimal", "animations": false, "sidebar": "always_visible"}'),
('Reading & Fonts', 'Optimized typography with dyslexia-friendly fonts and spacing', '📖', '{"font": "dyslexic", "line_height": 1.8, "letter_spacing": 0.1}'),
('Vision & Contrast', 'High contrast colors and larger text for better visibility', '👁️', '{"contrast": "high", "text_size": "large", "colors": "high_contrast"}'),
('Auditory & Captions', 'Visual indicators and text alternatives for audio content', '🔊', '{"captions": true, "visual_alerts": true, "sound_alternatives": true}')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Study threads policies
CREATE POLICY "Users can view own threads" ON public.study_threads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads" ON public.study_threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON public.study_threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads" ON public.study_threads
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own threads" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.study_threads 
            WHERE study_threads.id = messages.thread_id 
            AND study_threads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own threads" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.study_threads 
            WHERE study_threads.id = messages.thread_id 
            AND study_threads.user_id = auth.uid()
        )
    );

-- Accessibility profiles policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view accessibility profiles" ON public.accessibility_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
