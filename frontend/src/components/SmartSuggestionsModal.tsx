import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Lightbulb,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

interface SmartSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SmartSuggestionsData | null;
  currentExam?: any;
  userSubjects?: string[];
}

const SmartSuggestionsModal = ({
  isOpen,
  onClose,
  suggestions,
  currentExam,
  userSubjects = []
}: SmartSuggestionsModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
        navigate(`/quiz/${currentExam?.id}/${target_subject}/${target_chapter}`);
      } else if (userSubjects.length > 0) {
        // Navigate to first available subject
        navigate(`/chapters/${currentExam?.id}/${userSubjects[0]}`);
      } else {
        toast({
          title: "Setup Required",
          description: "Please select your subjects first to take a quiz",
          variant: "default",
        });
      }
    } else if (action_type === "tutor_chat") {
      if (target_chapter && target_subject) {
        navigate(`/tutor/${currentExam?.id}/${target_subject}/${target_chapter}`);
      } else if (userSubjects.length > 0) {
        // Navigate to first available subject
        navigate(`/chapters/${currentExam?.id}/${userSubjects[0]}`);
      } else {
        toast({
          title: "Setup Required",
          description: "Please select your subjects first to start learning",
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

    onClose();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "stable": return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!suggestions) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Study Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Take some quizzes to get personalized suggestions!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Study Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {suggestions.performance_summary.total_quizzes}
              </div>
              <div className="text-sm text-muted-foreground">Quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {suggestions.performance_summary.average_score?.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center gap-1 text-lg font-bold">
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
              <div className="text-sm text-muted-foreground">Focus Areas</div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Personalized Recommendations
            </h4>

            {suggestions.recommendations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Take a quiz to get personalized recommendations!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {suggestions.recommendations.slice(0, 6).map((rec, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(rec.action_type)}
                          <h5 className="font-semibold">{rec.title}</h5>
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
                ))}
              </div>
            )}
          </div>

          {/* Next Best Actions */}
          {suggestions.next_best_actions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Next Best Actions
              </h4>
              <ul className="space-y-2">
                {suggestions.next_best_actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartSuggestionsModal;