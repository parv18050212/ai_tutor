import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Lightbulb, Volume2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { isValidRoute, getSubjectById, getChapterById } from "@/lib/subjects-data";
import { supabase } from "@/integrations/supabase/client";
import ChapterSuggestions from "@/components/ChapterSuggestions";
import ErrorBoundary from "@/components/ErrorBoundary";

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: number;
  hint: string;
  explanation: string;
}

interface QuizResult {
  score: number;
  total: number;
  questions: QuizQuestion[];
  userAnswers: (number | null)[];
}

const Quiz = () => {
  const { exam, subject, chapter } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useAccessibility();

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-9), debugMessage]); // Keep last 10 messages
  };

  // Component lifecycle tracking
  useEffect(() => {
    addDebugInfo('Quiz component mounted');
    setIsComponentMounted(true);

    return () => {
      addDebugInfo('Quiz component unmounting');
      setIsComponentMounted(false);
    };
  }, []);
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [subjectData, setSubjectData] = useState<any>(null);
  const [chapterData, setChapterData] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [submittingResult, setSubmittingResult] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  // Load subject and chapter data
  useEffect(() => {
    const loadData = async () => {
      addDebugInfo(`Loading subject/chapter data: exam=${exam}, subject=${subject}, chapter=${chapter}`);
      if (exam && subject && chapter) {
        try {
          const [subjectInfo, chapterInfo] = await Promise.all([
            getSubjectById(exam, subject),
            getChapterById(chapter)
          ]);
          setSubjectData(subjectInfo);
          setChapterData(chapterInfo);
          addDebugInfo(`Subject/chapter data loaded: ${subjectInfo?.name || 'unknown'} - ${chapterInfo?.name || 'unknown'}`);
        } catch (error: any) {
          addDebugInfo(`Failed to load subject/chapter data: ${error.message}`);
        }
      }
    };
    loadData();
  }, [exam, subject, chapter]);
  
  // Redirect if invalid route
  useEffect(() => {
    const checkRoute = async () => {
      if (exam && subject && chapter) {
        const routeValid = await isValidRoute(exam, subject, chapter);
        if (!routeValid) {
          navigate(`/chapters/${exam}/${subject}`);
        }
      }
    };
    checkRoute();
  }, [exam, subject, chapter, navigate]);

  useEffect(() => {
    if (chapter && subject && exam) {
      addDebugInfo(`Starting quiz fetch for: ${chapter}`);
      fetchQuizQuestions();
    } else {
      addDebugInfo(`Missing required params: exam=${exam}, subject=${subject}, chapter=${chapter}`);
      setError('Missing required quiz parameters');
    }
  }, [chapter, subject, exam]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        const optionIndex = parseInt(e.key) - 1;
        if (optionIndex < currentQuestion.options.length) {
          setSelectedAnswer(optionIndex);
        }
      } else if (e.key === 'Enter' && selectedAnswer !== null) {
        handleNextQuestion();
      } else if (e.key === 'h' || e.key === 'H') {
        toggleHint();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedAnswer, currentQuestionIndex]);

  const fetchQuizQuestions = async () => {
    try {
      addDebugInfo('Starting quiz question fetch');
      setLoading(true);
      setError(null);

      addDebugInfo(`API call: /api/quiz/generate?chapter=${chapter}&subject=${subject}&n=5`);

      const response = await api.get(`/api/quiz/generate?chapter=${chapter}&subject=${subject}&n=5`);
      const fetchedQuestions = response.data.questions || response.data;

      addDebugInfo(`Questions received: ${fetchedQuestions?.length || 0} questions`);

      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        throw new Error('No quiz questions were generated');
      }

      setQuestions(fetchedQuestions);
      setUserAnswers(new Array(fetchedQuestions.length).fill(null));
      setError(null);
      addDebugInfo('Quiz questions loaded successfully');
    } catch (error: any) {
      addDebugInfo(`Quiz fetch failed: ${error.response?.status} - ${error.message}`);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to load quiz questions";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      addDebugInfo('Quiz fetch process completed');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    try {
      addDebugInfo(`Moving from question ${currentQuestionIndex + 1} to next`);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(userAnswers[currentQuestionIndex + 1]);
        setShowHint(false);
        addDebugInfo(`Moved to question ${currentQuestionIndex + 2}`);
      } else {
        addDebugInfo('Finishing quiz - on last question');
        finishQuiz();
      }
    } catch (error: any) {
      addDebugInfo(`Error in handleNextQuestion: ${error.message}`);
      console.error('Error in handleNextQuestion:', error);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex - 1]);
      setShowHint(false);
    }
  };

  const toggleHint = () => {
    setShowHint(!showHint);
    if (!showHint && settings?.textToSpeech && currentQuestion.hint) {
      const utterance = new SpeechSynthesisUtterance(currentQuestion.hint);
      speechSynthesis.speak(utterance);
    }
  };

  const finishQuiz = async () => {
    try {
      console.log('🏁 Finishing quiz...', { questionsCount: questions.length, answersCount: userAnswers.length });
      setQuizError(null);

      // Validate we have questions and answers
      if (!questions || questions.length === 0) {
        throw new Error('No questions available to calculate score');
      }

      if (!userAnswers || userAnswers.length !== questions.length) {
        console.warn('⚠️ Answer count mismatch:', { expected: questions.length, actual: userAnswers.length });
      }

      const score = userAnswers.reduce((acc, answer, index) => {
        return acc + (answer === questions[index]?.correct_answer ? 1 : 0);
      }, 0);

      const timeTaken = Math.floor((Date.now() - startTime) / 1000); // in seconds

      const result = {
        score,
        total: questions.length,
        questions,
        userAnswers
      };

      console.log('📊 Quiz result calculated:', { score, total: questions.length, timeTaken });

      // Always show results first, regardless of submission success
      addDebugInfo('Setting quiz result and showing results screen');

      // Defensive check to ensure component is still mounted
      if (!isComponentMounted) {
        addDebugInfo('Component not mounted, aborting result display');
        return;
      }

      setQuizResult(result);
      setShowResults(true);
      addDebugInfo('Results screen should now be visible');

      // Submit quiz result to backend (don't block UI on this)
      console.log('💾 Submitting quiz result in background...');
      submitQuizResult(score, questions.length, timeTaken).catch(error => {
        console.error('❌ Background submission failed:', error);
        // Don't show error toast here as results are already displayed
      });

      console.log('✅ Quiz completion flow finished successfully');
    } catch (error: any) {
      console.error('❌ Critical error finishing quiz:', error);

      const errorMessage = error.message || 'Failed to complete quiz';
      setQuizError(errorMessage);

      // Still try to show results if we have some data
      if (questions.length > 0) {
        const fallbackScore = userAnswers.reduce((acc, answer, index) => {
          return acc + (answer === questions[index]?.correct_answer ? 1 : 0);
        }, 0);

        const fallbackResult = {
          score: fallbackScore,
          total: questions.length,
          questions,
          userAnswers
        };

        setQuizResult(fallbackResult);
        setShowResults(true);

        toast({
          title: "Quiz Completed with Issues",
          description: "Your quiz results are shown below, but there was an error saving them.",
          variant: "destructive",
        });
      } else {
        // Complete failure - show error state
        toast({
          title: "Quiz Completion Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const submitQuizResult = async (score: number, totalQuestions: number, timeTaken: number) => {
    try {
      addDebugInfo('Starting quiz result submission');
      setSubmittingResult(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addDebugInfo('No authenticated user found for submission');
        return;
      }
      addDebugInfo(`Submitting for user: ${user.id}`);

      // Analyze wrong and correct answers to determine concepts
      const conceptsNeeding = [];
      const conceptsMastered = [];

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const userAnswer = userAnswers[i];
        const isCorrect = userAnswer === question.correct_answer;

        // Extract concept from question (simplified approach)
        const concept = question.text.split(/\b(theorem|law|principle|concept|formula|method)\b/i)[0]?.trim() ||
                       chapterData?.name || chapter?.replace(/-/g, ' ');

        if (isCorrect) {
          if (!conceptsMastered.includes(concept)) {
            conceptsMastered.push(concept);
          }
        } else {
          if (!conceptsNeeding.includes(concept)) {
            conceptsNeeding.push(concept);
          }
        }
      }

      const quizResultData = {
        quiz_id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        exam_type: exam === "550e8400-e29b-41d4-a716-446655440001" ? "jee" : "cuet",
        subject_name: subjectData?.name || "Unknown Subject",
        chapter_name: chapterData?.name || chapter?.replace(/-/g, ' ') || "Unknown Chapter",
        difficulty_level: "intermediate", // Default for now
        score,
        total_questions: totalQuestions,
        time_taken: timeTaken,
        concepts_mastered: conceptsMastered.slice(0, 5), // Limit to top 5
        concepts_needing_work: conceptsNeeding.slice(0, 5) // Limit to top 5
      };

      addDebugInfo(`Posting to /api/quiz/submit with data: ${JSON.stringify(quizResultData, null, 2)}`);
      const response = await api.post('/api/quiz/submit', quizResultData);
      addDebugInfo(`Submission response: ${response.status} - ${JSON.stringify(response.data)}`);

      if (response.data) {
        toast({
          title: "Quiz Completed!",
          description: `Score: ${score}/${totalQuestions}. ${response.data.performance_insights || ''}`,
        });
        addDebugInfo('Quiz submission successful');
      }
    } catch (error: any) {
      addDebugInfo(`Quiz submission error: ${error.response?.status} - ${error.message}`);
      addDebugInfo(`Error details: ${JSON.stringify(error.response?.data || error.message)}`);
      toast({
        title: "Quiz completed",
        description: error.response?.data?.detail || "Your score has been recorded locally.",
        variant: "destructive"
      });
    } finally {
      setSubmittingResult(false);
      addDebugInfo('Quiz submission process completed');
    }
  };

  const restartQuiz = () => {
    try {
      addDebugInfo('Restarting quiz');
      setCurrentQuestionIndex(0);
      setUserAnswers(new Array(questions.length).fill(null));
      setSelectedAnswer(null);
      setShowHint(false);
      setShowResults(false);
      setQuizResult(null);
      setQuizError(null);
      setStartTime(Date.now());
      addDebugInfo('Quiz restarted successfully');
    } catch (error: any) {
      addDebugInfo(`Error restarting quiz: ${error.message}`);
      console.error('Error restarting quiz:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz questions...</p>
          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
            <div className="mt-4 text-xs text-left max-w-md mx-auto">
              <p className="font-semibold mb-1">Loading Progress:</p>
              {debugInfo.slice(-3).map((info, index) => (
                <p key={index} className="text-muted-foreground">{info}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showResults && quizResult) {
    return (
      <div className="min-h-screen bg-gradient-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-card-foreground">
                {quizError ? 'Quiz Completed with Issues' : 'Quiz Complete!'}
              </CardTitle>
              {quizError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-2">
                  <p className="text-sm text-destructive">⚠️ {quizError}</p>
                </div>
              )}
              <div className="text-6xl my-4">
                {quizResult.score >= quizResult.total * 0.8 ? "🎉" : 
                 quizResult.score >= quizResult.total * 0.6 ? "👏" : "📚"}
              </div>
              <p className="text-xl text-muted-foreground">
                You scored {quizResult.score} out of {quizResult.total}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {quizResult.questions.map((question, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      {quizResult.userAnswers[index] === question.correct_answer ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <p className="font-medium text-card-foreground">{question.text}</p>
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Your answer: {quizResult.userAnswers[index] !== null 
                          ? question.options[quizResult.userAnswers[index]!] 
                          : "Not answered"}
                      </p>
                      <p className="text-green-600">
                        Correct answer: {question.options[question.correct_answer]}
                      </p>
                      {question.explanation && (
                        <p className="text-muted-foreground italic">{question.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chapter Suggestions */}
              <div className="mt-6">
                <ChapterSuggestions
                  chapterId={chapter || ''}
                  examType={exam}
                  subjectId={subject}
                />
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={restartQuiz}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={submittingResult}
                >
                  {submittingResult && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Retake Quiz
                </Button>
                <Button
                  onClick={() => navigate(`/tutor/${exam}/${subject}/${chapter}`)}
                  variant="outline"
                  className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  disabled={submittingResult}
                >
                  Back to Tutor
                </Button>
              </div>
              {submittingResult && (
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Saving your quiz results...
                  </p>
                </div>
              )}

              {/* Debug Information Panel (only in development) */}
              {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg border">
                  <h3 className="font-semibold text-sm mb-2">Debug Information:</h3>
                  <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                    {debugInfo.map((info, index) => (
                      <div key={index} className="text-gray-600">{info}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-background p-6 flex items-center justify-center">
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-card-foreground">Quiz Loading Failed</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={fetchQuizQuestions}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate(`/tutor/${exam}/${subject}/${chapter}`)}
                variant="outline"
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Back to Tutor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-background p-6 flex items-center justify-center">
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <p className="text-card-foreground">No questions available for this chapter.</p>
            <Button
              onClick={() => navigate(`/tutor/${exam}/${subject}/${chapter}`)}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Back to Tutor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/tutor/${exam}/${subject}/${chapter}`)}
            className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tutor
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground capitalize">
              {chapterData?.name || chapter?.replace(/-/g, ' ')}
            </h1>
            <p className="text-muted-foreground">
              {subjectData?.name} • {exam?.toUpperCase()} • 5 questions — Step-by-step hints available
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-card-foreground">
              {currentQuestion.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  variant={selectedAnswer === index ? "default" : "outline"}
                  className={`w-full text-left justify-start p-4 h-auto ${
                    selectedAnswer === index 
                      ? "bg-primary text-primary-foreground" 
                      : "border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <span className="mr-3 font-bold">{index + 1}.</span>
                  {option}
                </Button>
              ))}
            </div>

            {/* Hint Section */}
            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={toggleHint}
                className="mb-3 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                {showHint ? "Hide" : "Show"} Hint
              </Button>
              {settings?.textToSpeech && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = showHint ? currentQuestion.hint : currentQuestion.text;
                    const utterance = new SpeechSynthesisUtterance(text);
                    speechSynthesis.speak(utterance);
                  }}
                  className="ml-2 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Read Aloud
                </Button>
              )}
              
              {showHint && (
                <div className="mt-3 p-4 bg-muted rounded-lg">
                  <p className="text-muted-foreground italic">
                    💡 {currentQuestion.hint}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                Previous
              </Button>
              <p className="text-sm text-muted-foreground self-center">
                Press 1-4 to select, H for hint, Enter to continue
              </p>
              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {currentQuestionIndex === questions.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Wrap Quiz component with ErrorBoundary
const QuizWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🚨 Quiz component error:', error);
        console.error('🚨 Error info:', errorInfo);
        // Could send to error reporting service here
      }}
    >
      <Quiz />
    </ErrorBoundary>
  );
};

export default QuizWithErrorBoundary;