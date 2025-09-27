import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  BookOpen,
  Target,
  Clock,
  ArrowRight,
  Loader2,
  Lightbulb,
  AlertCircle
} from "lucide-react";
import { suggestionsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ChapterSuggestion {
  type: string;
  title: string;
  description: string;
  action: string;
  priority?: string;
  target_concept?: string;
}

interface ChapterSuggestionsData {
  suggestions: ChapterSuggestion[];
  chapter_insights: {
    attempts?: number;
    average_score?: number;
    last_attempt?: string;
    status: string;
    recommendation?: string;
  };
}

interface ChapterSuggestionsProps {
  chapterId: string;
  examType?: string;
  subjectId?: string;
  className?: string;
}

const ChapterSuggestions = ({ chapterId, examType, subjectId, className }: ChapterSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<ChapterSuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (chapterId) {
      fetchChapterSuggestions();
    }
  }, [chapterId]);

  const fetchChapterSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await suggestionsAPI.getChapterSpecific(chapterId);
      setSuggestions(data);
    } catch (err: any) {
      console.error('Failed to fetch chapter suggestions:', err);
      setError(err.response?.data?.detail || 'Failed to load suggestions');
      // Don't show toast for errors in this component as it's optional
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "mastered": return "text-green-600";
      case "progressing": return "text-blue-600";
      case "needs_work": return "text-orange-600";
      case "unexplored": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "quiz": return <Target className="h-4 w-4" />;
      case "tutor_chat": return <Brain className="h-4 w-4" />;
      case "concept_review": return <BookOpen className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const handleActionClick = (suggestion: ChapterSuggestion) => {
    const { action } = suggestion;

    if (action === "quiz") {
      navigate(`/quiz/${examType}/${subjectId}/${chapterId}`);
    } else if (action === "tutor_chat") {
      // Already on tutor chat page, so just show a helpful message
      toast({
        title: "Perfect!",
        description: "You're already in the right place. Ask about the suggested concept!",
        variant: "default",
      });
    } else {
      toast({
        title: "Suggestion noted!",
        description: suggestion.description,
        variant: "default",
      });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Loading suggestions...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !suggestions) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Suggestions unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-4 w-4" />
          Chapter Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chapter Status */}
        {suggestions.chapter_insights && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant="outline" className={getStatusColor(suggestions.chapter_insights.status)}>
                {suggestions.chapter_insights.status.replace('_', ' ')}
              </Badge>
            </div>

            {suggestions.chapter_insights.attempts !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quiz Attempts:</span>
                <span>{suggestions.chapter_insights.attempts}</span>
              </div>
            )}

            {suggestions.chapter_insights.average_score !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average Score:</span>
                <span className={suggestions.chapter_insights.average_score >= 70 ? "text-green-600" : "text-orange-600"}>
                  {suggestions.chapter_insights.average_score.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.suggestions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Recommendations:</h4>
            {suggestions.suggestions.slice(0, 3).map((suggestion, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getActionIcon(suggestion.action)}
                      <h5 className="text-sm font-medium">{suggestion.title}</h5>
                      {suggestion.priority && (
                        <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                          {suggestion.priority}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{suggestion.description}</p>

                    {suggestion.target_concept && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.target_concept}
                      </Badge>
                    )}
                  </div>

                  <Button
                    onClick={() => handleActionClick(suggestion)}
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Take a quiz to get recommendations!</p>
          </div>
        )}

        {/* Quick Action */}
        {suggestions.chapter_insights.status === "unexplored" && (
          <Button
            onClick={() => navigate(`/quiz/${examType}/${subjectId}/${chapterId}`)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Target className="h-4 w-4 mr-2" />
            Take First Quiz
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ChapterSuggestions;