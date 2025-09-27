import React from 'react';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { StepNameCollection } from '@/components/onboarding/StepNameCollection';
import { StepExamSelection } from '@/components/onboarding/StepExamSelection';
import { StepGradeSelection } from '@/components/onboarding/StepGradeSelection';
import { StepAccessibilityPreferences } from '@/components/onboarding/StepAccessibilityPreferences';
import { StepLearningGoals } from '@/components/onboarding/StepLearningGoals';

function OnboardingContent() {
  const { currentStep } = useOnboarding();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <StepNameCollection />;
      case 1:
        return <StepExamSelection />;
      case 2:
        return <StepGradeSelection />;
      case 3:
        return <StepAccessibilityPreferences />;
      case 4:
        return <StepLearningGoals />;
      default:
        return <StepNameCollection />;
    }
  };

  return (
    <div className="onboarding-container">
      {renderCurrentStep()}
    </div>
  );
}

export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}