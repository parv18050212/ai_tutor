import { useState, useEffect, useCallback } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface VoiceCommandHandlers {
  sendMessage: () => void;
  clearInput: () => void;
  requestHint: () => void;
  requestExample: () => void;
  requestSlower: () => void;
  requestSummary: () => void;
  readLastResponse: () => void;
  toggleVoice: () => void;
}

export const useVoiceCommands = (handlers: VoiceCommandHandlers) => {
  const { settings } = useAccessibility();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // Voice command mappings
  const voiceCommands = {
    // Message controls
    'send message': handlers.sendMessage,
    'send': handlers.sendMessage,
    'submit': handlers.sendMessage,

    // Input controls
    'clear input': handlers.clearInput,
    'clear text': handlers.clearInput,
    'delete text': handlers.clearInput,

    // Learning assistance
    'give me a hint': handlers.requestHint,
    'hint please': handlers.requestHint,
    'help me': handlers.requestHint,

    'show example': handlers.requestExample,
    'give example': handlers.requestExample,
    'example please': handlers.requestExample,

    'explain slower': handlers.requestSlower,
    'go slower': handlers.requestSlower,
    'slow down': handlers.requestSlower,

    'summarize': handlers.requestSummary,
    'summary please': handlers.requestSummary,
    'key points': handlers.requestSummary,

    // Accessibility controls
    'read response': handlers.readLastResponse,
    'read last': handlers.readLastResponse,
    'speak response': handlers.readLastResponse,

    'stop listening': handlers.toggleVoice,
    'stop voice': handlers.toggleVoice,
    'turn off voice': handlers.toggleVoice,
  };

  // Initialize speech recognition
  useEffect(() => {
    if (!settings.speechToText || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();

    newRecognition.continuous = true;
    newRecognition.interimResults = false;
    newRecognition.lang = 'en-US';

    newRecognition.onstart = () => {
      setIsListening(true);
    };

    newRecognition.onend = () => {
      setIsListening(false);
    };

    newRecognition.onresult = (event) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();

      console.log('Voice command heard:', transcript);

      // Check for exact command matches
      const command = voiceCommands[transcript as keyof typeof voiceCommands];
      if (command) {
        command();
        return;
      }

      // Check for partial matches
      for (const [commandPhrase, handler] of Object.entries(voiceCommands)) {
        if (transcript.includes(commandPhrase)) {
          handler();
          return;
        }
      }

      // If no command match, treat as regular input
      // This would need to be passed back to the parent component
      console.log('No command match, treating as regular input:', transcript);
    };

    newRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    setRecognition(newRecognition);

    return () => {
      newRecognition.stop();
    };
  }, [settings.speechToText]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Keyboard shortcuts for voice commands
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+V to toggle voice commands
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        toggleListening();
      }

      // Ctrl+Shift+H for hint
      if (event.ctrlKey && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        handlers.requestHint();
      }

      // Ctrl+Shift+E for example
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        handlers.requestExample();
      }

      // Ctrl+Shift+R to read last response
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        handlers.readLastResponse();
      }
    };

    if (settings.keyboardMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [settings.keyboardMode, handlers, toggleListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    isVoiceSupported: !!recognition,
  };
};

// Declare global speech recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}