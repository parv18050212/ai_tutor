-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty TEXT,
  estimated_time_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  session_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to chat_history table
ALTER TABLE public.chat_history 
ADD COLUMN session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
ADD COLUMN chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exams (public read access)
CREATE POLICY "Allow public read access to exams" ON public.exams FOR SELECT USING (true);

-- Create RLS policies for subjects (public read access)
CREATE POLICY "Allow public read access to subjects" ON public.subjects FOR SELECT USING (true);

-- Create RLS policies for chapters (public read access)
CREATE POLICY "Allow public read access to chapters" ON public.chapters FOR SELECT USING (true);

-- Create RLS policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions 
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_subjects_exam_id ON public.subjects(exam_id);
CREATE INDEX idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_chapter_id ON public.chat_sessions(chapter_id);
CREATE INDEX idx_chat_history_session_id ON public.chat_history(session_id);

-- Create trigger for chat_sessions updated_at
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert exam data
INSERT INTO public.exams (id, name, description) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'JEE', 'Joint Entrance Examination for engineering colleges'),
('550e8400-e29b-41d4-a716-446655440002', 'CUET', 'Common University Entrance Test for central universities');

-- Insert JEE subjects
INSERT INTO public.subjects (id, exam_id, name, description, icon_name, color) VALUES 
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Physics', 'Comprehensive physics curriculum for JEE', 'Atom', '#3B82F6'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Chemistry', 'Complete chemistry syllabus for JEE', 'FlaskConical', '#10B981'),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'Mathematics', 'Advanced mathematics for JEE preparation', 'Calculator', '#8B5CF6');

-- Insert CUET subjects
INSERT INTO public.subjects (id, exam_id, name, description, icon_name, color) VALUES 
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'English', 'English language and literature', 'BookOpen', '#EF4444'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'History', 'Indian and world history', 'Scroll', '#F59E0B'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440002', 'Political Science', 'Political theory and Indian government', 'Users', '#06B6D4'),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440002', 'Economics', 'Microeconomics and macroeconomics', 'TrendingUp', '#84CC16'),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440002', 'Psychology', 'Introduction to psychology', 'Brain', '#F97316');

-- Insert Physics chapters
INSERT INTO public.chapters (subject_id, name, difficulty, estimated_time_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440011', 'Units and Measurements', 'Beginner', 45),
('550e8400-e29b-41d4-a716-446655440011', 'Motion in a Straight Line', 'Beginner', 60),
('550e8400-e29b-41d4-a716-446655440011', 'Motion in a Plane', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440011', 'Laws of Motion', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Work, Energy and Power', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440011', 'System of Particles and Rotational Motion', 'Advanced', 120),
('550e8400-e29b-41d4-a716-446655440011', 'Gravitation', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440011', 'Mechanical Properties of Solids', 'Intermediate', 60),
('550e8400-e29b-41d4-a716-446655440011', 'Mechanical Properties of Fluids', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Thermal Properties of Matter', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440011', 'Thermodynamics', 'Advanced', 105),
('550e8400-e29b-41d4-a716-446655440011', 'Kinetic Theory', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Oscillations', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440011', 'Waves', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Electric Charges and Fields', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Electrostatic Potential and Capacitance', 'Advanced', 105),
('550e8400-e29b-41d4-a716-446655440011', 'Current Electricity', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Moving Charges and Magnetism', 'Advanced', 105),
('550e8400-e29b-41d4-a716-446655440011', 'Magnetism and Matter', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Electromagnetic Induction', 'Advanced', 105),
('550e8400-e29b-41d4-a716-446655440011', 'Alternating Current', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Electromagnetic Waves', 'Advanced', 75),
('550e8400-e29b-41d4-a716-446655440011', 'Ray Optics and Optical Instruments', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Wave Optics', 'Advanced', 105),
('550e8400-e29b-41d4-a716-446655440011', 'Dual Nature of Radiation and Matter', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Atoms', 'Advanced', 75),
('550e8400-e29b-41d4-a716-446655440011', 'Nuclei', 'Advanced', 90),
('550e8400-e29b-41d4-a716-446655440011', 'Semiconductor Electronics', 'Advanced', 105);

-- Insert Chemistry chapters (sample)
INSERT INTO public.chapters (subject_id, name, difficulty, estimated_time_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440012', 'Some Basic Concepts of Chemistry', 'Beginner', 45),
('550e8400-e29b-41d4-a716-446655440012', 'Structure of Atom', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440012', 'Classification of Elements and Periodicity', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440012', 'Chemical Bonding and Molecular Structure', 'Advanced', 120),
('550e8400-e29b-41d4-a716-446655440012', 'States of Matter', 'Intermediate', 75);

-- Insert Mathematics chapters (sample)
INSERT INTO public.chapters (subject_id, name, difficulty, estimated_time_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440013', 'Sets', 'Beginner', 30),
('550e8400-e29b-41d4-a716-446655440013', 'Relations and Functions', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440013', 'Trigonometric Functions', 'Intermediate', 90),
('550e8400-e29b-41d4-a716-446655440013', 'Principle of Mathematical Induction', 'Advanced', 60),
('550e8400-e29b-41d4-a716-446655440013', 'Complex Numbers and Quadratic Equations', 'Advanced', 105);

-- Insert sample chapters for CUET subjects
INSERT INTO public.chapters (subject_id, name, difficulty, estimated_time_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440021', 'Reading Comprehension', 'Intermediate', 45),
('550e8400-e29b-41d4-a716-446655440021', 'Grammar and Usage', 'Beginner', 30),
('550e8400-e29b-41d4-a716-446655440022', 'Ancient India', 'Intermediate', 60),
('550e8400-e29b-41d4-a716-446655440022', 'Medieval India', 'Intermediate', 75),
('550e8400-e29b-41d4-a716-446655440023', 'Constitution and Governance', 'Advanced', 90);