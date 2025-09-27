import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SessionData {
  id: string;
  session_name: string;
  status: 'active' | 'completed' | 'archived';
  message_count: number;
  created_at: string;
  updated_at: string;
  started_at: string;
}

export const useChapterSession = (examId: string, subjectId: string, chapterId: string, chapterName?: string) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!examId || !subjectId || !chapterId) {
      setError('Invalid session parameters');
      setLoading(false);
      return;
    }

    initializeSession();
  }, [examId, subjectId, chapterId]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get or create the session for this chapter (enforcing one session per chapter)
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .single();

      let currentSessionId: string;
      let currentSessionData: SessionData;

      if (existingSession && !sessionError) {
        // Use existing session and ensure it's active
        currentSessionId = existingSession.id;
        currentSessionData = existingSession as SessionData;
        
        // Update session to active status and update timestamp
        const { data: updatedSession } = await supabase
          .from('chat_sessions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSessionId)
          .select()
          .single();

        if (updatedSession) {
          currentSessionData = updatedSession as SessionData;
        }
      } else {
        // Create new session (will be unique due to constraint)
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            exam_id: examId,
            subject_id: subjectId,
            chapter_id: chapterId,
            session_name: `${chapterName || 'Chapter'} - ${new Date().toLocaleDateString()}`,
            status: 'active',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        currentSessionId = newSession.id;
        currentSessionData = newSession as SessionData;
      }

      setSessionId(currentSessionId);
      setSessionData(currentSessionData);
    } catch (err) {
      console.error('Error initializing session:', err);
      setError('Failed to initialize session');
    } finally {
      setLoading(false);
    }
  };

  const startFreshSession = async () => {
    if (!sessionId || !chapterName) return false;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Archive current session by updating its status
      await supabase
        .from('chat_sessions')
        .update({ status: 'archived' })
        .eq('id', sessionId);

      // Delete chat history for clean start (both local and backend)
      try {
        await supabase
          .from('chat_history')
          .delete()
          .eq('session_id', sessionId);
      } catch (error) {
        console.warn('Failed to clear chat history locally:', error);
        // Continue with session creation even if local clear fails
      }

      // Create new session (this will replace the old one due to unique constraint)
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .upsert({
          user_id: user.id,
          exam_id: examId,
          subject_id: subjectId,
          chapter_id: chapterId,
          session_name: `${chapterName} - ${new Date().toLocaleDateString()}`,
          status: 'active',
          started_at: new Date().toISOString(),
          message_count: 0
        })
        .select()
        .single();

      if (!createError && newSession) {
        setSessionId(newSession.id);
        setSessionData(newSession as SessionData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error starting fresh session:', error);
      return false;
    }
  };

  const updateSessionData = (updates: Partial<SessionData>) => {
    if (sessionData) {
      setSessionData({ ...sessionData, ...updates });
    }
  };

  return {
    sessionId,
    sessionData,
    loading,
    error,
    startFreshSession,
    updateSessionData,
    refreshSession: initializeSession
  };
};