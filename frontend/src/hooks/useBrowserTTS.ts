/**
 * Minimal Browser TTS Hook
 *
 * Used ONLY for voice preview in PreferencesDialog.
 * For actual TTS during tutoring, use Voice Agent (OpenAI TTS).
 */

import { useState, useCallback } from 'react';

export interface UseBrowserTTSReturn {
  voices: SpeechSynthesisVoice[];
  isSpeaking: boolean;
  loadVoices: () => void;
  speak: (text: string, options?: { voice?: SpeechSynthesisVoice; rate?: number; lang?: string }) => void;
}

export function useBrowserTTS(): UseBrowserTTSReturn {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadVoices = useCallback(() => {
    const availableVoices = window.speechSynthesis.getVoices();
    setVoices(availableVoices);
  }, []);

  const speak = useCallback((text: string, options?: { voice?: SpeechSynthesisVoice; rate?: number; lang?: string }) => {
    if (!text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (options?.voice) {
      utterance.voice = options.voice;
    }
    if (options?.rate) {
      utterance.rate = options.rate;
    }
    if (options?.lang) {
      utterance.lang = options.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    voices,
    isSpeaking,
    loadVoices,
    speak,
  };
}
