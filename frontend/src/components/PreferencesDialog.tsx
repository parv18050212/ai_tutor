import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, BookOpen, Accessibility, Settings, LogOut, Volume2, Mic, Loader2, Play } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getAllExams } from "@/lib/subjects-data";
import { DISABILITY_TYPES, FORMAT_PREFERENCES, LEARNING_SPEEDS } from "@/lib/onboarding-schemas";
import { cleanupAuthState } from "@/lib/auth";
import { useA2ASpeech } from "@/hooks/useA2ASpeech";
import { Slider } from "@/components/ui/slider";

type GradeLevel = "elementary" | "middle_school" | "high_school" | "undergraduate" | "graduate" | "other" | "11" | "12";

interface Profile {
  id?: string;
  user_id: string;
  display_name?: string;
  bio?: string;
  grade_level?: GradeLevel;
  learning_preferences?: Record<string, any>;
  accessibility_needs?: string[];
  exam_id?: string;
}

interface PreferencesDialogProps {
  children: React.ReactNode;
}

export function PreferencesDialog({ children }: PreferencesDialogProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const { settings: accessibilitySettings, updateSetting: updateAccessibilitySetting } = useAccessibility();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // A2A Speech hooks
  const { getVoices, getTTSLanguages, getSTTLanguages, synthesizeSpeech, isSynthesizing } = useA2ASpeech();

  // Voice options state
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [ttsLanguages, setTtsLanguages] = useState<any[]>([]);
  const [sttLanguages, setSttLanguages] = useState<any[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  
  const [formData, setFormData] = useState({
    // Profile data
    display_name: "",
    bio: "",
    grade_level: "" as GradeLevel | "",
    
    // Learning preferences
    exam_id: "",
    subjects: [] as string[],
    learning_goals: "",
    learning_speed: "normal" as "normal" | "slower" | "summary",
    format_preferences: [] as string[],
    
    // Accessibility needs
    disability_type: "none" as "none" | "visual" | "hearing" | "cognitive" | "mobility",
    accessibility_needs: [] as string[],
  });

  useEffect(() => {
    if (open) {
      fetchProfile();
      fetchExams();
    }
  }, [open]);

  useEffect(() => {
    if (formData.exam_id) {
      loadSubjectsForExam(formData.exam_id);
    }
  }, [formData.exam_id]);

  // Load voices when TTS is enabled
  useEffect(() => {
    if (open && accessibilitySettings.textToSpeech) {
      loadVoiceOptions();
    }
  }, [open, accessibilitySettings.textToSpeech]);

  // Load STT languages when STT is enabled
  useEffect(() => {
    if (open && accessibilitySettings.speechToText) {
      loadLanguageOptions();
    }
  }, [open, accessibilitySettings.speechToText]);

  // Auto-enable TTS/STT when visual disability is selected
  useEffect(() => {
    if (formData.disability_type === "visual") {
      // Automatically enable TTS and STT for visual disabilities
      if (!accessibilitySettings.textToSpeech) {
        updateAccessibilitySetting('textToSpeech', true);
      }
      if (!accessibilitySettings.speechToText) {
        updateAccessibilitySetting('speechToText', true);
      }
    }
  }, [formData.disability_type]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data as Profile);
        const learningPrefs = data.learning_preferences as any || {};
        setFormData({
          display_name: data.display_name || "",
          bio: data.bio || "",
          grade_level: data.grade_level as GradeLevel || "",
          exam_id: data.exam_id || "",
          subjects: learningPrefs.subjects || [],
          learning_goals: learningPrefs.learning_goals || "",
          learning_speed: learningPrefs.learning_speed || "normal",
          format_preferences: learningPrefs.format_preferences || [],
          disability_type: learningPrefs.disability_type || "none",
          accessibility_needs: data.accessibility_needs || [],
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive",
      });
    }
  };

  const fetchExams = async () => {
    try {
      const examsData = await getAllExams();
      setExams(examsData);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const loadSubjectsForExam = async (examId: string) => {
    try {
      const exam = exams.find(e => e.id === examId);
      if (exam) {
        setAvailableSubjects(exam.subjects || []);
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      console.log("Saving preferences with form data:", formData);

      // Prepare learning preferences - ensure we don't save empty strings
      const learningPreferences = {
        subjects: formData.subjects || [],
        learning_goals: formData.learning_goals || "",
        learning_speed: formData.learning_speed || "normal",
        format_preferences: formData.format_preferences || [],
        disability_type: formData.disability_type || "none",
      };

      const profileData = {
        user_id: user.id,
        display_name: formData.display_name || null,
        bio: formData.bio || null,
        grade_level: formData.grade_level || null,
        exam_id: formData.exam_id || null,
        learning_preferences: learningPreferences,
        accessibility_needs: formData.accessibility_needs || [],
      };

      console.log("Profile data to save:", profileData);

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Update localStorage with accessibility needs
      if (profileData.accessibility_needs && profileData.accessibility_needs.length > 0) {
        localStorage.setItem("accessibilityNeeds", JSON.stringify(profileData.accessibility_needs));
      }

      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: `Failed to save preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    const newSubjects = formData.subjects.includes(subjectId)
      ? formData.subjects.filter(id => id !== subjectId)
      : [...formData.subjects, subjectId];
    
    setFormData({ ...formData, subjects: newSubjects });
  };

  const handleFormatPreferenceToggle = (format: string) => {
    const newPreferences = formData.format_preferences.includes(format)
      ? formData.format_preferences.filter(f => f !== format)
      : [...formData.format_preferences, format];
    
    setFormData({ ...formData, format_preferences: newPreferences });
  };

  const handleAccessibilityNeedToggle = (need: string) => {
    const newNeeds = formData.accessibility_needs.includes(need)
      ? formData.accessibility_needs.filter(n => n !== need)
      : [...formData.accessibility_needs, need];
    
    setFormData({ ...formData, accessibility_needs: newNeeds });
  };

  const loadVoiceOptions = async () => {
    setLoadingVoices(true);
    try {
      const [voices, languages] = await Promise.all([
        getVoices(accessibilitySettings.ttsLanguage),
        getTTSLanguages()
      ]);
      setAvailableVoices(voices);
      setTtsLanguages(languages);
    } catch (error) {
      console.error('Failed to load voice options:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const loadLanguageOptions = async () => {
    try {
      const languages = await getSTTLanguages();
      setSttLanguages(languages);
    } catch (error) {
      console.error('Failed to load STT languages:', error);
    }
  };

  const handleTestVoice = async () => {
    try {
      const audioUrl = await synthesizeSpeech(
        'Hello! This is a test of the text to speech system.',
        {
          voice: accessibilitySettings.ttsVoice,
          language: accessibilitySettings.ttsLanguage,
          speed: accessibilitySettings.ttsSpeed,
          pitch: accessibilitySettings.ttsPitch
        }
      );
      const audio = new Audio(audioUrl);
      audio.play();
      toast({
        title: "Playing test voice...",
      });
    } catch (error) {
      console.error('Test voice error:', error);
      toast({
        title: "Error",
        description: "Failed to test voice",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clean up auth state
      cleanupAuthState();

      // Close dialog and redirect
      setOpen(false);
      navigate("/");

      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </DialogTitle>
          <DialogDescription>
            Manage your profile, learning preferences, and accessibility settings.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Learning
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Accessibility className="h-4 w-4" />
              Accessibility
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Display
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display Name */}
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Enter your display name"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="grade_level">Grade Level</Label>
                  <Select
                    value={formData.grade_level}
                    onValueChange={(value) => setFormData({ ...formData, grade_level: value as GradeLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elementary">Elementary School</SelectItem>
                      <SelectItem value="middle_school">Middle School</SelectItem>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="11">Grade 11</SelectItem>
                      <SelectItem value="12">Grade 12</SelectItem>
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam & Subjects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="exam_id">Exam Type</Label>
                  <Select
                    value={formData.exam_id}
                    onValueChange={(value) => setFormData({ ...formData, exam_id: value, subjects: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {availableSubjects.length > 0 && (
                  <div>
                    <Label>Subjects</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableSubjects.map((subject) => (
                        <div key={subject.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject.id}
                            checked={formData.subjects.includes(subject.id)}
                            onCheckedChange={() => handleSubjectToggle(subject.id)}
                          />
                          <Label htmlFor={subject.id} className="text-sm">
                            {subject.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="learning_goals">Learning Goals</Label>
                  <Textarea
                    id="learning_goals"
                    value={formData.learning_goals}
                    onChange={(e) => setFormData({ ...formData, learning_goals: e.target.value })}
                    placeholder="Describe your learning goals..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="learning_speed">Learning Speed</Label>
                  <Select
                    value={formData.learning_speed}
                    onValueChange={(value) => setFormData({ ...formData, learning_speed: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNING_SPEEDS.map((speed) => (
                        <SelectItem key={speed.value} value={speed.value}>
                          {speed.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Format Preferences</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {FORMAT_PREFERENCES.map((format) => (
                      <div key={format.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={format.value}
                          checked={formData.format_preferences.includes(format.value)}
                          onCheckedChange={() => handleFormatPreferenceToggle(format.value)}
                        />
                        <Label htmlFor={format.value} className="text-sm">
                          {format.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Needs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="disability_type">Primary Accessibility Need</Label>
                  <Select
                    value={formData.disability_type}
                    onValueChange={(value) => setFormData({ ...formData, disability_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISABILITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Additional Accessibility Features</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {[
                      "High contrast text",
                      "Large text size",
                      "Dyslexia-friendly fonts",
                      "Screen reader compatible",
                      "Keyboard navigation",
                      "Reduced motion",
                      "Color blind friendly"
                    ].map((need) => (
                      <div key={need} className="flex items-center space-x-2">
                        <Checkbox
                          id={need}
                          checked={formData.accessibility_needs.includes(need)}
                          onCheckedChange={() => handleAccessibilityNeedToggle(need)}
                        />
                        <Label htmlFor={need} className="text-sm">
                          {need}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio & Speech Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Audio & Speech Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Text-to-Speech */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="tts" className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        Text-to-Speech
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Powered by Google Cloud Neural2 TTS
                      </p>
                    </div>
                    <Switch
                      id="tts"
                      checked={accessibilitySettings.textToSpeech}
                      onCheckedChange={(checked) => updateAccessibilitySetting('textToSpeech', checked)}
                    />
                  </div>

                  {/* Advanced TTS Options */}
                  {accessibilitySettings.textToSpeech && (
                    <div className="ml-6 space-y-4 p-4 bg-muted/30 rounded-lg border">
                      <h4 className="text-sm font-medium">Advanced TTS Options</h4>

                      {/* Voice Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm">Voice</Label>
                        {loadingVoices ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading voices...
                          </div>
                        ) : (
                          <Select
                            value={accessibilitySettings.ttsVoice}
                            onValueChange={(value) => updateAccessibilitySetting('ttsVoice', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableVoices.length > 0 ? (
                                availableVoices.slice(0, 10).map((voice) => (
                                  <SelectItem key={voice.name} value={voice.name}>
                                    {voice.name} ({voice.gender})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="en-US-Neural2-C">en-US-Neural2-C (FEMALE)</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Language Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm">Language</Label>
                        <Select
                          value={accessibilitySettings.ttsLanguage}
                          onValueChange={(value) => {
                            updateAccessibilitySetting('ttsLanguage', value);
                            loadVoiceOptions(); // Reload voices for new language
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ttsLanguages.length > 0 ? (
                              ttsLanguages.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="en-GB">English (UK)</SelectItem>
                                <SelectItem value="es-ES">Spanish</SelectItem>
                                <SelectItem value="fr-FR">French</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Speed Control */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Speed</Label>
                          <span className="text-sm text-muted-foreground">{accessibilitySettings.ttsSpeed.toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[accessibilitySettings.ttsSpeed]}
                          onValueChange={([value]) => updateAccessibilitySetting('ttsSpeed', value)}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      {/* Auto-play Toggle */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoplay" className="text-sm">
                          Auto-play AI Responses
                        </Label>
                        <Switch
                          id="autoplay"
                          checked={accessibilitySettings.ttsAutoPlay}
                          onCheckedChange={(checked) => updateAccessibilitySetting('ttsAutoPlay', checked)}
                        />
                      </div>

                      {/* Test Voice Button */}
                      <Button
                        onClick={handleTestVoice}
                        disabled={isSynthesizing}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        {isSynthesizing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Test Voice
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Speech-to-Text */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="stt" className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Speech-to-Text
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Powered by Local Whisper (92%+ accuracy)
                      </p>
                    </div>
                    <Switch
                      id="stt"
                      checked={accessibilitySettings.speechToText}
                      onCheckedChange={(checked) => updateAccessibilitySetting('speechToText', checked)}
                    />
                  </div>

                  {/* Advanced STT Options */}
                  {accessibilitySettings.speechToText && (
                    <div className="ml-6 space-y-4 p-4 bg-muted/30 rounded-lg border">
                      <h4 className="text-sm font-medium">Advanced STT Options</h4>

                      {/* STT Language Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm">Language</Label>
                        <Select
                          value={accessibilitySettings.sttLanguage}
                          onValueChange={(value) => updateAccessibilitySetting('sttLanguage', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sttLanguages.length > 0 ? (
                              sttLanguages.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        💡 Click the microphone icon in the chat to start voice input
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">Enable high contrast colors</p>
                  </div>
                  <Switch
                    checked={accessibilitySettings.contrastMode === 'high'}
                    onCheckedChange={(checked) => 
                      updateAccessibilitySetting('contrastMode', checked ? 'high' : 'normal')
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Large Text</Label>
                    <p className="text-sm text-muted-foreground">Increase text size</p>
                  </div>
                  <Switch
                    checked={accessibilitySettings.fontSize === 'Large'}
                    onCheckedChange={(checked) => 
                      updateAccessibilitySetting('fontSize', checked ? 'Large' : 'Medium')
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dyslexia-Friendly Font</Label>
                    <p className="text-sm text-muted-foreground">Use readable font for dyslexia</p>
                  </div>
                  <Switch
                    checked={accessibilitySettings.dyslexiaFont}
                    onCheckedChange={(checked) => updateAccessibilitySetting('dyslexiaFont', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reduce Motion</Label>
                    <p className="text-sm text-muted-foreground">Minimize animations</p>
                  </div>
                  <Switch
                    checked={!accessibilitySettings.animations}
                    onCheckedChange={(checked) => updateAccessibilitySetting('animations', !checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label>Sign Out</Label>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={loggingOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        {loggingOut ? "Signing out..." : "Sign Out"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sign Out</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to sign out? You'll need to log in again to access your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} disabled={loggingOut}>
                          {loggingOut ? "Signing out..." : "Sign Out"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}