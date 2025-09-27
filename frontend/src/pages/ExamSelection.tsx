import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, ChevronRight } from "lucide-react";
import { getAllExams, Exam } from "@/lib/subjects-data";
import { useToast } from "@/hooks/use-toast";

const ExamSelection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  
  const accessibilityNeeds = JSON.parse(localStorage.getItem('accessibility-needs') || '[]');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const examData = await getAllExams();
      setExams(examData);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast({
        title: "Error",
        description: "Failed to load exam data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (examId: string) => {
    navigate(`/subject-selection/${examId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Choose Your Exam</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the exam you're preparing for to access tailored learning materials and AI tutoring.
          </p>
          {accessibilityNeeds.length > 0 && (
            <div className="mt-4 p-3 bg-card rounded-lg border inline-block">
              <p className="text-sm text-muted-foreground">
                ✓ Accessibility preferences applied: {accessibilityNeeds.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Exams Grid */}
        {exams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <Card 
                key={exam.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-glow-primary hover:scale-105 bg-card border-border group"
                onClick={() => handleExamSelect(exam.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <CardTitle className="text-2xl text-card-foreground group-hover:text-primary transition-colors">
                        {exam.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {exam.description}
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{exam.subjects.length} subjects available</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-card-foreground">Featured Subjects:</p>
                    <div className="flex flex-wrap gap-2">
                      {exam.subjects.slice(0, 4).map((subject) => (
                        <span 
                          key={subject.id}
                          className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground"
                        >
                          {subject.name}
                        </span>
                      ))}
                      {exam.subjects.length > 4 && (
                        <span className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                          +{exam.subjects.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExamSelect(exam.id);
                    }}
                  >
                    Start Preparation
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-card-foreground mb-2">No Exams Available</h2>
            <p className="text-muted-foreground">
              Exam data is being loaded. Please try refreshing the page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamSelection;