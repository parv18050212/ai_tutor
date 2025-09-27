import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  useSidebar 
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getUserSubjects, getReadableName, type Subject } from "@/lib/subjects-data";

// Subject interface is now imported from subjects-data

interface LearningPreferences {
  subjects?: string[];
  examType?: string;
  learningSpeed?: string;
}

export function ChatSidebar() {
  const navigate = useNavigate();
  const { exam, subject: currentSubject, chapter: currentChapter } = useParams();
  const sidebar = useSidebar();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Data is now centralized in subjects-data.ts

  useEffect(() => {
    const loadUserSubjects = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('learning_preferences')
          .eq('user_id', session.user.id)
          .single();

        if (profile?.learning_preferences) {
          const prefs = profile.learning_preferences as LearningPreferences;
          if (prefs.subjects && prefs.examType) {
            const userSubjects = await getUserSubjects(prefs.subjects, prefs.examType);
            setSubjects(userSubjects);
            
            // Expand current subject
            if (currentSubject) {
              setExpandedSubjects(new Set([currentSubject]));
            }
          }
        }
      } catch (error) {
        console.error('Error loading user subjects:', error);
      }
    };

    loadUserSubjects();
  }, [currentSubject]);

  const handleChapterSelect = (subjectId: string, chapterId: string) => {
    navigate(`/tutor/${exam}/${subjectId}/${chapterId}`);
  };

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  // getReadableName is now imported from subjects-data

  return (
    <Sidebar className="border-r border-border bg-card/50">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold">
            {sidebar.state !== "collapsed" && "Subjects & Chapters"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {subjects.map((subject) => {
                const Icon = subject.icon;
                const isExpanded = expandedSubjects.has(subject.id);
                const isCurrentSubject = subject.id === currentSubject;
                
                return (
                  <SidebarMenuItem key={subject.id}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleSubject(subject.id)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={`w-full justify-between ${isCurrentSubject ? 'bg-accent text-accent-foreground' : ''}`}
                        >
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2" />
                          {sidebar.state !== "collapsed" && <span>{subject.name}</span>}
                        </div>
                        {sidebar.state !== "collapsed" && (
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {sidebar.state !== "collapsed" && (
                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1">
                            {subject.chapters.map((chapter) => {
                              const isCurrentChapter = chapter.id === currentChapter && subject.id === currentSubject;
                              
                              return (
                                <Button
                                  key={chapter.id}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-full justify-start text-left h-8 px-2 text-sm ${
                                    isCurrentChapter 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                  }`}
                                  onClick={() => handleChapterSelect(subject.id, chapter.id)}
                                >
                                  {chapter.name}
                                </Button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}