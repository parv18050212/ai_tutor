/**
 * Voice Navigation Button Component
 * Floating action button for voice control with visual feedback
 */

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceNavigationButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function VoiceNavigationButton({
  isListening,
  isProcessing,
  isSpeaking,
  onToggle,
  className,
  size = 'icon',
  variant = 'default',
}: VoiceNavigationButtonProps) {
  // Determine button state
  const getButtonState = () => {
    if (isProcessing) {
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        tooltip: 'Processing...',
        variant: 'secondary' as const,
        pulse: false,
      };
    }
    if (isSpeaking) {
      return {
        icon: <Volume2 className="h-5 w-5" />,
        tooltip: 'Speaking...',
        variant: 'secondary' as const,
        pulse: true,
      };
    }
    if (isListening) {
      return {
        icon: <Mic className="h-5 w-5" />,
        tooltip: 'Listening - Click to stop',
        variant: 'destructive' as const,
        pulse: true,
      };
    }
    return {
      icon: <MicOff className="h-5 w-5" />,
      tooltip: 'Click to start voice control',
      variant: variant,
      pulse: false,
    };
  };

  const state = getButtonState();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size={size}
            variant={state.variant}
            onClick={onToggle}
            disabled={isProcessing}
            className={cn(
              'transition-all duration-200',
              state.pulse && 'animate-pulse',
              isListening && 'ring-2 ring-destructive ring-offset-2',
              isSpeaking && 'ring-2 ring-primary ring-offset-2',
              className
            )}
            aria-label={state.tooltip}
          >
            {state.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{state.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Floating Voice Button Component
 * Positioned as a floating action button
 */
export function FloatingVoiceButton({
  isListening,
  isProcessing,
  isSpeaking,
  onToggle,
  position = 'bottom-right',
}: VoiceNavigationButtonProps & {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <div className={cn('fixed z-50', positionClasses[position])}>
      <VoiceNavigationButton
        isListening={isListening}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        onToggle={onToggle}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl"
      />
    </div>
  );
}
