import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, User, Volume2, Clock, MessageCircle, Lightbulb, BookOpen, CheckCircle, AlertTriangle, ArrowRight, Edit2, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SessionSummarySection {
  id: string;
  source?: string;
  props?: any[];
}

interface SessionSummaryAction {
  text: string;
  action: string;
  params?: string;
}

interface SessionSummaryResponse {
  page: "SessionSummary";
  props: { session_id: string };
  sections: SessionSummarySection[];
  accessibility?: { clear_headings?: boolean };
}

interface StructuredResponse {
  explanation?: string;
  check_in?: string;
  options?: string[];
  session_summary?: SessionSummaryResponse;
}

interface Message {
  id: string;
  type: "user" | "ai";
  content: string | StructuredResponse;
  images?: string[];
  timestamp: Date;
  sessionId?: string;
}

interface ChatCardProps {
  message: Message;
  onControlAction?: (action: string, messageId: string, params?: string) => void;
  ttsEnabled?: boolean;
}

export const ChatCard = ({ message, onControlAction, ttsEnabled = false }: ChatCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const handleTTS = () => {
    if (!ttsEnabled) return;
    
    const text = typeof message.content === 'string' 
      ? message.content 
      : `${message.content.explanation || ''} ${message.content.check_in || ''}`;
    
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsPlaying(false);
      speechSynthesis.speak(utterance);
    }
  };

  const handleEdit = () => {
    if (message.type !== 'user' || typeof message.content !== 'string') return;
    setEditedContent(message.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .update({ message: editedContent })
        .eq('id', message.id);

      if (error) throw error;
      
      // Update the message content locally
      message.content = editedContent;
      setIsEditing(false);
      toast.success('Message updated successfully');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleControlAction = (action: string, params?: string) => {
    onControlAction?.(action, message.id, params);
  };

  const renderSessionSummary = (sessionSummary: SessionSummaryResponse) => {
    const [summaryData, setSummaryData] = useState<any>({});
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
      // Load data for sections that have sources
      sessionSummary.sections.forEach(async (section) => {
        if (section.source) {
          setLoading(prev => ({ ...prev, [section.id]: true }));
          try {
            const response = await api.get(section.source.replace('{session_id}', sessionSummary.props.session_id));
            setSummaryData(prev => ({ ...prev, [section.id]: response.data }));
          } catch (error) {
            console.error(`Error loading data for section ${section.id}:`, error);
            setSummaryData(prev => ({ ...prev, [section.id]: { error: 'Failed to load data' } }));
          } finally {
            setLoading(prev => ({ ...prev, [section.id]: false }));
          }
        }
      });
    }, [sessionSummary]);

    const handleSessionAction = (action: string, params?: string) => {
      onControlAction?.(`session-${action}`, message.id, params);
    };

    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Session Complete!</h2>
          <p className="text-sm text-muted-foreground">Here's how you did and what's next</p>
        </div>

        {sessionSummary.sections.map((section) => {
          if (section.id === 'summary_text') {
            return (
              <Card key={section.id} className="bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                    Session Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading[section.id] ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  ) : summaryData[section.id] ? (
                    <p className="text-sm text-foreground">{summaryData[section.id].summary || summaryData[section.id]}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading summary...</p>
                  )}
                </CardContent>
              </Card>
            );
          }

          if (section.id === 'weak_areas') {
            return (
              <Card key={section.id} className="bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading[section.id] ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  ) : summaryData[section.id] ? (
                    <div className="space-y-2">
                      {Array.isArray(summaryData[section.id]) ? 
                        summaryData[section.id].map((area: string, index: number) => (
                          <div key={index} className="flex items-center text-sm">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            {area}
                          </div>
                        )) : 
                        <p className="text-sm text-foreground">{summaryData[section.id].areas || summaryData[section.id]}</p>
                      }
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Analyzing weak areas...</p>
                  )}
                </CardContent>
              </Card>
            );
          }

          if (section.id === 'actions') {
            return (
              <Card key={section.id} className="bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary" />
                    What's Next?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {section.props?.map((action: SessionSummaryAction, index: number) => (
                      <Button
                        key={index}
                        variant={action.action === 'start_quiz' ? 'default' : 'outline'}
                        className="justify-start h-auto p-4"
                        onClick={() => handleSessionAction(action.action, action.params)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{action.text}</div>
                          {action.action === 'start_quiz' && (
                            <div className="text-xs opacity-75 mt-1">Test your understanding</div>
                          )}
                          {action.action === 'continue_next' && (
                            <div className="text-xs opacity-75 mt-1">Keep learning new topics</div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const renderStructuredContent = (content: StructuredResponse) => {
    if (content.session_summary) {
      return renderSessionSummary(content.session_summary);
    }

    return (
      <div className="space-y-4">
        {content.explanation && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-foreground">Explanation</h4>
            <p className="text-sm whitespace-pre-wrap text-foreground">{content.explanation}</p>
          </div>
        )}
        
        {content.check_in && (
          <div className="p-3 bg-accent/20 rounded-lg border-l-4 border-primary">
            <h4 className="font-medium text-sm mb-2 text-foreground flex items-center">
              <MessageCircle className="h-4 w-4 mr-1" />
              Check-in
            </h4>
            <p className="text-sm text-foreground">{content.check_in}</p>
          </div>
        )}
        
        {content.options && content.options.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-foreground">Options</h4>
            <div className="flex flex-wrap gap-2">
              {content.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleControlAction(`option-${index}`)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-start space-x-3 max-w-[85%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
        <div className={`p-2 rounded-full ${message.type === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          {message.type === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className="flex flex-col space-y-2">
          <Card className={`${message.type === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            <CardContent className="p-4">
              {message.images && message.images.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {message.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Uploaded image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                  ))}
                </div>
              )}
              
              <div className="space-y-3">
                {typeof message.content === 'string' ? (
                  isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="text-sm"
                        placeholder="Edit your message..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-7 px-2 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )
                ) : (
                  renderStructuredContent(message.content)
                )}
                
                <p className={`text-xs ${message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {message.timestamp.toLocaleTimeString()}
                  {isEditing === false && typeof message.content === 'string' && message.content !== editedContent && editedContent && (
                    <span className="ml-2 italic">(edited)</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Control Buttons for user messages (edit) */}
          {message.type === "user" && typeof message.content === 'string' && !isEditing && (
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          )}
          
          {/* Control Buttons for AI messages */}
          {message.type === "ai" && (
            <div className="flex flex-wrap gap-1">
              {ttsEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTTS}
                  disabled={isPlaying}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  {isPlaying ? "Playing..." : "Listen"}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleControlAction("slower")}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Clock className="h-3 w-3 mr-1" />
                Slower
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleControlAction("summarize")}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Summarize
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleControlAction("hint")}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                Hint
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleControlAction("analogy")}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Analogy
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleControlAction("solved-example")}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Solved Example
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};