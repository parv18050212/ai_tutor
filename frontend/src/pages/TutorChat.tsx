import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
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
  Volume2,
  Phone,
  PhoneOff
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
import { useWhisperSTT } from "@/hooks/useWhisperSTT";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { FloatingVoiceButton } from "@/components/VoiceNavigationButton";

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
  const { settings: accessibilitySettings, updateSetting } = useAccessibility();

  // Whisper STT (high-quality cloud-based speech recognition)
  const stt = useWhisperSTT({
    language: accessibilitySettings.sttLanguage?.split('-')[0] || 'en', // Whisper uses 'en', not 'en-US'
    onTranscript: (text) => {
      // Auto-append transcript to input
      setInputText(prev => prev + ' ' + text);
    },
    onError: (error) => {
      console.error('STT Error:', error);
    },
  });

  // Use custom session hook
  const {
    sessionId,
    sessionData,
    loading: sessionLoading,
    error: sessionError,
    startFreshSession
  } = useChapterSession(exam || '', subject || '', chapter || '', chapterData?.name);

  // Memoize callbacks to prevent infinite re-renders (Bug #8 fix)
  const handleRealtimeTranscript = useCallback((text: string) => {
    console.log('🎤 handleRealtimeTranscript called with:', text);
    // Add user message to chat
    const userMessage: Message = {
      id: Math.random().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };
    console.log('💬 Adding user message to chat:', userMessage);
    setMessages(prev => [...prev, userMessage]);
  }, []);

  const handleRealtimeAiResponse = useCallback((text: string) => {
    console.log('🤖 handleRealtimeAiResponse called with:', text);
    // Add AI response to chat
    const aiMessage: Message = {
      id: Math.random().toString(),
      type: 'ai',
      content: text,
      timestamp: new Date()
    };
    console.log('💬 Adding AI message to chat:', aiMessage);
    setMessages(prev => [...prev, aiMessage]);
  }, []);

  const handleRealtimeError = useCallback((error: string) => {
    console.error('Realtime Voice Error:', error);
  }, []);

  // OpenAI Realtime Voice (Premium voice mode)
  const realtimeVoice = useRealtimeVoice({
    sessionId: sessionId || '',
    examId: exam || '',
    subjectId: subject || '',
    chapterId: chapter || '',
    examName: examData?.name || '',
    subjectName: subjectData?.name || '',
    chapterName: chapterData?.name || '',
    accessibilitySettings,
    onTranscript: handleRealtimeTranscript,
    onAiResponse: handleRealtimeAiResponse,
    onError: handleRealtimeError
  });

  // Bug #2 fix: Define loadChatHistory BEFORE useEffects that use it
  const loadChatHistory = useCallback(async () => {
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
  }, [sessionId, chapterData]);

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
  }, [sessionId, chapterData, loadChatHistory]);

  // Update input text from STT transcript
  useEffect(() => {
    if (stt.transcript) {
      setInputText(prev => prev + stt.transcript);
      stt.resetTranscript();
    }
  }, [stt.transcript]);

  // Show STT errors as notifications
  useEffect(() => {
    if (stt.error) {
      console.error('STT Error:', stt.error);
      // Don't show error toast for "no-speech" errors, as these are normal when user hasn't spoken yet
      if (!stt.error.includes('No speech detected')) {
        // You can add toast notification here if you have a toast hook
        console.warn('Speech recognition error:', stt.error);
      }
    }
  }, [stt.error]);

  // TTS is handled by Voice Agent (OpenAI Realtime API)
  // No auto-play TTS needed - Voice Agent manages its own speech synthesis

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

  // Auto-scroll when messages or typing status change
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        // ignore
      }
    }, 50);
    return () => clearTimeout(t);
  }, [messages, isTyping]);

  // Keyboard shortcuts for accessibility - WCAG 2.1.1
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Ctrl+Enter: Send message
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (inputText.trim() || selectedImages.length > 0) {
          handleSendMessage();
        }
      }

      // Ctrl+Shift+R: Read last AI response
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        // Voice Agent handles its own TTS - this is for regular mode only
        console.log('Read last message: Use Voice Agent for TTS or enable text-to-speech in settings');
      }

      // Esc: Clear input
      if (e.key === 'Escape' && inputText) {
        e.preventDefault();
        setInputText('');
      }

      // Ctrl+B: Toggle resources panel
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowResourcesPanel(prev => !prev);
      }

      // Ctrl+H: Request hint
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setInputText('Can you give me a hint to help me understand better?');
      }

      // Ctrl+E: Request example
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setInputText('Can you show me a solved example of this concept?');
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [inputText, selectedImages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <div className="border-b border-border bg-card/50 backdrop-blur" role="banner">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Go back to dashboard"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
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
                  aria-label={showResourcesPanel ? "Hide resources panel" : "Show resources panel"}
                  aria-expanded={showResourcesPanel}
                  aria-controls="resources-panel"
                >
                  <PanelRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 gap-4 p-4 h-[calc(100vh-100px)]">
          {/* Main Chat Area */}
          <div className={`flex flex-col flex-1 ${showResourcesPanel ? 'mr-4' : ''}`}>
            {/* Chat Messages - ARIA live region for screen readers */}
            <ScrollArea
              className="flex-1 mb-4 space-y-4"
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-label="Chat conversation history"
            >
              {messages.map((message) => (
                <ChatCard
                  key={message.id}
                  message={message}
                  onControlAction={handleControlAction}
                  ttsEnabled={ttsEnabled}
                />
              ))}

              {isTyping && (
                <div className="flex justify-start" role="status" aria-live="polite" aria-label="AI is typing">
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
              
              {/* Live Transcription Display */}
              {realtimeVoice.isConnected && (
                <Card className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {realtimeVoice.isListening && (
                        <div className="flex gap-1">
                          <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                          <div className="w-1 h-6 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      )}
                      {realtimeVoice.isSpeaking && (
                        <Volume2 className="h-5 w-5 text-green-600 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {realtimeVoice.isListening ? 'Listening...' : realtimeVoice.isSpeaking ? 'AI Speaking...' : 'Voice Mode Active'}
                      </p>
                      {realtimeVoice.transcript && (
                        <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">{realtimeVoice.transcript}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      Premium
                    </Badge>
                  </div>
                </Card>
              )}

              {/* Input Row */}
              <div
                className="flex space-x-2"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex space-x-1">
                  {/* Realtime Voice Toggle Button */}
                  <Button
                    type="button"
                    variant={realtimeVoice.isConnected ? "destructive" : "default"}
                    size="icon"
                    onClick={() => {
                      if (realtimeVoice.isConnected) {
                        realtimeVoice.disconnect();
                      } else {
                        realtimeVoice.connect();
                      }
                    }}
                    disabled={isTyping || !realtimeVoice.isSupported || !sessionId}
                    className={realtimeVoice.isConnected ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}
                    aria-label={realtimeVoice.isConnected ? "Stop voice mode" : "Start premium voice mode"}
                    title={realtimeVoice.isConnected ? "Stop Voice Mode" : "Start Premium Voice Mode (AI Conversation)"}
                  >
                    {realtimeVoice.isConnected ? (
                      <PhoneOff className="h-4 w-4 animate-pulse" aria-hidden="true" />
                    ) : (
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>

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
                    disabled={isTyping || realtimeVoice.isConnected}
                    className="border-border hover:bg-accent"
                    aria-label="Upload image"
                    title="Upload image"
                  >
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  {/* Microphone Button for STT */}
                  {accessibilitySettings.speechToText && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (stt.isListening) {
                          stt.stopListening();
                        } else {
                          // Start with continuous mode to keep listening until user stops
                          stt.startListening({
                            continuous: true,
                            interimResults: true,
                            language: accessibilitySettings.sttLanguage
                          });
                        }
                      }}
                      disabled={isTyping || !stt.isSupported}
                      className={`border-border ${stt.isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-accent'}`}
                      aria-label={stt.isListening ? "Stop recording" : "Start voice input"}
                      title={stt.isListening ? "Stop recording" : "Start voice input"}
                    >
                      {stt.isListening ? (
                        <MicOff className="h-4 w-4 animate-pulse" aria-hidden="true" />
                      ) : (
                        <Mic className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  )}

                  {/* Read Last Response Button */}
                  {accessibilitySettings.textToSpeech && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Voice Agent handles its own TTS
                        console.log('Read last message: Use Voice Agent for full conversation with TTS');
                      }}
                      disabled={isTyping || messages.length === 0}
                      className="border-border hover:bg-accent"
                      aria-label="Read last AI response aloud (Ctrl+Shift+R)"
                      title="Read last AI response (Ctrl+Shift+R)"
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder={stt.isListening ? "Listening... speak now" : "Ask a question about this chapter..."}
                    value={inputText + (stt.interimTranscript ? ' ' + stt.interimTranscript : '')}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    className={`w-full border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary ${stt.isListening ? 'border-red-500' : ''}`}
                    aria-label="Message input"
                    aria-describedby="keyboard-shortcuts-hint"
                  />
                  {stt.isListening && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  )}
                </div>

                <span id="keyboard-shortcuts-hint" className="sr-only">
                  Press Enter to send, or Ctrl+Enter to send. Press Ctrl+H for hint, Ctrl+E for example.
                </span>

                <Button
                  onClick={() => handleSendMessage()}
                  disabled={(!inputText.trim() && selectedImages.length === 0) || isTyping}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="Send message (Ctrl+Enter)"
                  title="Send message (Ctrl+Enter)"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          {/* Resources Panel */}
          {showResourcesPanel && (
            <div id="resources-panel" className="w-80 space-y-4" role="complementary" aria-label="Resources and suggestions panel">
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
