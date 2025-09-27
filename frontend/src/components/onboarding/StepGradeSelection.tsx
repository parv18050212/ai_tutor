import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepTwoSchema, type StepTwoData } from '@/lib/onboarding-schemas';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GraduationCap } from 'lucide-react';

export function StepGradeSelection() {
  const { stepTwoData, setStepTwoData, nextStep, prevStep } = useOnboarding();
  
  const form = useForm<StepTwoData>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      grade: stepTwoData?.grade || undefined,
    },
  });

  const onSubmit = (data: StepTwoData) => {
    setStepTwoData(data);
    nextStep();
  };

  return (
    <OnboardingLayout
      title="Choose Your Grade Level"
      subtitle="Let's personalize your learning experience for your academic level"
      onBack={prevStep}
      onNext={form.handleSubmit(onSubmit)}
      canProceed={form.formState.isValid}
      nextLabel="Continue"
    >
      <Form {...form}>
        <form className="space-y-8">
          {/* Grade Selection */}
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">
                  Select Your Grade *
                </FormLabel>
                <FormControl>
                  <div className="grid gap-4">
                    {[
                      { value: "11", label: "Grade 11", description: "First year of senior secondary education" },
                      { value: "12", label: "Grade 12", description: "Final year preparing for entrance exams" }
                    ].map((grade) => (
                      <Card 
                        key={grade.value}
                        className={`cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-md ${
                          field.value === grade.value 
                            ? 'ring-2 ring-primary bg-primary/5 border-primary' 
                            : 'border-2 hover:border-primary/50'
                        }`}
                        onClick={() => field.onChange(grade.value)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <GraduationCap className="h-6 w-6 text-primary" />
                                <h3 className="text-xl font-semibold text-foreground">
                                  {grade.label}
                                </h3>
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {grade.description}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              field.value === grade.value 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground'
                            }`}>
                              {field.value === grade.value && (
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
              📚 Personalized Learning Experience
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our AI tutor will customize lessons and practice problems based on your grade level and learning preferences. 
              You'll be able to select specific subjects after completing the setup.
            </p>
          </div>
        </form>
      </Form>
    </OnboardingLayout>
  );
}