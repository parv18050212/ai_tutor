import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepOneSchema, type StepOneData } from '@/lib/onboarding-schemas';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { BookOpen, GraduationCap } from 'lucide-react';
import { getAllExams } from '@/lib/subjects-data';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export function StepExamSelection() {
  const { stepOneData, setStepOneData, nextStep, prevStep } = useOnboarding();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const form = useForm<StepOneData>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      examId: stepOneData?.examId || '',
    },
  });

  const watchedExamId = form.watch("examId");

  const onSubmit = (data: StepOneData) => {
    setStepOneData(data);
    nextStep();
  };

  useEffect(() => {
    const loadExams = async () => {
      try {
        const examData = await getAllExams();
        setExams(examData);
      } catch (error) {
        console.error('Error loading exams:', error);
        toast({
          title: "Error",
          description: "Failed to load exam options. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

  useEffect(() => {
    if (watchedExamId && exams.length > 0) {
      const selectedExam = exams.find(exam => exam.id === watchedExamId);
      if (selectedExam) {
        form.setValue("examId", selectedExam.id);
      }
    }
  }, [watchedExamId, exams, form]);

  if (loading) {
    return (
      <OnboardingLayout
        title="Loading Exam Options..."
        subtitle="Please wait while we fetch the available exams"
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      title="Choose Your Target Exam"
      subtitle="Select the entrance exam you're preparing for. This will customize your learning path and content."
      onBack={prevStep}
      onNext={form.handleSubmit(onSubmit)}
      canProceed={form.formState.isValid}
      nextLabel="Continue"
    >
      <Form {...form}>
        <form className="space-y-8">
          {/* Exam Selection */}
          <FormField
            control={form.control}
            name="examId"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="grid gap-4">
                    {exams.map((exam) => (
                      <Card 
                        key={exam.id}
                        className={`cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-md ${
                          field.value === exam.id 
                            ? 'ring-2 ring-primary bg-primary/5 border-primary' 
                            : 'border-2 hover:border-primary/50'
                        }`}
                        onClick={() => field.onChange(exam.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                {exam.id.includes('jee') ? (
                                  <GraduationCap className="h-6 w-6 text-primary" />
                                ) : (
                                  <BookOpen className="h-6 w-6 text-primary" />
                                )}
                                <h3 className="text-xl font-semibold text-foreground">
                                  {exam.name}
                                </h3>
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {exam.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>📚 {exam.subjects?.length || 0} Subjects</span>
                                <span>🎯 {exam.subjects?.reduce((acc: number, s: any) => acc + (s.chapters?.length || 0), 0) || 0} Chapters</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              field.value === exam.id 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground'
                            }`}>
                              {field.value === exam.id && (
                                <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Info Section */}
          <div className="bg-secondary/10 p-6 rounded-lg border border-secondary/20">
            <h3 className="font-semibold text-secondary-foreground mb-2">
              🎯 What happens next?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based on your exam choice, we'll customize your subject options, difficulty levels, and practice materials. 
              You can always switch exams later from your dashboard.
            </p>
          </div>
        </form>
      </Form>
    </OnboardingLayout>
  );
}