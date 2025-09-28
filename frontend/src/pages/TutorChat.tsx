import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Image as ImageIcon,
  ArrowLeft,
  PanelRight,
  X,
  Settings,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import { ChatCard } from "@/components/ChatCard";
import { SideResourcesPanel } from "@/components/SideResourcesPanel";
import { SessionControls } from "@/components/SessionControls";
import ChapterSuggestions from "@/components/ChapterSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { getExam, getSubject, getChapterById } from "@/lib/subjects-data";
import { ProfileDialog } from "@/components/ProfileDialog";
import { useChapterSession } from "@/hooks/useChapterSession";
import { chatService } from "@/services/chatService";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  images?: string[];
  sessionId?: string;
}

interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: 'You' | 'AI Tutor';
  content: string;
}

export default function TutorChat() {
  const navigate = useNavigate();
  const { exam, subject, chapter } = useParams<{ 
    exam: string; 
    subject: string; 
    chapter: string; 
  }>();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [showResourcesPanel, setShowResourcesPanel] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [subjectData, setSubjectData] = useState<any>(null);
  const [chapterData, setChapterData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accessibility context
  const { settings: accessibilitySettings } = useAccessibility();

  // Voice command handlers
  const voiceCommandHandlers = {
    sendMessage: () => handleSendMessage(),
    clearInput: () => setInputText(''),
    requestHint: () => setInputText('Can you give me a hint to help me understand better?'),
    requestExample: () => setInputText('Can you show me a solved example of this concept?'),
    requestSlower: () => setInputText('Please explain that more slowly and in simpler terms.'),
    requestSummary: () => setInputText('Can you summarize the key points from your previous response?'),
    readLastResponse: () => {
      const lastAiMessage = messages.findLast(msg => msg.type === 'ai');
      if (lastAiMessage && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(lastAiMessage.content);
        speechSynthesis.speak(utterance);
      }
    },
    toggleVoice: () => voiceCommands.toggleListening(),
  };

  // Voice commands hook
  const voiceCommands = useVoiceCommands(voiceCommandHandlers);

  // Use custom session hook
  const { 
    sessionId, 
    sessionData, 
    loading: sessionLoading, 
    error: sessionError,
    startFreshSession 
  } = useChapterSession(exam || '', subject || '', chapter || '', chapterData?.name);

  // Initialize route data and load chat history
  useEffect(() => {
    const initializeRouteData = async () => {
      if (!exam || !subject || !chapter) {
        navigate('/dashboard');
        return;
      }

      try {
        // Validate route by fetching data
        const [examResult, subjectResult, chapterResult] = await Promise.all([
          getExam(exam),
          getSubject(exam, subject),
          getChapterById(chapter)
        ]);

        if (!examResult || !subjectResult || !chapterResult) {
          console.error('Invalid route: exam, subject, or chapter not found');
          navigate('/dashboard');
          return;
        }

        setExamData(examResult);
        setSubjectData(subjectResult);
        setChapterData(chapterResult);
      } catch (error) {
        console.error('Error initializing route data:', error);
        navigate('/dashboard');
      }
    };

    initializeRouteData();
  }, [exam, subject, chapter, navigate]);

  // Load chat history when session is ready
  useEffect(() => {
    if (sessionId && chapterData) {
      loadChatHistory();
    }
  }, [sessionId, chapterData]);

  const loadChatHistory = async () => {
    try {
      const { history } = await chatService.getChatHistory(sessionId);

      if (history && history.length > 0) {
        const chatMessages: Message[] = history.map(msg => ({
          id: Math.random().toString(),
          type: (msg.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
          content: msg.message,
          timestamp: new Date(msg.created_at),
        }));

        setMessages([
          {
            id: 'welcome',
            type: 'ai' as const,
            content: `Welcome back to your ${chapterData?.name} tutoring session! I'm here to guide you through this chapter using questions and discussions. What would you like to explore today?`,
            timestamp: new Date(),
          },
          ...chatMessages
        ]);

        const transcriptEntries: TranscriptEntry[] = history.map(msg => ({
          id: Math.random().toString(),
          timestamp: new Date(msg.created_at),
          speaker: (msg.role === 'user' ? 'You' : 'AI Tutor') as 'You' | 'AI Tutor',
          content: msg.message
        }));
        setTranscript(transcriptEntries);
      } else {
        // Set welcome message for new session
        setMessages([{
          id: 'welcome',
          type: 'ai',
          content: `Welcome to your ${chapterData?.name} tutoring session! I'm here to guide you through this chapter using questions and discussions. What would you like to explore today?`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Fallback welcome message on error
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `Welcome to your ${chapterData?.name} tutoring session! I'm here to guide you through this chapter using questions and discussions. What would you like to explore today?`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleStartFreshSession = async (): Promise<boolean> => {
    const success = await startFreshSession();
    if (success && chapterData) {
      // Clear current messages and set welcome message
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `Welcome to your fresh ${chapterData.name} tutoring session! I'm here to guide you through this chapter using questions and discussions. What would you like to explore today?`,
        timestamp: new Date(),
      }]);
      setTranscript([]);
    }
    return success;
  };

  const isValidRoute = examData && subjectData && chapterData;
  const isSessionReady = sessionId && !sessionLoading && !sessionError;

  const handleControlAction = (action: string, messageId: string, params?: string) => {
    // Handle quiz navigation
    if (action === "session-start_quiz") {
      navigate(`/quiz/${exam}/${subject}/${chapter}`);
      return;
    }
    
    // Handle control button actions
    const actionMessages = {
      "slower": "Please explain that more slowly and in simpler terms.",
      "summarize": "Can you summarize the key points from your previous response?",
      "hint": "Can you give me a hint to help me understand better?",
      "analogy": "Can you explain this using an analogy or real-world example?",
      "solved-example": "Can you show me a solved example of this concept?"
    };
    
    const actionMessage = actionMessages[action as keyof typeof actionMessages];
    if (actionMessage) {
      setInputText(actionMessage);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim() && selectedImages.length === 0) return;
    if (!sessionId) return;

    const timestamp = new Date();
    const messageId = Math.random().toString();
    
    // Add user message
    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: textToSend,
      timestamp,
      images: selectedImages.map(img => URL.createObjectURL(img))
    };

    setMessages(prev => [...prev, userMessage]);
    setTranscript(prev => [...prev, {
      id: messageId,
      timestamp,
      speaker: 'You',
      content: textToSend
    }]);

    // Clear input
    setInputText('');
    setSelectedImages([]);
    setIsTyping(true);

    try {
      // Make API call to FastAPI backend
      const response = await chatService.sendMessage({
        question: textToSend,
        session_id: sessionId,
        exam_id: exam,
        subject_id: subject,
        chapter_id: chapter,
        exam_name: examData?.name,
        subject_name: subjectData?.name,
        chapter_name: chapterData?.name,
        images: selectedImages.length > 0 ? await Promise.all(
          selectedImages.map(img => convertImageToBase64(img))
        ) : undefined,
        accessibility_settings: accessibilitySettings
      });

      const aiResponse = response.answer || "I'm having trouble processing that right now. Could you try rephrasing your question?";
      
      const aiMessage: Message = {
        id: Math.random().toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        sessionId
      };

      setMessages(prev => [...prev, aiMessage]);
      setTranscript(prev => [...prev, {
        id: Math.random().toString(),
        timestamp: new Date(),
        speaker: 'AI Tutor',
        content: aiResponse
      }]);

      // Auto-play TTS if enabled
      if (ttsEnabled) {
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Math.random().toString(),
        type: 'ai',
        content: "I'm sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper function to convert file to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        setSelectedImages(prev => [...prev, file]);
      }
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        setSelectedImages(prev => [...prev, file]);
      }
    });
  };

  if (!isValidRoute || !isSessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              {sessionLoading ? 'Loading session...' : sessionError ? `Error: ${sessionError}` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    AI Tutor - {chapterData?.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {examData?.name} • {subjectData?.name}
                  </p>
                  {sessionData && (
                    <SessionControls
                      sessionData={sessionData}
                      onStartFresh={handleStartFreshSession}
                      disabled={isTyping}
                    />
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2" style={{ marginRight: '100px' }}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowResourcesPanel(!showResourcesPanel)}
                  className={showResourcesPanel ? "bg-accent" : ""}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 gap-4 p-4 h-[calc(100vh-100px)]">
          {/* Main Chat Area */}
          <div className={`flex flex-col flex-1 ${showResourcesPanel ? 'mr-4' : ''}`}>
            {/* Chat Messages */}
            <ScrollArea className="flex-1 mb-4 space-y-4">
              {messages.map((message) => (
                <ChatCard
                  key={message.id}
                  message={message}
                  onControlAction={handleControlAction}
                  ttsEnabled={ttsEnabled}
                />
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3 max-w-[80%]">
                    <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                      <div className="h-4 w-4 flex items-center justify-center">
                        <div className="w-1 h-1 bg-secondary-foreground rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <Card className="bg-card">
                      <CardContent className="p-4">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="space-y-3">
              {/* Image Preview */}
              {selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Selected ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-md border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Input Row */}
              <div 
                className="flex space-x-2"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTyping}
                    className="border-border hover:bg-accent"
                    title="Upload image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>

                  {/* Voice Control Button */}
                  {accessibilitySettings.speechToText && voiceCommands.isVoiceSupported && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={voiceCommands.toggleListening}
                      disabled={isTyping}
                      className={`border-border hover:bg-accent ${voiceCommands.isListening ? 'bg-red-100 text-red-600' : ''}`}
                      title={voiceCommands.isListening ? "Stop voice commands" : "Start voice commands (Ctrl+Shift+V)"}
                    >
                      {voiceCommands.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}

                  {/* Read Last Response Button */}
                  {accessibilitySettings.textToSpeech && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={voiceCommandHandlers.readLastResponse}
                      disabled={isTyping || messages.length === 0}
                      className="border-border hover:bg-accent"
                      title="Read last AI response (Ctrl+Shift+R)"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Input
                  type="text"
                  placeholder="Ask a question about this chapter..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isTyping}
                  className="flex-1 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
                
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={(!inputText.trim() && selectedImages.length === 0) || isTyping}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Resources Panel */}
          {showResourcesPanel && (
            <div className="w-80 space-y-4">
              <ChapterSuggestions
                chapterId={chapter || ''}
                examType={exam}
                subjectId={subject}
                className="mb-4"
              />
              <SideResourcesPanel
                transcript={transcript}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}