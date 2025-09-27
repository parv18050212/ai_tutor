import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft, BookOpen, Target } from "lucide-react";
import { getSubject } from "@/lib/subjects-data";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ChapterSelection() {
  const navigate = useNavigate();
  const { exam, subject } = useParams<{ exam: string; subject: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [subjectData, setSubjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDisabilities, setSelectedDisabilities] = useState<string[]>([]);

  const isQuizMode = searchParams.get('quiz') === 'true';
  const difficulty = searchParams.get('difficulty');

  useEffect(() => {
    const stored = localStorage.getItem("accessibilityNeeds");
    if (stored) {
      setSelectedDisabilities(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const loadSubject = async () => {
      if (!exam || !subject) {
        navigate('/dashboard');
        return;
      }

      try {
        const subjectDataResult = await getSubject(exam, subject);
        if (!subjectDataResult) {
          toast({
            title: "Subject not found",
            description: "The requested subject could not be found.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }
        setSubjectData(subjectDataResult);
      } catch (error) {
        console.error('Error loading subject:', error);
        toast({
          title: "Error",
          description: "Failed to load subject data.",
          variant: "destructive"
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadSubject();
  }, [exam, subject, navigate, toast]);

  const handleChapterSelect = (chapterId: string) => {
    if (isQuizMode) {
      navigate(`/quiz/${exam}/${subject}/${chapterId}`);
    } else {
      navigate(`/tutor/${exam}/${subject}/${chapterId}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "text-green-400 bg-green-400/10";
      case "Intermediate": return "text-yellow-400 bg-yellow-400/10";
      case "Advanced": return "text-red-400 bg-red-400/10";
      default: return "text-muted-foreground bg-muted/10";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading chapters...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!subjectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Subject not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const examName = exam === "550e8400-e29b-41d4-a716-446655440001" ? "JEE" : "CUET";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {examName} - {subjectData.name}
            </h1>
            <p className="text-muted-foreground">
              {isQuizMode ? 'Select a chapter to take a quiz' : subjectData.description}
            </p>
          </div>
        </div>

        {selectedDisabilities.length > 0 && (
          <div className="mb-6 p-3 bg-card rounded-lg border">
            <p className="text-sm text-muted-foreground">
              ✓ Accessibility preferences applied for: {selectedDisabilities.join(", ")}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectData.chapters.map((chapter: any) => (
            <Card 
              key={chapter.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 bg-card border group"
              onClick={() => handleChapterSelect(chapter.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {chapter.name}
                    </CardTitle>
                  </div>
                  <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Difficulty:</span>
                    </div>
                    <Badge className={getDifficultyColor(chapter.difficulty)}>
                      {chapter.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Est. Time:</span>
                    </div>
                    <span className="text-sm font-medium">
                      {chapter.estimatedTime}m
                    </span>
                  </div>

                  <Button
                    className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChapterSelect(chapter.id);
                    }}
                  >
                    {isQuizMode ? 'Start Quiz' : 'Start AI Tutoring'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!subjectData.chapters || subjectData.chapters.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No chapters available for this subject.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}