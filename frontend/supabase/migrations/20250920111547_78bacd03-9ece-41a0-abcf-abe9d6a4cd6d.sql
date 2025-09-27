-- Update chat_history RLS policies to allow service role access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can update their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.chat_history;

-- Create new policies that allow service role OR user access
CREATE POLICY "Users and service role can create chat history" 
ON public.chat_history 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY "Users and service role can view chat history" 
ON public.chat_history 
FOR SELECT 
USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY "Users and service role can update chat history" 
ON public.chat_history 
FOR UPDATE 
USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY "Users and service role can delete chat history" 
ON public.chat_history 
FOR DELETE 
USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);