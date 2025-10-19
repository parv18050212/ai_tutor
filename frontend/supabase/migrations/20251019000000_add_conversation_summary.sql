-- Add conversation summary fields to chat_sessions table
-- This enables memory optimization through periodic summarization

-- Add conversation_summary column to store summarized conversation history
ALTER TABLE public.chat_sessions
ADD COLUMN conversation_summary TEXT DEFAULT NULL;

-- Add last_summarized_at to track when summarization last occurred
ALTER TABLE public.chat_sessions
ADD COLUMN last_summarized_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying
CREATE INDEX idx_chat_sessions_last_summarized ON public.chat_sessions(last_summarized_at);

-- Add comment for documentation
COMMENT ON COLUMN public.chat_sessions.conversation_summary IS 'AI-generated summary of conversation history beyond the sliding window, capturing key topics, student understanding, and learning progress';
COMMENT ON COLUMN public.chat_sessions.last_summarized_at IS 'Timestamp of the last summarization operation, used to determine when to generate a new summary';
