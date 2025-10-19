/**
 * useRealtimeVoice Hook
 *
 * Connects to OpenAI Realtime API via backend WebSocket relay
 * Provides ultra-low latency voice conversations (~320ms)
 * Routes transcriptions through Gemini Socratic tutoring
 *
 * Usage:
 * ```tsx
 * const voice = useRealtimeVoice({
 *   sessionId: '...',
 *   examId: 'jee',
 *   onTranscript: (text) => console.log('User said:', text),
 *   onAiResponse: (text) => console.log('AI said:', text)
 * });
 *
 * // Start voice mode
 * await voice.connect();
 *
 * // Stop voice mode
 * voice.disconnect();
 * ```
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UseRealtimeVoiceOptions {
  sessionId: string;
  examId: string;
  subjectId: string;
  chapterId: string;
  examName: string;
  subjectName: string;
  chapterName: string;
  accessibilitySettings?: any;
  onTranscript?: (text: string) => void;
  onAiResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

export interface UseRealtimeVoiceReturn {
  isConnected: boolean;
  isSpeaking: boolean;  // AI is speaking
  isListening: boolean;  // Mic is active
  transcript: string;  // Latest user transcript
  aiResponse: string;  // Latest AI response
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isSupported: boolean;
}

/**
 * Check browser support for required APIs
 */
const checkBrowserSupport = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
};

