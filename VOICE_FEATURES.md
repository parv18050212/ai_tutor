# Voice Control Features - Browser-Based Implementation

## 🎤 Overview

This project uses **Browser Web Speech API** for all voice features - providing free, offline-capable, and privacy-friendly voice control without requiring any API keys or cloud services.

## ✨ Features

### Text-to-Speech (TTS)
- **50+ Voices**: Multiple voices across 15+ languages
- **Speed Control**: Adjust from 0.5x to 2.0x
- **Auto-Play**: Optional automatic reading of AI responses
- **Queue Management**: Multiple messages queued and played in order
- **Playback Controls**: Pause, resume, stop functionality

### Speech-to-Text (STT)
- **Real-time Recognition**: Live transcription as you speak
- **15+ Languages**: Support for major languages worldwide
- **Interim Results**: See partial transcription while speaking
- **Error Handling**: User-friendly error messages

### Voice Commands
15+ hands-free commands for complete app control:

#### Navigation (4 commands)
- "go to dashboard"
- "open quiz"
- "go back"
- "show/hide resources"

#### Chat Control (3 commands)
- "send message"
- "clear input"
- "start new session"

#### Tutor Actions (5 commands)
- "give me a hint"
- "show me an example"
- "explain slower"
- "summarize"
- "use an analogy"

#### UI Control (3 commands)
- "scroll up/down"
- "read last message"
- "repeat"

## 🚀 Quick Start

### 1. Enable Voice Features

Go to **Settings → Accessibility**:

#### Enable TTS:
```typescript
1. Toggle "Text-to-Speech" ON
2. Select your preferred voice
3. Adjust speed (default: 1.0x)
4. Click "Test Voice" to hear a sample
5. Enable "Auto-play AI Responses" (optional)
```

#### Enable STT:
```typescript
1. Toggle "Speech-to-Text" ON
2. Select your language
3. Click microphone button in chat to start
```

### 2. Use Voice Commands

```typescript
1. Click the floating microphone button (bottom-right)
2. Wait for "Listening..." indicator
3. Speak your command clearly
4. Command executes automatically
```

## 🔧 Implementation Details

### Architecture

```
User speaks → Browser STT API → useVoiceControl hook → Parse command → Execute action
User reads ← Browser TTS API ← useBrowserTTS hook ← AI response text
```

### Key Files

#### Hooks
- **[useBrowserTTS.ts](frontend/src/hooks/useBrowserTTS.ts)** (274 lines)
  - Web Speech Synthesis API wrapper
  - Queue management, playback controls
  - Voice loading and selection

- **[useBrowserSTT.ts](frontend/src/hooks/useBrowserSTT.ts)** (276 lines)
  - Web Speech Recognition API wrapper
  - Real-time transcription
  - Error handling and browser detection

- **[useVoiceControl.ts](frontend/src/hooks/useVoiceControl.ts)** (417 lines)
  - Voice command parser
  - Command execution engine
  - Integration with STT/TTS

#### Components
- **[VoiceControlPanel.tsx](frontend/src/components/VoiceControlPanel.tsx)** (120 lines)
  - Live transcription display
  - Command feedback
  - Status indicators

- **[VoiceNavigationButton.tsx](frontend/src/components/VoiceNavigationButton.tsx)** (133 lines)
  - Floating microphone button
  - Visual state indicators
  - Tooltip guidance

#### Context
- **[AccessibilityContext.tsx](frontend/src/contexts/AccessibilityContext.tsx)** (100+ lines)
  - Voice settings storage
  - 30+ accessibility options
  - LocalStorage persistence

## 🌐 Browser Compatibility

### Full Support
- ✅ **Chrome** 33+ (Desktop & Android)
- ✅ **Edge** 79+ (Desktop)
- ✅ **Safari** 14.1+ (macOS & iOS)

### Partial Support
- ⚠️ **Safari** (iOS 14+)
  - TTS: Full support
  - STT: Limited support, some commands may not work
  - Voice Commands: Basic support

### No Support
- ❌ **Firefox** (all versions)
  - TTS: Supported
  - STT: Not supported
  - Voice Commands: Not supported

**Recommendation**: Use Chrome or Edge for the best experience.

## 💡 Usage Examples

### Example 1: Auto-Play AI Responses
```typescript
// In TutorChat component
useEffect(() => {
  if (!accessibilitySettings.ttsAutoPlay) return;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.type === 'ai') {
    const selectedVoice = tts.voices.find(
      v => v.name === accessibilitySettings.ttsVoice
    );

    tts.speak(lastMessage.content, {
      voice: selectedVoice,
      rate: accessibilitySettings.ttsSpeed,
    });
  }
}, [messages]);
```

### Example 2: Voice Command Handler
```typescript
const voiceControlHandlers = {
  onRequestHint: () => {
    setInputText('Can you give me a hint?');
  },
  onRequestExample: () => {
    setInputText('Can you show me a solved example?');
  },
  onReadLastMessage: () => {
    const lastAiMessage = messages
      .filter(m => m.type === 'ai')
      .pop();

    if (lastAiMessage) {
      tts.speak(lastAiMessage.content);
    }
  },
};

const voiceControl = useVoiceControl({
  handlers: voiceControlHandlers,
  enableWakeWord: false,
  autoExecute: true,
});
```

### Example 3: Manual Voice Input
```typescript
// Start listening
const handleMicClick = () => {
  if (stt.isListening) {
    stt.stopListening();
  } else {
    stt.startListening({
      continuous: false,
      interimResults: true,
    });
  }
};

// Use final transcript
useEffect(() => {
  if (stt.finalTranscript) {
    setInputText(stt.finalTranscript);
    stt.resetTranscript();
  }
}, [stt.finalTranscript]);
```

## 🎯 Adding New Voice Commands

To add a new voice command:

### 1. Update Command Parser
Edit [useVoiceControl.ts](frontend/src/hooks/useVoiceControl.ts:104):

```typescript
const parseVoiceCommand = (text: string): VoiceCommand => {
  const lowerText = text.toLowerCase();

  // Add your new command
  if (lowerText.includes('your trigger phrase')) {
    return {
      type: 'tutor_action',  // or 'navigation', 'chat_control', etc.
      action: 'your_action_name',
      confidence: 0.9
    };
  }

  // ... existing commands
};
```

### 2. Add Handler Interface
Edit [useVoiceControl.ts](frontend/src/hooks/useVoiceControl.ts:19):

```typescript
export interface VoiceControlHandlers {
  // ... existing handlers
  onYourActionName?: () => void;
}
```

### 3. Execute Command
Edit [useVoiceControl.ts](frontend/src/hooks/useVoiceControl.ts:199):

```typescript
const executeCommand = useCallback((command: VoiceCommand) => {
  // ... existing code

  if (command.type === 'tutor_action') {
    switch (command.action) {
      case 'your_action_name':
        handlers.onYourActionName?.();
        break;
      // ... existing actions
    }
  }
}, [handlers]);
```

### 4. Implement in Component
Edit [TutorChat.tsx](frontend/src/pages/TutorChat.tsx):

```typescript
const voiceControlHandlers = {
  // ... existing handlers
  onYourActionName: () => {
    // Your custom action
    console.log('Custom action triggered!');
  },
};
```

## 🔊 Voice Quality Tips

### For Best TTS Quality:
1. **Choose Neural Voices**: Look for voices with "neural" or "enhanced" in the name
2. **Adjust Speed**: Start at 1.0x and adjust based on preference
3. **Test Multiple Voices**: Different voices sound better for different content
4. **Use Punctuation**: Proper punctuation improves speech rhythm

### For Best STT Accuracy:
1. **Clear Microphone**: Ensure microphone has permissions
2. **Quiet Environment**: Minimize background noise
3. **Speak Clearly**: Pronounce words clearly at moderate pace
4. **Pause Between Commands**: Wait for "Listening" indicator

