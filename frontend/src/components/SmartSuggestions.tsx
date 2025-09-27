import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lightbulb
} from "lucide-react";
import { suggestionsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface StudyRecommendation {
  type: string;
  title: string;
  description: string;
  priority: number;
  action_type: string;
  target_concept?: string;
  target_chapter?: string;
  target_subject?: string;
  estimated_time_minutes: number;
  difficulty_level?: string;
}

interface SmartSuggestionsData {
  recommendations: StudyRecommendation[];
  study_insights: {
    weak_areas_count: number;
    strong_areas_count: number;
    performance_trend: string;
    improvement_potential: string;
    study_consistency: string;
  };
  performance_summary: {
    total_quizzes: number;
    average_score: number;
    performance_trend: string;
    time_efficiency: number;
  };
  next_best_actions: string[];
}

interface SmartSuggestionsProps {
  examType?: string;
  currentSubject?: string;
  currentChapter?: string;
}

const SmartSuggestions = ({ examType, currentSubject, currentChapter }: SmartSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSmartSuggestions();
  }, [examType]);

  const fetchSmartSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await suggestionsAPI.getSmart(examType);
      setSuggestions(data);
    } catch (err: any) {
      console.error('Failed to fetch smart suggestions:', err);
      setError(err.response?.data?.detail || 'Failed to load suggestions');
      toast({
        title: "Error",
        description: "Failed to load smart suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return "destructive";
      case 4: return "destructive";
      case 3: return "default";
      case 2: return "secondary";
      case 1: return "outline";
      default: return "secondary";
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5: return "Critical";
      case 4: return "High";
      case 3: return "Medium";
      case 2: return "Low";
      case 1: return "Optional";
      default: return "Medium";
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "quiz": return <Target className="h-4 w-4" />;
      case "tutor_chat": return <Brain className="h-4 w-4" />;
      case "concept_review": return <BookOpen className="h-4 w-4" />;
      case "practice": return <CheckCircle2 className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const handleActionClick = (recommendation: StudyRecommendation) => {
    const { action_type, target_chapter, target_subject } = recommendation;

    if (action_type === "quiz") {
      if (target_chapter && target_subject) {
        navigate(`/quiz/${examType}/${target_subject}/${target_chapter}`);
      } else if (currentChapter && currentSubject) {
        navigate(`/quiz/${examType}/${currentSubject}/${currentChapter}`);
      } else {
        toast({
          title: "Action needed",
          description: "Please select a chapter to take a quiz",
          variant: "default",
        });
      }
    } else if (action_type === "tutor_chat") {
      if (target_chapter && target_subject) {
        navigate(`/tutor/${examType}/${target_subject}/${target_chapter}`);
      } else if (currentChapter && currentSubject) {
        navigate(`/tutor/${examType}/${currentSubject}/${currentChapter}`);
      } else {
        toast({
          title: "Action needed",
          description: "Please select a chapter to chat with the tutor",
          variant: "default",
        });
      }
    } else {
      toast({
        title: "Suggestion noted!",
        description: recommendation.description,
        variant: "default",
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "stable": return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading smart suggestions...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !suggestions) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {error || "Failed to load suggestions"}
          </p>
          <Button onClick={fetchSmartSuggestions} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {suggestions.performance_summary.total_quizzes}
              </div>
              <div className="text-sm text-muted-foreground">Quizzes Taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {suggestions.performance_summary.average_score?.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center gap-1 text-2xl font-bold">
                {getTrendIcon(suggestions.performance_summary.performance_trend)}
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {suggestions.performance_summary.performance_trend}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {suggestions.study_insights.weak_areas_count}
              </div>
              <div className="text-sm text-muted-foreground">Areas to Focus</div>
            </div>
          </div>

          {suggestions.performance_summary.average_score > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{suggestions.performance_summary.average_score?.toFixed(0)}%</span>
              </div>
              <Progress value={suggestions.performance_summary.average_score} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Smart Study Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.recommendations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Take a quiz to get personalized recommendations!</p>
            </div>
          ) : (
            suggestions.recommendations.map((rec, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getActionIcon(rec.action_type)}
                      <h4 className="font-semibold">{rec.title}</h4>
                      <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                        {getPriorityLabel(rec.priority)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">{rec.description}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {rec.estimated_time_minutes} min
                      </span>
                      {rec.difficulty_level && (
                        <Badge variant="outline" className="text-xs">
                          {rec.difficulty_level}
                        </Badge>
                      )}
                      {rec.target_concept && (
                        <Badge variant="outline" className="text-xs">
                          {rec.target_concept}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleActionClick(rec)}
                    variant={rec.priority >= 4 ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Next Best Actions */}
      {suggestions.next_best_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Next Best Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.next_best_actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartSuggestions;