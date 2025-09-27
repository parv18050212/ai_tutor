import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepThreeSchema, type StepThreeData } from '@/lib/onboarding-schemas';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Heart, Volume2 } from 'lucide-react';
import { DISABILITY_TYPES, FORMAT_PREFERENCES, LEARNING_SPEEDS } from '@/lib/onboarding-schemas';

export function StepAccessibilityPreferences() {
  const { stepThreeData, setStepThreeData, nextStep, prevStep } = useOnboarding();
  
  const form = useForm<StepThreeData>({
    resolver: zodResolver(stepThreeSchema),
    defaultValues: stepThreeData || {
      disabilityType: "none",
      formatPreferences: [],
      learningSpeed: "normal",
    },
  });

  const onSubmit = (data: StepThreeData) => {
    setStepThreeData(data);
    nextStep();
  };

  const watchedDisabilityType = form.watch("disabilityType");
  const formatPreferences = form.watch("formatPreferences") || [];

  return (
    <OnboardingLayout
      title="Accessibility & Learning Preferences"
      subtitle="Help us create an inclusive learning experience tailored just for you"
      onBack={prevStep}
      onNext={form.handleSubmit(onSubmit)}
      canProceed={form.formState.isValid}
      nextLabel="Continue"
    >
      <Form {...form}>
        <form className="space-y-8">
          {/* Disability Type Selection */}
          <FormField
            control={form.control}
            name="disabilityType"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-lg font-semibold">
                  Do you have any accessibility needs? *
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {DISABILITY_TYPES.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={type.value} 
                          id={type.value}
                          className="border-2 w-5 h-5"
                        />
                        <Label 
                          htmlFor={type.value}
                          className="text-base font-medium cursor-pointer flex-1 py-2"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Format Preferences (only show if not "none") */}
          {watchedDisabilityType !== "none" && (
            <FormField
              control={form.control}
              name="formatPreferences"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold">
                      Preferred Content Formats
                    </FormLabel>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select all formats that work best for you (optional)
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FORMAT_PREFERENCES.map((format) => (
                      <FormField
                        key={format.value}
                        control={form.control}
                        name="formatPreferences"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={format.value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(format.value)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValue, format.value])
                                      : field.onChange(
                                          currentValue?.filter(
                                            (value) => value !== format.value
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-base font-medium">
                                  {format.label}
                                </FormLabel>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Learning Speed */}
          <FormField
            control={form.control}
            name="learningSpeed"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-lg font-semibold">
                  Preferred Learning Pace *
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-1 gap-4"
                  >
                    {LEARNING_SPEEDS.map((speed) => (
                      <Card 
                        key={speed.value}
                        className={`cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-md ${
                          field.value === speed.value 
                            ? 'ring-2 ring-primary bg-primary/5 border-primary' 
                            : 'border-2 hover:border-primary/50'
                        }`}
                        onClick={() => field.onChange(speed.value)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem 
                                value={speed.value} 
                                id={speed.value}
                                className="border-2"
                              />
                              <Label 
                                htmlFor={speed.value}
                                className="text-base font-medium cursor-pointer"
                              >
                                {speed.label}
                              </Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Info Section */}
          <div className="bg-secondary/10 p-6 rounded-lg border border-secondary/20">
            <h3 className="font-semibold text-secondary-foreground mb-2 flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              🌟 Inclusive Learning
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We're committed to making learning accessible for everyone. Based on your preferences, 
              we'll customize the interface, content delivery, and interaction methods to best support your learning style.
            </p>
          </div>
        </form>
      </Form>
    </OnboardingLayout>
  );
}