import api from '@/lib/api';

export interface ChatRequest {
  question: string;
  session_id?: string;
  exam_id?: string;
  subject_id?: string;
  chapter_id?: string;
  exam_name?: string;
  subject_name?: string;
  chapter_name?: string;
  images?: string[];
  accessibility_settings?: any;
}

export interface ChatResponse {
  answer: string;
}

export interface ChatHistoryResponse {
  history: Array<{
    role: string;
    message: string;
    created_at: string;
  }>;
}

export interface SessionResponse {
  sessions: Array<{
    id: string;
    session_name: string;
    status: 'active' | 'completed' | 'archived';
    message_count: number;
    created_at: string;
    updated_at: string;
    started_at: string;
    exam_id: string;
    subject_id: string;
    chapter_id: string;
  }>;
}

export interface QuizGenerationRequest {
  chapter: string;
  exam_type: string;
  n?: number;
  difficulty?: string;
  reading_level?: string;
  accessibility_needs?: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: number;
  hint: string;
  explanation: string;
  difficulty_level: string;
  question_type: string;
  time_estimate: number;
}

export interface QuizResponse {
  questions: QuizQuestion[];
  exam_type: string;
  difficulty_level: string;
  total_estimated_time: number;
  recommendations?: string;
}

export interface QuizResult {
  quiz_id: string;
  user_id: string;
  exam_type: string;
  subject_name: string;
  chapter_name: string;
  difficulty_level: string;
  score: number;
  total_questions: number;
  time_taken: number;
  concepts_mastered: string[];
  concepts_needing_work: string[];
  exam_readiness_score: number;
  recommended_next_difficulty: string;
}

export interface QuizAnalytics {
  total_quizzes: number;
  average_score: number;
  average_readiness_score: number;
  improvement_trend: 'improving' | 'stable' | 'declining';
  strong_subjects: Array<{ subject: string; average: number }>;
  weak_subjects: Array<{ subject: string; average: number }>;
  exam_readiness: Record<string, { average_readiness: number; quiz_count: number }>;
  recent_performance: Array<{
    date: string;
    score: number;
    total: number;
    exam_type: string;
    difficulty: string;
  }>;
}

export const chatService = {
  // Send message to AI tutor
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post('/api/chat', request);
    return response.data;
  },

  // Get chat history (session-specific if session_id provided)
  getChatHistory: async (sessionId?: string): Promise<ChatHistoryResponse> => {
    const params = sessionId ? { session_id: sessionId } : {};
    const response = await api.get('/api/chat/history', { params });
    return response.data;
  },

  // Clear chat history (session-specific if session_id provided)
  clearChatHistory: async (sessionId?: string): Promise<{ message: string }> => {
    const data = sessionId ? { session_id: sessionId } : {};
    const response = await api.post('/api/chat/clear', data);
    return response.data;
  },

  // Get all user sessions
  getUserSessions: async (): Promise<SessionResponse> => {
    const response = await api.get('/api/sessions');
    return response.data;
  },

  // Archive a specific session
  archiveSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/sessions/${sessionId}/archive`);
    return response.data;
  },

  // Generate quiz questions
  generateQuiz: async (request: QuizGenerationRequest): Promise<QuizResponse> => {
    const params = new URLSearchParams();
    params.append('chapter', request.chapter);
    params.append('exam_type', request.exam_type);
    if (request.n) params.append('n', request.n.toString());
    if (request.difficulty) params.append('difficulty', request.difficulty);
    if (request.reading_level) params.append('reading_level', request.reading_level);
    if (request.accessibility_needs) params.append('accessibility_needs', request.accessibility_needs);

    const response = await api.get(`/api/quiz/generate?${params.toString()}`);
    return response.data;
  },

  // Submit quiz results
  submitQuizResult: async (result: QuizResult): Promise<{
    message: string;
    exam_readiness_score: number;
    recommended_next_difficulty: string;
    performance_insights: string;
  }> => {
    const response = await api.post('/api/quiz/submit', result);
    return response.data;
  },

  // Get quiz analytics
  getQuizAnalytics: async (
    userId: string,
    examType?: string,
    days: number = 30
  ): Promise<QuizAnalytics> => {
    const params = new URLSearchParams();
    if (examType) params.append('exam_type', examType);
    params.append('days', days.toString());

    const response = await api.get(`/api/quiz/analytics/${userId}?${params.toString()}`);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; message: string }> => {
    const response = await api.get('/api/health');
    return response.data;
  }
};