export function useRealtimeVoice(options: UseRealtimeVoiceOptions): UseRealtimeVoiceReturn {
  const {
    sessionId,
    examId,
    subjectId,
    chapterId,
    examName,
    subjectName,
    chapterName,
    accessibilitySettings,
    onTranscript,
    onAiResponse,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(checkBrowserSupport());

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  /**
   * Get WebSocket URL with auth token
   */
  const getWebSocketUrl = async (): Promise<string> => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^http/, 'ws');

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Build query params
    const params = new URLSearchParams({
      token: session.access_token,
      session_id: sessionId,
      exam_id: examId,
      subject_id: subjectId,
      chapter_id: chapterId,
      exam_name: examName,
      subject_name: subjectName,
      chapter_name: chapterName,
    });

    if (accessibilitySettings) {
      params.append('accessibility_settings', JSON.stringify(accessibilitySettings));
    }

    return `${wsUrl}/api/realtime/ws/voice?${params.toString()}`;
  };

  /**
   * Start audio capture from microphone
   */
  const startAudioCapture = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      audioContextRef.current = audioContext;

      // Load audio processor worklet
      try {
        await audioContext.audioWorklet.addModule('/audio-processor.js');
      } catch (err) {
        // Bug #12 fix: Cleanup resources before throwing error
        console.error('Failed to load audio worklet:', err);

        // Stop media stream tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        throw new Error('Audio processor not available. Make sure audio-processor.js is in /public folder.');
      }

      // Create audio processing chain
      const source = audioContext.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(audioContext, 'pcm16-processor');

      // Handle audio chunks from processor
      processor.port.onmessage = (event) => {
        const pcm16Data = event.data;  // Int16Array

        // Convert to base64
        const base64Audio = arrayBufferToBase64(pcm16Data.buffer);

        // Send to WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio,
          }));
        }
      };

      source.connect(processor);
      // Don't connect to destination (no local playback of mic)

      audioWorkletNodeRef.current = processor;
      setIsListening(true);

      console.log('Audio capture started');
    } catch (err: any) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone permissions.'
        : `Failed to start audio capture: ${err.message}`;

      console.error('Audio capture error:', err);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [onError]);

  /**
   * Stop audio capture
   */
  const stopAudioCapture = useCallback(() => {
    // 1. First, disconnect audio worklet and close message port
    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.port.close();
      } catch (err) {
        // Port might already be closed
        console.warn('Failed to close worklet port:', err);
      }
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }

    // 2. Then stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 3. DON'T close audio context - we need it for playback!
    // The audio context will be closed when the connection is fully disconnected

    setIsListening(false);
    console.log('Audio capture stopped (audio context kept alive for playback)');
  }, []);

  /**
   * Play next audio chunk in queue
   */
  const playNextInQueue = useCallback(() => {
    // Check if audio context exists and is not closed
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const pcm16Data = audioQueueRef.current.shift()!;

    // Convert PCM16 to AudioBuffer
    const audioBuffer = audioContextRef.current.createBuffer(1, pcm16Data.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    // Convert Int16 to Float32 (-1.0 to 1.0)
    for (let i = 0; i < pcm16Data.length; i++) {
      channelData[i] = pcm16Data[i] / 32768.0;
    }

    // Create buffer source and play
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      playNextInQueue();  // Play next chunk when this one finishes
    };

    source.start();
  }, []);

  /**
   * Play complete TTS audio from Google Cloud TTS (MP3 format)
   */
  const playTTSAudio = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) {
      console.error('❌ No audio context available for TTS playback');
      return;
    }

    try {
      console.log('🔊 Playing Google TTS audio...');
      setIsSpeaking(true);

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode MP3 audio
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);

      // Create buffer source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        console.log('✅ TTS audio playback finished');
        setIsSpeaking(false);
      };

      source.start();
      console.log(`▶️ Started Google TTS playback (${audioBuffer.duration.toFixed(2)}s)`);
    } catch (err) {
      console.error('Error playing TTS audio:', err);
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Play audio chunk received from OpenAI
   */
  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) {
      console.error('❌ No audio context available for playback');
      return;
    }

    if (audioContextRef.current.state === 'closed') {
      console.error('❌ Audio context is closed');
      return;
    }

    try {
      // Decode base64 to ArrayBuffer
      const audioData = base64ToInt16Array(base64Audio);
      console.log(`🔊 Received audio chunk: ${audioData.length} samples`);

      // Add to queue
      audioQueueRef.current.push(audioData);
      console.log(`📝 Audio queue length: ${audioQueueRef.current.length}`);

      // Start playback if not already playing
      if (!isPlayingRef.current) {
        console.log('▶️ Starting audio playback');
        playNextInQueue();
      }
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }, [playNextInQueue]);

  /**
   * Connect to voice WebSocket
   */
  const connect = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Browser does not support required APIs for voice mode';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Bug #7 fix: Validate sessionId before connecting
    if (!sessionId || sessionId.trim() === '') {
      const errorMsg = 'Session not ready. Please wait for session to initialize.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (wsRef.current) {
      console.warn('Already connected');
      return;
    }

    try {
      setError(null);

      const wsUrl = await getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Voice WebSocket connected');
        setIsConnected(true);

        // Start audio capture
        startAudioCapture();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type;

          console.log('Received event:', eventType);

          // Handle different event types
          switch (eventType) {
            case 'connection_established':
              console.log('Voice mode activated:', data.message);
              break;

            case 'user_transcript':
              // User speech transcribed
              const userText = data.transcript;
              console.log('📝 User transcript received:', userText);
              setTranscript(userText);
              if (onTranscript) {
                console.log('✅ Calling onTranscript callback');
                onTranscript(userText);
              } else {
                console.warn('⚠️ onTranscript callback is not defined');
              }
              break;

            case 'ai_response_text':
              // AI response from Gemini
              const aiText = data.text;
              setAiResponse(aiText);
              onAiResponse?.(aiText);
              break;

            case 'tts_audio':
              // Complete TTS audio from OpenAI TTS API (not Realtime)
              console.log('🎵 Received TTS audio');
              if (data.audio) {
                playTTSAudio(data.audio);
              } else {
                console.error('❌ TTS audio is missing in event');
              }
              break;

            case 'response.audio.delta':
              // Audio chunk from OpenAI TTS
              console.log('🎵 Received audio delta event');
              if (data.delta) {
                playAudioChunk(data.delta);
              } else {
                console.error('❌ Audio delta is missing in event');
              }
              break;

            case 'response.audio.done':
              // Audio response complete
              console.log('✅ Audio response complete');
              break;

            case 'error':
              // Error from server
              const errorMsg = data.error || 'Unknown error from server';
              console.error('Server error:', errorMsg);
              setError(errorMsg);
              onError?.(errorMsg);
              break;

            default:
              // Log unknown events
              console.debug('Unknown event type:', eventType);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        onError?.('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        stopAudioCapture();
        wsRef.current = null;

        if (event.code !== 1000 && event.code !== 1001) {
          // Abnormal closure
          setError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
          onError?.(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
        }
      };

      wsRef.current = ws;
    } catch (err: any) {
      const errorMsg = `Failed to connect: ${err.message}`;
      console.error('Connection error:', err);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [isSupported, sessionId, examId, subjectId, chapterId, startAudioCapture, stopAudioCapture, onTranscript, onAiResponse, onError, playAudioChunk]);

  /**
   * Disconnect from voice WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    stopAudioCapture();

    // Close audio context on full disconnect
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setTranscript('');
    setAiResponse('');
    setError(null);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);

    console.log('Disconnected from voice mode');
  }, [stopAudioCapture]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isSpeaking,
    isListening,
    transcript,
    aiResponse,
    error,
    connect,
    disconnect,
    isSupported,
  };
}

/**
 * Helper: Convert ArrayBuffer to base64
 * Uses chunked processing to avoid stack overflow on large buffers
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;  // Process in 32KB chunks to avoid stack overflow
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

/**
 * Helper: Convert base64 to Int16Array
 */
function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}
