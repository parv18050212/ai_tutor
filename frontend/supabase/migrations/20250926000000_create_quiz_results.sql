-- Create quiz_results table for storing quiz performance data
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id TEXT PRIMARY KEY DEFAULT ('quiz_' || extract(epoch from now()) || '_' || substr(gen_random_uuid()::text, 1, 8)),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_type TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    chapter_name TEXT NOT NULL,
    difficulty_level TEXT NOT NULL DEFAULT 'intermediate',
    score INTEGER NOT NULL CHECK (score >= 0),
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    time_taken INTEGER NOT NULL DEFAULT 0, -- in seconds
    concepts_mastered TEXT[] DEFAULT '{}',
    concepts_needing_work TEXT[] DEFAULT '{}',
    exam_readiness_score DECIMAL(5,2) DEFAULT 0.0 CHECK (exam_readiness_score >= 0 AND exam_readiness_score <= 100),
    recommended_next_difficulty TEXT DEFAULT 'intermediate',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_exam ON public.quiz_results(user_id, exam_type);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_subject ON public.quiz_results(user_id, subject_name);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON public.quiz_results(completed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own quiz results"
    ON public.quiz_results
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results"
    ON public.quiz_results
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz results"
    ON public.quiz_results
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_quiz_results_updated_at_trigger
    BEFORE UPDATE ON public.quiz_results
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_results_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;