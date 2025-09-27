-- Add this SQL function to your Supabase database
-- Go to Supabase Dashboard > SQL Editor and run this:

CREATE OR REPLACE FUNCTION increment_session_message_count(session_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE chat_sessions
  SET message_count = message_count + 1,
      updated_at = now()
  WHERE id = session_id;
$$;