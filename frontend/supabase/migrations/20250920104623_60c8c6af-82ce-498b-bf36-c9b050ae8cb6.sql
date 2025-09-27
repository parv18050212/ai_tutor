-- Add unique constraint to ensure one session per user/chapter combination
ALTER TABLE chat_sessions ADD CONSTRAINT unique_user_chapter_session 
UNIQUE (user_id, chapter_id);

-- Add session status enum
CREATE TYPE session_status AS ENUM ('active', 'completed', 'archived');

-- Add status column to chat_sessions
ALTER TABLE chat_sessions ADD COLUMN status session_status DEFAULT 'active';

-- Update existing sessions to be active
UPDATE chat_sessions SET status = 'active' WHERE status IS NULL;

-- Remove the is_active column as we'll use status instead
ALTER TABLE chat_sessions DROP COLUMN is_active;

-- Add session message count for better tracking
ALTER TABLE chat_sessions ADD COLUMN message_count INTEGER DEFAULT 0;

-- Create function to update message count
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_sessions 
    SET message_count = message_count + 1,
        updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_sessions 
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update message count
CREATE TRIGGER chat_history_message_count_trigger
  AFTER INSERT OR DELETE ON chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_session_message_count();

-- Update existing sessions with current message counts
UPDATE chat_sessions 
SET message_count = (
  SELECT COUNT(*) 
  FROM chat_history 
  WHERE session_id = chat_sessions.id
);

-- Add session started_at timestamp for better tracking
ALTER TABLE chat_sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT now();