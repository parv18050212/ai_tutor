# Accessibility Implementation Guide

## Quick Start

This guide provides step-by-step instructions for implementing and extending the accessibility features in the AI Tutor platform.

## Implementation Summary

### ✅ Completed High Priority Features

1. **Backend Accessibility Integration** (`backend/main.py`)
   - Added `accessibility_settings` to `ChatRequest` model
   - Implemented `get_cognitive_adaptive_prompt()` function
   - Added frustration detection with `detect_frustration_markers()`
   - Created memory scaffolding with `add_memory_scaffold()`
   - Enhanced Socratic prompting with accessibility adaptations

2. **Enhanced Voice Commands** (`frontend/src/hooks/useVoiceCommands.ts`)
   - 20+ voice commands for complete hands-free operation
   - Keyboard shortcuts for motor accessibility
   - Speech recognition with error handling
   - Command feedback and confirmation

3. **Frontend Integration** (`frontend/src/pages/TutorChat.tsx`)
   - Accessibility settings passed to backend
   - Voice command interface integration
   - Visual indicators for voice states
   - TTS/STT button controls

4. **Comprehensive Documentation**
   - Complete accessibility guide
   - Implementation instructions
   - Usage guidelines for users and developers

## File Changes Made

### Backend Files Modified

#### `backend/main.py`
```python
# Added to ChatRequest model
accessibility_settings: Optional[dict] = None

# New functions added:
def get_cognitive_adaptive_prompt(accessibility_settings: dict) -> str
def detect_frustration_markers(user_response: str) -> bool
def provide_emotional_support(response: str, is_frustrated: bool = False) -> str
def add_memory_scaffold(response: str, current_concept: str, accessibility_settings: dict) -> str
def get_dynamic_socratic_prompt(..., accessibility_settings: Optional[dict] = None)

# Enhanced chat endpoint with accessibility processing
```

### Frontend Files Modified

#### `frontend/src/services/chatService.ts`
```typescript
// Added to ChatRequest interface
accessibility_settings?: any;
```

#### `frontend/src/pages/TutorChat.tsx`
```typescript
// Added imports
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";

// Added voice command handlers and integration
// Added accessibility settings to API calls
// Added voice control UI elements
```

### New Files Created

#### `frontend/src/hooks/useVoiceCommands.ts`
- Complete voice command system
- Speech recognition integration
- Keyboard shortcut support
- Error handling and fallbacks

#### `ACCESSIBILITY_GUIDE.md`
- Comprehensive user and developer documentation
- Feature descriptions and usage instructions
- Technical architecture details

#### `ACCESSIBILITY_IMPLEMENTATION.md`
- This implementation guide
- Step-by-step setup instructions
- Code examples and best practices

## Testing the Implementation

### 1. Backend Testing

```bash
# Start the backend server
cd backend
python main.py

# Test accessibility endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "I don'\''t understand this",
    "accessibility_settings": {
      "simplifyLanguage": true,
      "dyslexiaFont": true,
      "textToSpeech": true
    }
  }'
```

### 2. Frontend Testing

```bash
# Start the frontend development server
cd frontend
npm start

# Navigate to a tutoring session
# Open accessibility settings (Alt+A)
# Enable various accessibility features
# Test voice commands with Ctrl+Shift+V
```

### 3. Voice Command Testing

**Test Commands:**
- "Send message" - Submit input
- "Give me a hint" - Request help
- "Explain slower" - Request simpler explanation
- "Read response" - Activate TTS
- "Clear input" - Clear text field

### 4. Accessibility Settings Testing

**Test Each Setting:**
- High contrast mode
- Font size changes
- Dyslexia-friendly fonts
- Simplified language
- Text-to-speech
- Speech-to-text
- Reduced motion

## Code Examples

### Adding New Voice Commands

```typescript
// In useVoiceCommands.ts
const newCommands = {
  'repeat question': () => {
    // Repeat the last AI question
    const lastAiMessage = messages.findLast(msg => msg.type === 'ai');
    if (lastAiMessage) {
      speak(lastAiMessage.content);
    }
  },

  'save progress': () => {
    // Save current session
    saveChatSession();
  },

  'take a break': () => {
    // Pause the session
    pauseSession();
  }
};

// Add to existing voiceCommands object
const extendedCommands = { ...voiceCommands, ...newCommands };
```

### Adding New Accessibility Adaptations

```python
# In backend/main.py
def get_cognitive_adaptive_prompt(accessibility_settings: dict) -> str:
    adaptations = []

    # Add new adaptation
    if accessibility_settings.get('visualLearner', False):
        adaptations.append("""
        - Include visual descriptions and diagrams in explanations
        - Use spatial metaphors and visual analogies
        - Suggest drawing or diagramming concepts
        - Reference charts, graphs, and visual aids""")

    # Add autism spectrum support
    if accessibility_settings.get('autismSupport', False):
        adaptations.append("""
        - Use very structured, predictable response format
        - Avoid figurative language and idioms
        - Be explicit about expectations and next steps
        - Provide clear success criteria for each task""")

    return "\n".join(adaptations) if adaptations else ""
```

### Adding New Accessibility Settings

