import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAllExams } from "@/lib/subjects-data";
import type { Subject } from "@/lib/subjects-data";

interface SubjectManagerProps {
  examId: string;
  userId: string;
  onSubjectsUpdated: (subjects: string[]) => void;
  currentSubjects: string[];
}

const SubjectManager = ({ examId, userId, onSubjectsUpdated, currentSubjects }: SubjectManagerProps) => {
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(currentSubjects);
  const [loading, setLoading] = useState(false);
  const [examName, setExamName] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchExamAndSubjects();
  }, [examId]);

  const fetchExamAndSubjects = async () => {
    try {
      const exams = await getAllExams();
      const exam = exams.find(e => e.id === examId);
      
      if (exam) {
        setExamName(exam.name);
        setAvailableSubjects(exam.subjects);
        
        // For JEE, auto-select all subjects
        if (exam.name.toLowerCase().includes('jee')) {
          const allSubjectIds = exam.subjects.map(s => s.id);
          setSelectedSubjects(allSubjectIds);
          await updateUserSubjects(allSubjectIds);
        }
      }
    } catch (error) {
      console.error('Error fetching exam data:', error);
      toast({
        title: "Error",
        description: "Failed to load subjects. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateUserSubjects = async (subjects: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          learning_preferences: {
            subjects: subjects
          }
        })
        .eq('user_id', userId);

      if (error) throw error;

      onSubjectsUpdated(subjects);
      toast({
        title: "Success",
        description: "Your subjects have been updated!",
      });
    } catch (error) {
      console.error('Error updating subjects:', error);
      toast({
        title: "Error",
        description: "Failed to update subjects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    const newSelection = selectedSubjects.includes(subjectId)
      ? selectedSubjects.filter(id => id !== subjectId)
      : [...selectedSubjects, subjectId];
    
    setSelectedSubjects(newSelection);
  };

  const handleSaveSelection = () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one subject.",
        variant: "destructive",
      });
      return;
    }
    updateUserSubjects(selectedSubjects);
  };

  const getSubjectIcon = (subject: Subject) => {
    const iconMap: Record<string, string> = {
      'Physics': '⚡',
      'Chemistry': '🧪',
      'Mathematics': '📐',
      'Biology': '🧬',
      'English': '📚',
      'History': '📜',
      'Political Science': '🏛️',
      'Economics': '📈',
      'Psychology': '🧠'
    };
    return iconMap[subject.name] || '📖';
  };

  // For JEE, subjects are automatically assigned
  const isJEE = examName.toLowerCase().includes('jee');

  if (isJEE && selectedSubjects.length > 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-2">
            📚 Your {examName} Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            All subjects for {examName} are automatically included in your learning plan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableSubjects.map((subject) => (
              <Card key={subject.id} className="bg-muted border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{getSubjectIcon(subject)}</div>
                  <h3 className="font-semibold text-foreground">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subject.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-card-foreground">
          📚 Select Your {examName} Subjects
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6">
          Choose the subjects you want to focus on for your {examName} preparation.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {availableSubjects.map((subject) => (
            <Card 
              key={subject.id}
              className={`cursor-pointer transition-all duration-300 ${
                selectedSubjects.includes(subject.id)
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted border-border hover:bg-muted/80'
              }`}
              onClick={() => handleSubjectToggle(subject.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={() => handleSubjectToggle(subject.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getSubjectIcon(subject)}</span>
                      <h3 className="font-semibold text-foreground">{subject.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {subject.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedSubjects.length} subjects selected
          </p>
          <Button 
            onClick={handleSaveSelection}
            disabled={loading || selectedSubjects.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? 'Saving...' : 'Save Selection'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectManager;