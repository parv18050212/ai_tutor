import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  canProceed?: boolean;
  isLoading?: boolean;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  onNext,
  onBack,
  nextLabel = "Next Step",
  backLabel = "Back",
  canProceed = true,
  isLoading = false
}: OnboardingLayoutProps) {
  const { currentStep } = useOnboarding();
  const progress = ((currentStep + 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-2xl font-bold text-primary">Atypical Academy</h1>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of 5
            </div>
            <Progress 
              value={progress} 
              className="w-full max-w-sm mx-auto h-2"
              aria-label={`Progress: Step ${currentStep + 1} of 5`}
            />
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-muted-foreground text-base leading-relaxed">
                {subtitle}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-8">
            {children}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={currentStep === 0 || isLoading}
                className="flex items-center gap-2 min-w-[120px] h-12"
                aria-label={`Go back to step ${currentStep}`}
              >
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </Button>
              
              <Button
                onClick={onNext}
                disabled={!canProceed || isLoading}
                className="flex items-center gap-2 min-w-[120px] h-12 bg-primary hover:bg-primary/90"
                aria-label={currentStep === 4 ? "Complete onboarding" : `Continue to step ${currentStep + 2}`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {nextLabel}
                    {currentStep < 4 && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          Preparing you for JEE and CUET success
        </div>
      </div>
    </div>
  );
}