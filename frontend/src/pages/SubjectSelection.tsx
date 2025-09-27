import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft } from "lucide-react";
import { getAllExams } from "@/lib/subjects-data";
import { useEffect, useState } from "react";

export default function SubjectSelection() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisabilities, setSelectedDisabilities] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("accessibilityNeeds");
    if (stored) {
      setSelectedDisabilities(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const examData = await getAllExams();
        setExams(examData);
      } catch (error) {
        console.error('Error loading exams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

  const handleSubjectSelect = (examId: string, subjectId: string) => {
    navigate(`/chapters/${examId}/${subjectId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading subjects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="mr-4 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Select Your Subjects
            </h1>
            <p className="text-muted-foreground">
              Choose a subject to start your preparation journey
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

        <div className="space-y-8">
          {exams.map((exam) => (
            <div key={exam.id} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {exam.name}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {exam.description}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exam.subjects.map((subject: any) => {
                  const Icon = subject.icon;
                  return (
                    <Card 
                      key={subject.id}
                      className="cursor-pointer transition-all duration-300 hover:shadow-glow-primary hover:scale-105 bg-card border-border group"
                      onClick={() => handleSubjectSelect(exam.id, subject.id)}
                    >
                      <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-8 w-8 text-primary group-hover:text-primary transition-colors" />
                        </div>
                        <CardTitle className="text-card-foreground text-xl">
                          {subject.name}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {subject.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Chapters:</span>
                            <span className="font-semibold text-primary">{subject.chapters.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Est. Time:</span>
                            <span className="font-semibold">
                              <Clock className="h-4 w-4 inline mr-1" />
                              {Math.round(subject.chapters.reduce((acc: number, ch: any) => acc + ch.estimatedTime, 0) / subject.chapters.length)}m avg
                            </span>
                          </div>
                          
                          <Button 
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubjectSelect(exam.id, subject.id);
                            }}
                          >
                            Start Learning
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {exams.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No subjects available. Please try refreshing the page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}