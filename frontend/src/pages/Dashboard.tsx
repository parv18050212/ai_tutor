import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Clock, Trophy, Play, Brain, CheckCircle, Settings, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SubjectManager from "@/components/SubjectManager";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import { ProfileDialog } from "@/components/ProfileDialog";
import { HealthCheck } from "@/components/HealthCheck";

import { getAllExams } from "@/lib/subjects-data";
import { quizAPI, suggestionsAPI } from "@/lib/api";
import SmartSuggestions from "@/components/SmartSuggestions";
import SmartSuggestionsModal from "@/components/SmartSuggestionsModal";

interface UserProfile {
  display_name: string | null;
  learning_preferences: any;
  bio: string | null;
  accessibility_needs: string[];
  exam_id: string | null;
  user_id: string;
}

interface RecentSession {
  id: string;
  subject_name: string;
  chapter_name: string;
  exam_id: string;
  subject_id: string;
  chapter_id: string;
  message_count: number;
  started_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);
  const [showSubjectSelectionForQuiz, setShowSubjectSelectionForQuiz] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<string | undefined>();
  const [revisionRecommendations, setRevisionRecommendations] = useState<any[]>([]);
  const [quizAnalytics, setQuizAnalytics] = useState<any>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<any>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (profile) {
      checkSubjectStatus();
      fetchCurrentExam();
      fetchQuizAnalytics();
    }
  }, [profile]);

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch recent chat sessions with chapter and subject info
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          subject_id,
          chapter_id,
          exam_id,
          message_count,
          started_at,
          updated_at,
          subjects!inner(name),
          chapters!inner(name)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (sessionError) {
        console.error('Session data error:', sessionError);
      } else {
        const formattedSessions = (sessionData || []).map(session => ({
          id: session.id,
          subject_name: session.subjects?.name || 'Unknown Subject',
          chapter_name: session.chapters?.name || 'Unknown Chapter',
          exam_id: session.exam_id,
          subject_id: session.subject_id,
          chapter_id: session.chapter_id,
          message_count: session.message_count || 0,
          started_at: session.started_at,
          updated_at: session.updated_at
        }));
        setRecentSessions(formattedSessions);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your dashboard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.display_name || "there";
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const getSubjectIcon = (subject: string) => {
    const icons: Record<string, any> = {
      'Physics': '⚡',
      'Chemistry': '🧪', 
      'Mathematics': '📐',
      'Biology': '🧬',
      'English': '📚',
      'History': '📜',
      'Geography': '🌍'
    };
    return icons[subject] || '📖';
  };

  const fetchCurrentExam = async () => {
    if (!profile?.exam_id) {
      setCurrentExam(null);
      return;
    }

    try {
      const exams = await getAllExams();
      const exam = exams.find(e => e.id === profile.exam_id);
      setCurrentExam(exam);
    } catch (error) {
      console.error('Error loading current exam:', error);
    }
  };

  const fetchQuizAnalytics = async () => {
    try {
      // Map exam names to the expected format
      const examTypeMapping: Record<string, string> = {
        "JEE Main": "jee",
        "JEE Advanced": "jee",
        "CUET": "cuet",
        "NEET": "neet",
        "BITSAT": "bitsat"
      };

      const examType = currentExam?.name ? examTypeMapping[currentExam.name] || currentExam.name.toLowerCase() : undefined;

      const [analytics, recommendations, smartSuggestionsData] = await Promise.all([
        quizAPI.getAnalytics(),
        quizAPI.getRevisionRecommendations(),
        suggestionsAPI.getSmart(examType)
      ]);

      setQuizAnalytics(analytics);
      setRevisionRecommendations(recommendations);
      setSmartSuggestions(smartSuggestionsData);
    } catch (error) {
      console.error('Error fetching quiz analytics:', error);
      // Don't show error to user as this is optional functionality
    }
  };

  const checkSubjectStatus = async () => {
    if (!profile?.exam_id) {
      setShowSubjectManager(false);
      return;
    }

    const userSubjects = getUserSubjects();
    
    // Always load available subjects for this exam (needed for display)
    try {
      const exams = await getAllExams();
      const exam = exams.find(e => e.id === profile.exam_id);
      if (exam) {
        setAvailableSubjects(exam.subjects);
      }
    } catch (error) {
      console.error('Error loading exam subjects:', error);
    }
    
    // If no subjects selected, show subject manager
    if (userSubjects.length === 0) {
      setShowSubjectManager(true);
    } else {
      setShowSubjectManager(false);
    }
  };

  const getUserSubjects = () => {
    if (!profile?.learning_preferences) return [];
    try {
      return profile.learning_preferences?.subjects || [];
    } catch {
      return [];
    }
  };

  const handleSubjectsUpdated = (subjects: string[]) => {
    if (profile) {
      setProfile({
        ...profile,
        learning_preferences: {
          ...profile.learning_preferences,
          subjects
        }
      });
      setShowSubjectManager(false);
      setIsEditingSubjects(false);
    }
  };

  const handleEditSubjects = () => {
    setIsEditingSubjects(true);
    setShowSubjectManager(true);
  };

  const handleCancelEdit = () => {
    setIsEditingSubjects(false);
    setShowSubjectManager(false);
  };

  const handleSubjectSelect = (examId: string, subjectId: string) => {
    navigate(`/chapter-selection/${examId}/${subjectId}`);
  };

  const handleQuizSubjectSelect = (subjectId: string) => {
    setShowSubjectSelectionForQuiz(false);
    const difficultyParam = quizDifficulty ? `?quiz=true&difficulty=${quizDifficulty}` : '?quiz=true';
    navigate(`/chapter-selection/${profile?.exam_id}/${subjectId}${difficultyParam}`);
  };

  const handleResumeLastSession = () => {
    if (profile?.exam_id && getUserSubjects().length > 0) {
      const firstSubject = getUserSubjects()[0];
      // Navigate to first available subject for now
      navigate(`/chapter-selection/${profile.exam_id}/${firstSubject}`);
    } else {
      toast({
        title: "Complete setup first",
        description: "Select your exam and subjects to start learning.",
      });
    }
  };

  const handleSuggestedRevision = () => {
    if (!profile?.exam_id || getUserSubjects().length === 0) {
      toast({
        title: "Complete setup first",
        description: "Select your exam and subjects to get suggestions.",
      });
      return;
    }

    // Show smart suggestions modal
    setShowSuggestionsModal(true);
  };

  const handleTakeQuiz = (difficulty?: string) => {
    if (profile?.exam_id && getUserSubjects().length > 0) {
      // If user has only one subject, go directly to chapter selection
      if (getUserSubjects().length === 1) {
        const firstSubject = getUserSubjects()[0];
        const difficultyParam = difficulty ? `?quiz=true&difficulty=${difficulty}` : '?quiz=true';
        navigate(`/chapter-selection/${profile.exam_id}/${firstSubject}${difficultyParam}`);
      } else {
        // Show subject selection modal or navigate to subject selection
        setShowSubjectSelectionForQuiz(true);
        setQuizDifficulty(difficulty);
      }
    } else {
      toast({
        title: "Complete setup first",
        description: "Select your exam and subjects to take quizzes.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Professional Header */}
      <header className="relative z-10 p-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AI Tutor Atypical Academy
              </h1>
              <p className="text-muted-foreground">
                {currentExam ? `Studying for ${currentExam.name}` : 'Complete your setup to get started'}
              </p>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {getGreeting()}
            </h2>
            <p className="text-muted-foreground text-lg">
              Ready to continue your learning journey?
            </p>
            {profile?.accessibility_needs && profile.accessibility_needs.length > 0 && (
              <div className="mt-4 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 inline-block">
                <p className="text-sm text-muted-foreground">
                  ✓ Accessibility preferences applied
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Backend Health Check - DEV ONLY */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex justify-center">
              <HealthCheck />
            </div>
          )}

          {/* Quick Actions Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-glow-primary">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Play className="h-6 w-6 text-primary" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={handleResumeLastSession}
                  className="h-20 bg-gradient-primary hover:opacity-90 transition-opacity flex flex-col gap-2"
                >
                  <Clock className="h-6 w-6" />
                  <span>Resume Last Session</span>
                </Button>
                <Button
                  onClick={handleSuggestedRevision}
                  variant="outline"
                  className="h-20 border-border/50 text-foreground hover:bg-accent hover:text-accent-foreground flex flex-col gap-2 backdrop-blur-sm relative"
                >
                  <Brain className="h-6 w-6" />
                  <span>
                    {smartSuggestions?.recommendations?.length > 0 ? 'Smart Suggestions' : 'Study Suggestions'}
                  </span>
                  {smartSuggestions?.recommendations?.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                  )}
                </Button>
                <div className="relative group">
                  <Button
                    onClick={() => handleTakeQuiz()}
                    variant="outline"
                    className="h-20 border-border/50 text-foreground hover:bg-accent hover:text-accent-foreground flex flex-col gap-2 backdrop-blur-sm w-full"
                  >
                    <Trophy className="h-6 w-6" />
                    <span>Take {currentExam?.name || 'Exam'} Quiz</span>
                  </Button>

                  {/* Exam-specific difficulty options - shown on hover */}
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 p-2 space-y-1">
                    <Button
                      onClick={() => handleTakeQuiz('foundation')}
                      variant="ghost"
                      size="sm"
                      className="w-full text-left justify-start text-xs"
                    >
                      📚 Foundation Level
                    </Button>
                    <Button
                      onClick={() => handleTakeQuiz('intermediate')}
                      variant="ghost"
                      size="sm"
                      className="w-full text-left justify-start text-xs"
                    >
                      📖 Intermediate Level
                    </Button>
                    <Button
                      onClick={() => handleTakeQuiz('advanced')}
                      variant="ghost"
                      size="sm"
                      className="w-full text-left justify-start text-xs"
                    >
                      🎯 Advanced Level
                    </Button>
                    <Button
                      onClick={() => handleTakeQuiz('exam_level')}
                      variant="ghost"
                      size="sm"
                      className="w-full text-left justify-start text-xs font-semibold"
                    >
                      🏆 {currentExam?.name || 'Exam'}-Level Challenge
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Quiz Performance Section */}
        {quizAnalytics && quizAnalytics.total_quizzes > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-glow-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Quiz Performance
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {quizAnalytics.total_quizzes}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Quizzes</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {quizAnalytics.average_score}%
                  </div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {quizAnalytics.average_readiness_score}%
                  </div>
                  <div className="text-sm text-muted-foreground">Exam Readiness</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    quizAnalytics.improvement_trend === 'improving' ? 'text-green-500' :
                    quizAnalytics.improvement_trend === 'declining' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {quizAnalytics.improvement_trend === 'improving' ? '📈' :
                     quizAnalytics.improvement_trend === 'declining' ? '📉' : '➡️'}
                  </div>
                  <div className="text-sm text-muted-foreground">Trend</div>
                </div>
              </div>

              {/* Areas needing improvement */}
              {quizAnalytics.weak_subjects?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    Areas for Improvement
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {quizAnalytics.weak_subjects.slice(0, 3).map((weakSubject: any, index: number) => (
                      <div
                        key={index}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-sm"
                      >
                        {weakSubject.subject}: {weakSubject.average}%
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strong subjects */}
              {quizAnalytics.strong_subjects?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    Strong Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {quizAnalytics.strong_subjects.slice(0, 3).map((strongSubject: any, index: number) => (
                      <div
                        key={index}
                        className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm"
                      >
                        {strongSubject.subject}: {strongSubject.average}%
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Performance Insights & Smart Analytics */}
        {smartSuggestions && smartSuggestions.performance_summary?.total_quizzes > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-glow-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                  <Brain className="h-6 w-6 text-primary" />
                  Performance Insights
                </h2>
                <Button
                  onClick={() => setShowSuggestionsModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-border/50 text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  View All Suggestions
                </Button>
              </div>

              {/* Performance Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {smartSuggestions.performance_summary.total_quizzes}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Quizzes</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {smartSuggestions.performance_summary.average_score?.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary capitalize">
                    {smartSuggestions.performance_summary.performance_trend}
                  </div>
                  <div className="text-sm text-muted-foreground">Trend</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {smartSuggestions.study_insights.weak_areas_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Areas to Focus</div>
                </div>
              </div>

              {/* Study Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-card-foreground">Study Insights</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Improvement Potential:</span>
                      <span className="capitalize font-medium">{smartSuggestions.study_insights.improvement_potential}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Study Consistency:</span>
                      <span className="capitalize font-medium">{smartSuggestions.study_insights.study_consistency}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-card-foreground">Next Actions</h3>
                  <div className="space-y-1">
                    {smartSuggestions.next_best_actions?.slice(0, 3).map((action: string, index: number) => (
                      <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subject Manager or Subjects Grid Section */}
        {(showSubjectManager || isEditingSubjects) && profile?.exam_id ? (
          <SubjectManager
            examId={profile.exam_id}
            userId={profile.user_id}
            onSubjectsUpdated={handleSubjectsUpdated}
            currentSubjects={getUserSubjects()}
          />
        ) : (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-glow-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  Your Subjects
                </h2>
                {getUserSubjects().length > 0 && (
                  <Button 
                    onClick={handleEditSubjects}
                    variant="outline"
                    size="sm"
                    className="border-border/50 text-foreground hover:bg-accent hover:text-accent-foreground backdrop-blur-sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Subjects
                  </Button>
                )}
              </div>
              {getUserSubjects().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getUserSubjects().map((subjectId) => {
                    const subject = availableSubjects.find(s => s.id === subjectId);
                    const subjectName = subject?.name || subjectId;
                    
                    return (
                      <Card 
                        key={subjectId}
                        className="cursor-pointer transition-all duration-300 hover:shadow-glow-primary hover:scale-105 bg-card/80 backdrop-blur-sm border-border/50"
                        onClick={() => handleSubjectSelect(profile.exam_id!, subjectId)}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl mb-3">
                            {getSubjectIcon(subjectName)}
                          </div>
                          <h3 className="text-lg font-semibold text-card-foreground mb-2">
                            {subjectName}
                          </h3>
                          <Button 
                            size="sm"
                            className="bg-gradient-primary hover:opacity-90 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubjectSelect(profile.exam_id!, subjectId);
                            }}
                          >
                            Start Learning
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {profile?.exam_id 
                      ? "Loading your subjects..." 
                      : "Complete your onboarding to see subjects."}
                  </p>
                  <Button 
                    onClick={() => navigate('/onboarding')}
                    variant="outline"
                    className="border-border/50 text-foreground hover:bg-accent hover:text-accent-foreground backdrop-blur-sm"
                  >
                    Complete Setup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

          {/* Recent Activity Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-glow-primary">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-primary" />
                Recent Activity
              </h2>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-muted/50 backdrop-blur-sm rounded-lg hover:bg-muted/80 transition-colors border border-border/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {getSubjectIcon(session.subject_name)}
                        </span>
                        <h3 className="text-sm font-medium text-card-foreground">
                          {session.subject_name} - {session.chapter_name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.started_at).toLocaleDateString()} at{' '}
                          {new Date(session.started_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {session.message_count > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {session.message_count} messages
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/tutor/${session.exam_id}/${session.subject_id}/${session.chapter_id}`)}
                      className="bg-gradient-primary hover:opacity-90 transition-opacity ml-4"
                    >
                      Continue
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No recent activity yet.</p>
                <p className="text-sm text-muted-foreground">
                  Start a conversation with your AI tutor to see your activity here.
                </p>
              </div>
            )}
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Subject Selection Modal for Quiz */}
      <Dialog open={showSubjectSelectionForQuiz} onOpenChange={setShowSubjectSelectionForQuiz}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Select Subject for Quiz</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {getUserSubjects().map((subjectId) => {
              const subject = availableSubjects.find(s => s.id === subjectId);
              const subjectName = subject?.name || subjectId;

              return (
                <Card
                  key={subjectId}
                  className="cursor-pointer transition-all duration-300 hover:shadow-glow-primary hover:scale-105 bg-card/80 backdrop-blur-sm border-border/50"
                  onClick={() => handleQuizSubjectSelect(subjectId)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">
                      {getSubjectIcon(subjectName)}
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {subjectName}
                    </h3>
                    <Button
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90 transition-opacity w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuizSubjectSelect(subjectId);
                      }}
                    >
                      Take Quiz
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Suggestions Modal */}
      <SmartSuggestionsModal
        isOpen={showSuggestionsModal}
        onClose={() => setShowSuggestionsModal(false)}
        suggestions={smartSuggestions}
        currentExam={currentExam}
        userSubjects={getUserSubjects()}
      />
    </div>
  );
};

export default Dashboard;