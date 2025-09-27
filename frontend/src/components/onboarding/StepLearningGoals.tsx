import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepFourSchema, type StepFourData } from '@/lib/onboarding-schemas';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Target, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function StepLearningGoals() {
  const navigate = useNavigate();
  const { 
    stepZeroData,
    stepOneData,
    stepTwoData,
    stepThreeData,
    stepFourData,
    setStepFourData,
    prevStep
  } = useOnboarding();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examName, setExamName] = useState<string>('');

  const form = useForm<StepFourData>({
    resolver: zodResolver(stepFourSchema),
    defaultValues: {
      learningGoals: stepFourData?.learningGoals || '',
    },
  });

  const watchedGoals = form.watch("learningGoals");

  // Fetch exam name when component mounts
  useEffect(() => {
    const fetchExamName = async () => {
      if (stepOneData?.examId) {
        try {
          const { data, error } = await supabase
            .from('exams')
            .select('name')
            .eq('id', stepOneData.examId)
            .single();
          
          if (error) throw error;
          setExamName(data.name || 'Unknown Exam');
        } catch (error) {
          console.error('Error fetching exam name:', error);
          setExamName('Selected Exam');
        }
      }
    };

    fetchExamName();
  }, [stepOneData?.examId]);

  const onSubmit = async (data: StepFourData) => {
    if (!stepZeroData?.name || !stepOneData?.examId || !stepTwoData?.grade || !stepThreeData) {
      toast({
        title: "Missing Information",
        description: "Please complete all previous steps before continuing.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setStepFourData(data);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Prepare accessibility needs array
      const accessibilityNeeds = stepThreeData.disabilityType !== 'none' 
        ? [stepThreeData.disabilityType, ...(stepThreeData.formatPreferences || [])]
        : [];

      // Prepare learning preferences object
      const learningPreferences = {
        examId: stepOneData.examId,
        grade: stepTwoData.grade,
        learningSpeed: stepThreeData.learningSpeed,
        disabilityType: stepThreeData.disabilityType,
        formatPreferences: stepThreeData.formatPreferences || [],
        learningGoals: data.learningGoals,
        subjects: [] // Will be set later via SubjectManager
      };

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: stepZeroData.name,
          accessibility_needs: accessibilityNeeds,
          learning_preferences: learningPreferences,
          exam_id: stepOneData.examId,
          onboarding_completed: true,
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Welcome to Atypical Academy! 🎉",
        description: `Welcome ${stepZeroData.name}! Your personalized learning experience is ready.`,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Setup Error",
        description: "There was an issue completing your setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSummaryContent = () => {
    if (!stepZeroData?.name || !stepOneData?.examId || !stepTwoData?.grade || !stepThreeData) {
      return null;
    }

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Check className="h-5 w-5 text-primary" />
            Setup Summary for {stepZeroData.name}
          </CardTitle>
          <CardDescription>
            Review your selections before completing setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Target Exam:</span>
              <p className="text-foreground">{examName || 'Loading...'}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Grade Level:</span>
              <p className="text-foreground">Grade {stepTwoData.grade}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Learning Speed:</span>
              <p className="text-foreground capitalize">{stepThreeData.learningSpeed}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Accessibility:</span>
              <p className="text-foreground">{stepThreeData.disabilityType === 'none' ? 'No special needs' : stepThreeData.disabilityType}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <OnboardingLayout
      title="Your Learning Goals"
      subtitle="Tell us about your learning objectives to create a personalized study plan"
      onBack={prevStep}
      onNext={form.handleSubmit(onSubmit)}
      canProceed={form.formState.isValid && !isSubmitting}
      isLoading={isSubmitting}
      nextLabel={isSubmitting ? "Completing Setup..." : "Complete Setup"}
    >
      <Form {...form}>
        <form className="space-y-8">
          {/* Goals Input */}
          <FormField
            control={form.control}
            name="learningGoals"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">
                  What are your main learning goals? *
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what you hope to achieve with your studies. For example: 'I want to score above 95 percentile in JEE Main and get into a top engineering college. I need help with advanced mathematics and physics concepts.'"
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Be as specific as possible to get personalized recommendations</span>
                  <span>{watchedGoals?.length || 0}/500</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Summary Section */}
          {getSummaryContent()}

          {/* Final Info */}
          <div className="bg-secondary/10 p-6 rounded-lg border border-secondary/20">
            <h3 className="font-semibold text-secondary-foreground mb-2 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              🚀 Ready to Begin Your Journey?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once you complete this setup, you'll have access to personalized AI tutoring, 
              practice questions, and study materials tailored specifically for your goals and learning style.
            </p>
          </div>
        </form>
      </Form>
    </OnboardingLayout>
  );
}