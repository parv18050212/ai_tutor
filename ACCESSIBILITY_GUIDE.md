# AI Tutor Accessibility Guide

## Overview

The AI Tutor platform is designed with comprehensive accessibility features to support learners with diverse disabilities and learning needs. This guide outlines the accessibility features, implementation details, and usage instructions.

## Table of Contents

1. [Accessibility Features](#accessibility-features)
2. [Disability-Specific Support](#disability-specific-support)
3. [Implementation Guide](#implementation-guide)
4. [Usage Instructions](#usage-instructions)
5. [Technical Architecture](#technical-architecture)
6. [API Documentation](#api-documentation)
7. [Testing Guidelines](#testing-guidelines)

---

## Accessibility Features

### Visual Accessibility

#### Contrast & Display Options
- **High Contrast Mode**: Enhanced contrast for users with visual impairments
- **Dark Mode**: Reduced eye strain for light-sensitive users
- **Font Size Control**: 4 levels (Small, Medium, Large, XL)
- **Dyslexia-Friendly Fonts**: OpenDyslexic font support
- **Line Spacing**: Increased line height for better readability
- **Colorblind-Friendly Mode**: Adjusted color schemes for color vision deficiencies

#### Motion & Animation
- **Reduced Motion**: Disable animations for vestibular disorders
- **Smooth Scrolling Control**: Optional smooth scrolling in chat
- **Animation Preferences**: Granular control over UI animations

### Audio Accessibility

#### Text-to-Speech (TTS)
- **AI Response Reading**: Automatic or manual reading of AI responses
- **Natural Speech Synthesis**: Browser-native speech synthesis
- **Reading Controls**: Play, pause, and speed controls
- **Keyboard Shortcut**: `Ctrl+Shift+R` to read last response

#### Speech-to-Text (STT)
- **Voice Input**: Voice-controlled message input
- **Voice Commands**: Comprehensive set of voice commands
- **Continuous Recognition**: Real-time speech recognition
- **Error Handling**: Graceful fallback for recognition errors

### Motor Accessibility

#### Keyboard Navigation
- **Full Keyboard Support**: Complete navigation without mouse
- **Focus Management**: Clear focus indicators and logical tab order
- **Keyboard Shortcuts**: Comprehensive shortcut system
- **Voice Commands**: Alternative to traditional input methods

#### Voice Control System
- **Command Recognition**: 20+ voice commands for common actions
- **Natural Language**: Intuitive command phrases
- **Feedback**: Visual and audio confirmation of commands
- **Customizable**: Extensible command system

### Cognitive Accessibility

#### Language & Comprehension
- **Simplified Language**: Option for simpler explanations
- **Memory Scaffolding**: Structured information presentation
- **Progress Tracking**: Clear indication of learning progress
- **Concept Breakdown**: Complex topics split into manageable chunks

#### Learning Support
- **Frustration Detection**: AI detects signs of confusion/frustration
- **Emotional Support**: Encouraging responses when needed
- **Adaptive Difficulty**: Content adapts to user's understanding level
- **Multiple Learning Paths**: Various approaches to same concept

---

## Disability-Specific Support

### Learning Disabilities

#### ADHD Support
- **Short, Focused Questions**: Maximum 2 sentences per question
- **Clear Transitions**: Structured "First... Then... Finally..." format
- **Frequent Reinforcement**: Positive feedback throughout interaction
- **Micro-Steps**: Complex concepts broken into tiny increments

#### Dyslexia Support
- **Simple Sentence Structure**: Avoiding complex grammatical constructions
- **High-Frequency Words**: Familiar vocabulary prioritized
- **Phonetic Hints**: Sound-based hints for new terminology
- **Multiple Phrasings**: Same concept explained different ways

#### Processing Disorders
- **Extended Think Time**: No rush for responses
- **Multiple Pathways**: Various routes to understanding
- **Concrete Examples**: Real-world examples before abstractions
- **Frequent Check-ins**: Regular understanding verification

### Autism Spectrum Disorders

#### Predictable Structure
```
🎯 **Today's Topic**: [Chapter Name]
📝 **What I'll Ask**: [Question Type]
⏱️ **Think Time**: Take as long as you need
✅ **Success Looks Like**: [Success Criteria]

[Socratic Question]

💭 **If stuck, try**: [Thinking Strategy]
```

#### Clear Communication Patterns
- **Consistent Response Format**: Structured, predictable layout
- **Explicit Instructions**: Clear expectations for each interaction
- **Visual Indicators**: Icons and symbols for different content types
- **Routine-Based Learning**: Familiar patterns throughout sessions

### Intellectual Disabilities

#### Simplified Socratic Method
- **Very Simple Words**: Avoiding jargon and complex terminology
- **One Idea Per Question**: Single concept focus
- **Everyday Examples**: Familiar, concrete analogies
- **Multiple Choice Support**: Options when helpful
- **Abundant Encouragement**: Frequent positive reinforcement

### Sensory Impairments

#### Visual Impairments
- **Screen Reader Compatibility**: ARIA labels and semantic HTML
- **High Contrast Options**: Strong color differentiation
- **Text Scaling**: Up to 200% enlargement
- **Audio Descriptions**: Verbal descriptions of visual content

#### Hearing Impairments
- **Visual Indicators**: Visual feedback for audio events
- **Captions Support**: Text alternatives for audio content
- **Vibration Patterns**: Haptic feedback where supported
- **Sign Language Ready**: Interface designed for sign language users

### Motor Impairments

#### Limited Mobility
- **Voice Control**: Complete voice-based interaction
- **Large Touch Targets**: Minimum 44px touch areas
- **Gesture Support**: Swipe and gesture navigation
- **Dwell Time**: Adjustable hover/focus times

#### Tremor/Spasticity
- **Click Tolerance**: Increased tolerance for imprecise clicks
- **Undo Functionality**: Easy reversal of accidental actions
- **Confirmation Dialogs**: Prevention of unintended actions
- **Alternative Input**: Multiple ways to achieve same action

---

## Implementation Guide

### Backend Implementation

#### 1. Accessibility-Aware Prompting

```python
# main.py - Enhanced Socratic prompting with accessibility
def get_dynamic_socratic_prompt(exam_name, subject_name, chapter_name, accessibility_settings=None):
    base_prompt = generate_base_prompt(exam_name, subject_name, chapter_name)

    if accessibility_settings:
        adaptations = get_cognitive_adaptive_prompt(accessibility_settings)
        return f"{base_prompt}\\n\\n**ACCESSIBILITY ADAPTATIONS:**\\n{adaptations}"

    return base_prompt
```

#### 2. Frustration Detection

```python
def detect_frustration_markers(user_response):
    indicators = [
        "i don't understand", "this is hard", "i'm confused",
        "i don't know", "this doesn't make sense", "i'm lost"
    ]
    return any(indicator in user_response.lower() for indicator in indicators)
```

#### 3. Memory Scaffolding

```python
def add_memory_scaffold(response, current_concept, accessibility_settings):
    if accessibility_settings.get('simplifyLanguage', False):
        return f"""📋 **Where we are**: {current_concept}
💡 **Key point**: Focus on one concept at a time

{response}

🔄 **Next**: Think about this question, then we'll continue"""
    return response
```

### Frontend Implementation

#### 1. Accessibility Context

```typescript
// AccessibilityContext.tsx
interface AccessibilitySettings {
  contrastMode: 'normal' | 'high' | 'dark';
  fontSize: 'Small' | 'Medium' | 'Large' | 'XL';
  dyslexiaFont: boolean;
  lineSpacing: boolean;
  animations: boolean;
  textToSpeech: boolean;
  speechToText: boolean;
  simplifyLanguage: boolean;
  colorBlindFriendly: boolean;
  keyboardMode: boolean;
}
```

#### 2. Voice Commands Hook

```typescript
// useVoiceCommands.ts
export const useVoiceCommands = (handlers) => {
  const voiceCommands = {
    'send message': handlers.sendMessage,
    'give me a hint': handlers.requestHint,
    'show example': handlers.requestExample,
    'explain slower': handlers.requestSlower,
    'read response': handlers.readLastResponse,
  };

  // Implementation details...
}
```

#### 3. Chat Integration

```typescript
// TutorChat.tsx - Accessibility integration
const response = await chatService.sendMessage({
  question: textToSend,
  session_id: sessionId,
  // ... other parameters
  accessibility_settings: accessibilitySettings
});
```

---

## Usage Instructions

### For Learners

#### Setting Up Accessibility Preferences

1. **Access Settings**: Click the accessibility icon or press `Alt+A`
2. **Visual Settings**: Adjust contrast, font size, and display options
3. **Audio Settings**: Enable TTS and STT as needed
4. **Motor Settings**: Configure keyboard and voice controls
5. **Cognitive Settings**: Enable simplified language and memory aids

#### Using Voice Commands

**Basic Commands:**
- "Send message" - Submit current input
- "Clear input" - Clear the text field
- "Give me a hint" - Request a learning hint
- "Show example" - Ask for a solved example
- "Explain slower" - Request simpler explanation
- "Read response" - Have last AI response read aloud

**Keyboard Shortcuts:**
- `Ctrl+Shift+V` - Toggle voice listening
- `Ctrl+Shift+H` - Request hint
- `Ctrl+Shift+E` - Request example
- `Ctrl+Shift+R` - Read last response
- `Alt+A` - Open accessibility settings

#### Understanding AI Responses

**Accessibility Indicators:**
- 🌟 Encouragement symbol for emotional support
- 📋 Structure symbol for memory scaffolding
- 💡 Light bulb for key concepts
- 🔄 Arrow for next steps

### For Educators

#### Monitoring Student Progress

1. **Accessibility Needs Tracking**: System tracks which accommodations are used
2. **Learning Analytics**: Progress data includes accessibility usage patterns
3. **Adaptation Effectiveness**: Metrics on how accommodations affect learning
4. **Intervention Alerts**: Notifications when students show signs of struggle

#### Customizing Content

1. **Difficulty Adaptation**: Content automatically adjusts to accessibility needs
2. **Format Options**: Multiple presentation formats available
3. **Scaffolding Levels**: Various levels of support can be configured
4. **Progress Pacing**: Accommodates different learning speeds

### For Developers

#### Adding New Accessibility Features

1. **Frontend**: Add settings to `AccessibilityContext.tsx`
2. **Backend**: Update `get_cognitive_adaptive_prompt()` function
3. **Styling**: Add corresponding CSS classes
4. **Testing**: Include in accessibility test suite

#### Voice Command Extension

```typescript
// Adding new voice commands
const newCommands = {
  'custom command': () => customHandler(),
  'another phrase': () => anotherHandler(),
};

// Extend existing voiceCommands object
const extendedCommands = { ...voiceCommands, ...newCommands };
```

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
├─────────────────────────────────────────────────────────────┤
│ • AccessibilityContext (Settings Management)                │
│ • VoiceCommands Hook (Speech Recognition)                   │
│ • TutorChat Component (Main Interface)                      │
│ • Accessibility Settings Sheet (Configuration UI)          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
├─────────────────────────────────────────────────────────────┤
│ • ChatRequest Model (Accessibility Settings)               │
│ • Chat Service (Frontend-Backend Communication)            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer                            │
├─────────────────────────────────────────────────────────────┤
│ • Accessibility-Aware Prompting                            │
│ • Frustration Detection                                     │
│ • Memory Scaffolding                                        │
│ • Emotional Support                                         │
│ • Response Post-Processing                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Configures Settings**: Accessibility preferences stored in local storage
2. **Settings Transmitted**: Sent with each chat request to backend
3. **AI Prompt Adaptation**: Backend modifies Socratic prompting based on settings
4. **Response Processing**: AI response enhanced with accessibility features
5. **Frontend Rendering**: Response displayed with appropriate accommodations
6. **Voice/Audio Output**: TTS and other audio features activated as needed

### Database Schema

```sql
-- Accessibility settings storage
CREATE TABLE user_accessibility_settings (
    user_id UUID PRIMARY KEY,
    settings JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Accessibility usage analytics
CREATE TABLE accessibility_usage (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    feature_used VARCHAR(100) NOT NULL,
    session_id UUID,
    usage_context JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## API Documentation

### Chat Endpoint Enhancement

**POST** `/api/chat`

```json
{
  "question": "string",
  "session_id": "string",
  "exam_id": "string",
  "subject_id": "string",
  "chapter_id": "string",
  "exam_name": "string",
  "subject_name": "string",
  "chapter_name": "string",
  "images": ["string"],
  "accessibility_settings": {
    "contrastMode": "normal|high|dark",
    "fontSize": "Small|Medium|Large|XL",
    "dyslexiaFont": true,
    "lineSpacing": true,
    "textToSpeech": true,
    "speechToText": true,
    "simplifyLanguage": true,
    "colorBlindFriendly": true,
    "keyboardMode": true
  }
}
```

### Response Format

```json
{
  "answer": "string",
  "accessibility_enhancements": {
    "emotional_support_added": true,
    "memory_scaffold_applied": true,
    "language_simplified": true
  }
}
```

### New Endpoints

**GET** `/api/accessibility/settings/{user_id}`
- Retrieve user's accessibility preferences

**POST** `/api/accessibility/settings/{user_id}`
- Update user's accessibility preferences

**GET** `/api/accessibility/analytics/{user_id}`
- Get accessibility feature usage analytics

---

## Testing Guidelines

### Automated Testing

#### Accessibility Tests
```typescript
// Accessibility compliance testing
describe('Accessibility Features', () => {
  test('Keyboard navigation works', () => {
    // Test tab order and keyboard shortcuts
  });

  test('Screen reader compatibility', () => {
    // Test ARIA labels and semantic structure
  });

  test('Color contrast meets WCAG standards', () => {
    // Test contrast ratios
  });
});
```

#### Voice Command Tests
```typescript
describe('Voice Commands', () => {
  test('Speech recognition activates correctly', () => {
    // Test voice activation
  });

  test('Commands are recognized accurately', () => {
    // Test command interpretation
  });
});
```

### Manual Testing

#### Disability Simulation
1. **Visual Impairments**: Test with screen readers (NVDA, JAWS, VoiceOver)
2. **Motor Impairments**: Test keyboard-only navigation
3. **Cognitive Impairments**: Test with simplified language enabled
4. **Hearing Impairments**: Test without audio cues

#### User Testing
1. **Recruit participants** with actual disabilities
2. **Task-based testing** for real-world scenarios
3. **Feedback collection** on usability and effectiveness
4. **Iterative improvement** based on user input

### Compliance Standards

#### WCAG 2.1 Compliance
- **Level AA**: All features meet WCAG 2.1 AA standards
- **Level AAA**: Critical features meet AAA where possible
- **Regular Audits**: Automated and manual accessibility audits

#### Platform Standards
- **Web**: WCAG 2.1, Section 508 compliance
- **Mobile**: iOS/Android accessibility guidelines
- **Voice**: Voice interface accessibility best practices

---

## Support and Resources

### Getting Help
- **Documentation**: This guide and inline help
- **Support Team**: Accessibility-trained support staff
- **Community**: User forums with accessibility focus
- **Training**: Tutorials for each accessibility feature

### Additional Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Screen Reader Testing Guide](https://webaim.org/articles/screenreader_testing/)
- [Voice Interface Design](https://developer.amazon.com/en-US/docs/alexa/voice-design/principles.html)

### Feedback and Improvements
- **Feature Requests**: Submit via accessibility feedback form
- **Bug Reports**: Include accessibility impact in reports
- **Usability Studies**: Participate in accessibility research
- **Community Contributions**: Help improve accessibility features

---

*This guide is regularly updated to reflect new accessibility features and best practices. Last updated: $(date)*