```typescript
// In AccessibilityContext.tsx
interface AccessibilitySettings {
  // Existing settings...

  // Add new settings
  visualLearner: boolean;
  auditoryLearner: boolean;
  kinestheticLearner: boolean;
  autismSupport: boolean;
  anxietySupport: boolean;
  memoryAssistance: boolean;
}

const defaultSettings: AccessibilitySettings = {
  // Existing defaults...

  // New defaults
  visualLearner: false,
  auditoryLearner: false,
  kinestheticLearner: false,
  autismSupport: false,
  anxietySupport: false,
  memoryAssistance: false,
};
```

## Deployment Considerations

### Environment Variables

```bash
# Add to .env files
SPEECH_RECOGNITION_API_KEY=your_key_here
TTS_SERVICE_URL=https://your-tts-service.com
ACCESSIBILITY_ANALYTICS_ENABLED=true
```

### Database Migrations

```sql
-- Add accessibility settings table
CREATE TABLE user_accessibility_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add accessibility usage tracking
CREATE TABLE accessibility_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    feature_name VARCHAR(100) NOT NULL,
    usage_context JSONB,
    session_id UUID,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_accessibility_settings_user_id ON user_accessibility_settings(user_id);
CREATE INDEX idx_accessibility_usage_user_id ON accessibility_usage_logs(user_id);
CREATE INDEX idx_accessibility_usage_timestamp ON accessibility_usage_logs(timestamp);
```

### Performance Considerations

#### Frontend Optimizations
```typescript
// Lazy load voice recognition
const useVoiceCommands = () => {
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    // Only load if speech-to-text is enabled
    if (settings.speechToText) {
      const loadSpeechRecognition = async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          setRecognition(new SpeechRecognition());
        }
      };
      loadSpeechRecognition();
    }
  }, [settings.speechToText]);
};
```

#### Backend Optimizations
```python
# Cache accessibility prompts
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_adaptive_prompt(settings_hash: str) -> str:
    # Generate adaptive prompt based on settings hash
    # Cached for repeated identical settings
    pass

# Use in main chat function
settings_hash = hash(frozenset(request.accessibility_settings.items()))
adaptive_prompt = get_cached_adaptive_prompt(settings_hash)
```

## Security Considerations

### Data Privacy
```python
# Sanitize accessibility settings before storage
def sanitize_accessibility_settings(settings: dict) -> dict:
    allowed_keys = {
        'contrastMode', 'fontSize', 'dyslexiaFont', 'lineSpacing',
        'textToSpeech', 'speechToText', 'simplifyLanguage',
        'colorBlindFriendly', 'keyboardMode', 'animations'
    }

    return {k: v for k, v in settings.items() if k in allowed_keys}
```

### Voice Data Handling
```typescript
// Ensure voice data is not stored
const handleVoiceInput = (transcript: string) => {
  // Process transcript immediately
  processVoiceCommand(transcript);

  // Clear from memory
  transcript = null;

  // Don't log sensitive voice data
  console.log('Voice command processed (content not logged)');
};
```

## Monitoring and Analytics

### Accessibility Usage Tracking
```python
# Track accessibility feature usage
async def log_accessibility_usage(user_id: str, feature: str, context: dict):
    await supabase.table("accessibility_usage_logs").insert({
        "user_id": user_id,
        "feature_name": feature,
        "usage_context": context,
        "timestamp": datetime.now().isoformat()
    }).execute()

# Example usage
await log_accessibility_usage(
    user_id=user_id,
    feature="voice_command",
    context={"command": "hint_request", "session_id": session_id}
)
```

### Performance Monitoring
```typescript
// Monitor accessibility feature performance
const trackAccessibilityPerformance = (feature: string, duration: number) => {
  if (process.env.NODE_ENV === 'production') {
    analytics.track('accessibility_feature_performance', {
      feature,
      duration,
      timestamp: Date.now()
    });
  }
};
```

## Future Enhancements

### Planned Features
1. **AI Vision**: Image description for visual impairments
2. **Gesture Control**: Hand gesture recognition for motor disabilities
3. **Emotion Detection**: Facial expression analysis for emotional support
4. **Learning Style Adaptation**: Automatic detection and adaptation to learning styles
5. **Multilingual Support**: Accessibility features in multiple languages

### Architecture for Extensions
```typescript
// Plugin architecture for accessibility features
interface AccessibilityPlugin {
  name: string;
  description: string;
  initialize: (context: AccessibilityContext) => void;
  cleanup: () => void;
}

class AccessibilityPluginManager {
  private plugins: Map<string, AccessibilityPlugin> = new Map();

  register(plugin: AccessibilityPlugin) {
    this.plugins.set(plugin.name, plugin);
    plugin.initialize(this.context);
  }

  unregister(name: string) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.cleanup();
      this.plugins.delete(name);
    }
  }
}
```

## Support and Maintenance

### Regular Updates
- **Monthly accessibility audits**
- **User feedback integration**
- **WCAG compliance checks**
- **Performance optimization reviews**

### Community Contributions
- **Accessibility feature requests**
- **Bug reports with accessibility impact**
- **User testing feedback**
- **Developer accessibility guidelines**

## Contact and Resources

### Internal Resources
- **Accessibility Team**: accessibility@company.com
- **Development Team**: dev@company.com
- **User Support**: support@company.com

### External Resources
- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/)

---

*Last updated: $(date)*
*Version: 1.0*
*Status: Implementation Complete*