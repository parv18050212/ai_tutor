import React, { createContext, useContext, useState, useCallback } from 'react';
import { StepZeroData, StepOneData, StepTwoData, StepThreeData, StepFourData } from '@/lib/onboarding-schemas';

interface OnboardingContextType {
  currentStep: number;
  stepZeroData: StepZeroData | null;
  stepOneData: StepOneData | null;
  stepTwoData: StepTwoData | null;
  stepThreeData: StepThreeData | null;
  stepFourData: StepFourData | null;
  setStepZeroData: (data: StepZeroData) => void;
  setStepOneData: (data: StepOneData) => void;
  setStepTwoData: (data: StepTwoData) => void;
  setStepThreeData: (data: StepThreeData) => void;
  setStepFourData: (data: StepFourData) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isStepValid: (step: number) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepZeroData, setStepZeroData] = useState<StepZeroData | null>(null);
  const [stepOneData, setStepOneData] = useState<StepOneData | null>(null);
  const [stepTwoData, setStepTwoData] = useState<StepTwoData | null>(null);
  const [stepThreeData, setStepThreeData] = useState<StepThreeData | null>(null);
  const [stepFourData, setStepFourData] = useState<StepFourData | null>(null);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step <= 4) {
      setCurrentStep(step);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const isStepValid = useCallback((step: number) => {
    switch (step) {
      case 0:
        return stepZeroData !== null;
      case 1:
        return stepOneData !== null;
      case 2:
        return stepTwoData !== null;
      case 3:
        return stepThreeData !== null;
      case 4:
        return stepFourData !== null;
      default:
        return false;
    }
  }, [stepZeroData, stepOneData, stepTwoData, stepThreeData, stepFourData]);

  const value = {
    currentStep,
    stepZeroData,
    stepOneData,
    stepTwoData,
    stepThreeData,
    stepFourData,
    setStepZeroData,
    setStepOneData,
    setStepTwoData,
    setStepThreeData,
    setStepFourData,
    goToStep,
    nextStep,
    prevStep,
    isStepValid,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}