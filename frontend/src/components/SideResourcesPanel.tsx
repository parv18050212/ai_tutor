import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, Save, Download } from "lucide-react";
import { useState, useEffect } from "react";

interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: "You" | "AI Tutor";
  content: string;
}

interface Note {
  id: string;
  content: string;
  timestamp: Date;
  chapterId?: string;
}

interface ChapterExcerpt {
  id: string;
  title: string;
  content: string;
  relevance: number;
}

interface SideResourcesPanelProps {
  transcript: TranscriptEntry[];
  chapterId?: string;
  sessionId?: string;
}

export const SideResourcesPanel = ({ transcript, chapterId, sessionId }: SideResourcesPanelProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [excerpts, setExcerpts] = useState<ChapterExcerpt[]>([]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    // Load saved notes from localStorage
    const savedNotes = localStorage.getItem(`notes-${chapterId}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }

    // Mock chapter excerpts - in real implementation, fetch from API
    setExcerpts([
      {
        id: "1",
        title: "Key Concepts",
        content: "The fundamental principles covered in this chapter include...",
        relevance: 0.95
      },
      {
        id: "2", 
        title: "Important Formulas",
        content: "Essential formulas you need to remember for this topic...",
        relevance: 0.88
      },
      {
        id: "3",
        title: "Common Mistakes",
        content: "Students often struggle with these particular aspects...",
        relevance: 0.82
      }
    ]);
  }, [chapterId]);

  const saveNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: `note-${Date.now()}`,
      content: newNote,
      timestamp: new Date(),
      chapterId
    };
    
    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    setNewNote("");
    
    // Save to localStorage
    localStorage.setItem(`notes-${chapterId}`, JSON.stringify(updatedNotes));
  };

  const exportTranscript = () => {
    const transcriptText = transcript.map(entry => 
      `[${entry.timestamp.toLocaleTimeString()}] ${entry.speaker.toUpperCase()}: ${entry.content}`
    ).join('\n\n');
    
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${sessionId || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full flex flex-col bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground">Resources</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="transcript" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4">
            <TabsTrigger value="transcript" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              <Save className="h-3 w-3 mr-1" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="excerpts" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Excerpts
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 px-4 pb-4">
            <TabsContent value="transcript" className="h-full mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm text-foreground">Chat History</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTranscript}
                  className="h-7 px-2 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
              
              <ScrollArea className="h-[calc(100%-2rem)]">
                <div className="space-y-3">
                  {transcript.map((entry) => (
                    <div key={entry.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${entry.speaker === 'You' ? 'text-primary' : 'text-secondary-foreground'}`}>
                          {entry.speaker}
                        </span>
                        <span className="text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-foreground/80 pl-2 border-l-2 border-border">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="notes" className="h-full mt-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full h-20 px-3 py-2 text-sm bg-background border border-border rounded-md resize-none text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    onClick={saveNote}
                    size="sm"
                    disabled={!newNote.trim()}
                    className="w-full h-8"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Note
                  </Button>
                </div>
                
                <ScrollArea className="h-[calc(100%-8rem)]">
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <Card key={note.id} className="p-3 bg-accent/10">
                        <p className="text-xs text-foreground mb-1">{note.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {note.timestamp.toLocaleString()}
                        </p>
                      </Card>
                    ))}
                    
                    {notes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No notes yet. Add your first note above!
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="excerpts" className="h-full mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {excerpts.map((excerpt) => (
                    <Card key={excerpt.id} className="p-3 bg-card/50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-foreground">{excerpt.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(excerpt.relevance * 100)}% relevant
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80">{excerpt.content}</p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};