## 🐛 Troubleshooting

### TTS Not Working
```typescript
// Check browser support
const isSupported = 'speechSynthesis' in window;
console.log('TTS Supported:', isSupported);

// Check voices loaded
const voices = speechSynthesis.getVoices();
console.log('Available voices:', voices.length);

// Force voice reload
speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => {
  console.log('Voices updated');
};
```

### STT Not Working
```typescript
// Check browser support
const isSupported = 'SpeechRecognition' in window ||
                    'webkitSpeechRecognition' in window;
console.log('STT Supported:', isSupported);

// Check microphone permission
navigator.permissions.query({ name: 'microphone' })
  .then(result => {
    console.log('Microphone permission:', result.state);
  });
```

### Common Issues

**Issue**: Voices not loading
**Solution**: Voices load asynchronously. Wait for `voiceschanged` event.

**Issue**: STT stops after few seconds
**Solution**: Set `continuous: true` for longer listening sessions.

**Issue**: Commands not recognized
**Solution**: Check command patterns in `parseVoiceCommand()` - they're case-insensitive but must match phrases.

**Issue**: TTS sounds robotic
**Solution**: Try different voices - neural voices sound more natural.

## 📊 Performance Considerations

### TTS Performance
- **No network calls**: All processing happens in browser
- **Instant start**: No latency from API calls
- **Queue management**: Messages played in order without blocking
- **Memory efficient**: Browser handles audio buffering

### STT Performance
- **Real-time**: Near-instant transcription
- **Low CPU**: Browser-optimized processing
- **No data sent to cloud**: Complete privacy
- **Works offline**: No internet required (after initial page load)

## 🔒 Privacy & Security

### Data Privacy
- ✅ **No cloud processing**: All voice processing happens in browser
- ✅ **No audio recording**: Audio not saved or transmitted
- ✅ **No tracking**: No analytics on voice usage
- ✅ **Complete offline**: Works without internet after page load

### Security Benefits
- ✅ **No API keys**: No credentials to manage or expose
- ✅ **No billing**: Completely free forever
- ✅ **No rate limits**: Use as much as needed
- ✅ **No vendor lock-in**: Standard browser APIs

## 🎓 Best Practices

### For Developers
1. **Always check browser support** before using features
2. **Provide fallbacks** for unsupported browsers
3. **Handle errors gracefully** with user-friendly messages
4. **Test on multiple browsers** to ensure compatibility
5. **Respect user preferences** - allow disabling voice features

### For Users
1. **Grant microphone permissions** when prompted
2. **Use headphones** to prevent echo during voice input
3. **Speak clearly** at normal pace for best recognition
4. **Adjust settings** to match your preferences
5. **Report issues** if commands don't work as expected

## 📈 Future Enhancements

### Potential Additions
- [ ] Custom wake word configuration
- [ ] Voice command aliases (user-defined triggers)
- [ ] Multi-language voice command support
- [ ] Voice training for better accuracy
- [ ] Offline voice command history
- [ ] Voice shortcuts for common actions
- [ ] Integration with browser's voice assistant

### Not Planned (Browser Limitations)
- ❌ Voice cloning or custom voices (requires cloud service)
- ❌ Real-time translation (would need external API)
- ❌ Advanced NLP (beyond simple pattern matching)
- ❌ Voice biometrics/authentication

## 🤝 Contributing

To contribute voice-related features:

1. **Test on all supported browsers** before submitting PR
2. **Document browser compatibility** for new features
3. **Add error handling** for unsupported browsers
4. **Update this guide** with new commands or features
5. **Include usage examples** in your PR description

## 📞 Support

For voice-related issues:
1. Check [Troubleshooting](#-troubleshooting) section above
2. Verify browser compatibility table
3. Test with different browser/device
4. Open issue with browser info and error console logs

---

**Powered by Web Speech API** - Free, fast, and privacy-friendly voice features for everyone.
