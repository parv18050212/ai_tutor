import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepZeroSchema, type StepZeroData } from '@/lib/onboarding-schemas';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { User } from 'lucide-react';

export function StepNameCollection() {
  const { stepZeroData, setStepZeroData, nextStep } = useOnboarding();
  
  const form = useForm<StepZeroData>({
    resolver: zodResolver(stepZeroSchema),
    defaultValues: {
      name: stepZeroData?.name || '',
    },
  });

  const onSubmit = (data: StepZeroData) => {
    setStepZeroData(data);
    nextStep();
  };

  return (
    <OnboardingLayout
      title="Welcome! Let's Get Started"
      subtitle="Tell us your name so we can personalize your learning experience"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">What should we call you?</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="Enter your name"
                      className="text-center text-lg py-3"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full py-3 text-lg"
              disabled={!form.formState.isValid}
            >
              Continue
            </Button>
          </form>
        </Form>
      </div>
    </OnboardingLayout>
  );
}