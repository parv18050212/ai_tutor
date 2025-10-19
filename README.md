# AI Tutor - Atypical Academy

An intelligent, accessible, AI-powered educational platform for competitive exam preparation (JEE, CUET, NEET, BITSAT) with comprehensive voice control and accessibility features.

## 🌟 Key Features

### 🎓 AI-Powered Socratic Tutoring
- **Context-Aware Learning**: Dynamic prompts based on exam, subject, and chapter
- **Session Management**: Chapter-specific conversation history
- **RAG (Retrieval Augmented Generation)**: Vector-based semantic search for accurate responses
- **Accessibility Adaptations**: Built-in support for ADHD, dyslexia, and cognitive disabilities
- **Emotional Support**: Frustration detection and adaptive encouragement

### 📝 Adaptive Quiz System
- **Exam-Specific Questions**: Tailored for JEE, CUET, NEET with appropriate difficulty
- **Smart Analytics**: Track performance, identify strengths/weaknesses
- **Exam Readiness Scoring**: AI-calculated readiness based on performance trends
- **Accessibility Support**: Reading level adjustments, simplified language options

### 🎤 Voice Control (Browser-Based)
- **Text-to-Speech**: Native browser TTS with 50+ voices
- **Speech-to-Text**: Real-time voice recognition in 15+ languages
- **Voice Commands**: 15+ hands-free commands for navigation and control
- **Offline Capable**: Works without internet connection
- **Free Forever**: No API costs, no subscription required

### 🦾 Comprehensive Accessibility
- **30+ Accessibility Settings**: Visual, cognitive, and motor disability support
- **Dyslexia-Friendly Fonts**: OpenDyslexic integration
- **High Contrast Modes**: Light, dark, and high contrast themes
- **Screen Reader Compatible**: Full ARIA support
- **Keyboard Navigation**: Complete keyboard-only control

## 🏗️ Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite** for blazing-fast builds
- **Tailwind CSS** + shadcn/ui components
- **React Router v6** for navigation
- **Supabase** for auth & realtime database
- **Web Speech API** for voice features

### Backend
- **FastAPI** (Python) for REST APIs
- **Google Gemini AI** (gemini-2.5-flash, gemini-2.0-flash-exp)
- **Supabase** (PostgreSQL with pgvector)
- **JWT** authentication

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.12+
- **Supabase** account
- **Google AI API** key

### Installation

#### 1. Clone the repository
```bash
git clone <your-repo-url>
cd ai_tutor
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your credentials:
# GOOGLE_API_KEY=your_google_ai_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_KEY=your_service_key
# SUPABASE_JWT_SECRET=your_jwt_secret

# Run the server
uvicorn main:app --reload --port 8000
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Run development server
npm run dev
```

#### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🎤 Voice Control Guide

### Supported Voice Commands

#### Navigation Commands
- "go to dashboard" - Navigate to main dashboard
- "open quiz" - Navigate to quiz page
- "go back" - Go to previous page
- "show resources" / "hide resources" - Toggle resources panel

#### Chat Control
- "send message" - Send current message
- "clear input" - Clear input field
- "start new session" - Begin fresh chat session

#### Tutor Actions
- "give me a hint" - Request a hint
- "show me an example" - Request solved example
- "explain slower" - Request simpler explanation
- "summarize" - Request summary of concepts
- "use an analogy" - Request explanation with analogy

#### UI Control
- "scroll up" / "scroll down" - Scroll chat
- "read last message" - Read AI's last response aloud
- "repeat" - Repeat last TTS playback

#### Voice Settings
- "speak faster" / "speak slower" - Adjust TTS speed
- "pause" / "resume" - Control TTS playback

### Enabling Voice Features

1. **Go to Settings** (click gear icon in top right)
2. **Navigate to "Accessibility" tab**
3. **Enable Text-to-Speech**:
   - Choose voice from dropdown
   - Adjust speed (0.5x - 2.0x)
   - Test voice with "Test Voice" button
   - Enable "Auto-play AI Responses" for automatic reading
4. **Enable Speech-to-Text**:
   - Select language
   - Click microphone button to start voice input
5. **Adjust Display Settings**:
   - High contrast mode
   - Large text
   - Dyslexia-friendly font
   - Reduced motion

### Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Text-to-Speech | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Speech-to-Text | ✅ Full | ✅ Full | ⚠️ Limited | ❌ Not supported |
| Voice Commands | ✅ Full | ✅ Full | ⚠️ Limited | ❌ Not supported |

**Recommended Browser**: Chrome or Edge for full voice control experience

## 📚 Project Structure

```
ai_tutor/
├── backend/
│   ├── main.py              # Main FastAPI app
│   ├── auth.py              # JWT authentication
│   ├── quiz.py              # Quiz generation & analytics
│   ├── smart_suggestions.py # AI study recommendations
│   ├── database/
│   │   └── ingest.py        # Document ingestion for RAG
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # Main dashboard
│   │   │   ├── TutorChat.tsx      # AI tutor interface
│   │   │   ├── Quiz.tsx           # Quiz taking interface
│   │   │   └── Auth.tsx           # Authentication
│   │   ├── components/
│   │   │   ├── VoiceControlPanel.tsx      # Voice UI
│   │   │   ├── VoiceNavigationButton.tsx  # Floating mic
│   │   │   ├── PreferencesDialog.tsx      # Settings
│   │   │   └── SmartSuggestions.tsx       # AI recommendations
│   │   ├── hooks/
│   │   │   ├── useBrowserTTS.ts         # Browser TTS hook
│   │   │   ├── useBrowserSTT.ts         # Browser STT hook
│   │   │   ├── useVoiceControl.ts       # Voice commands
│   │   │   └── useChapterSession.ts     # Session management
│   │   ├── contexts/
│   │   │   └── AccessibilityContext.tsx # Accessibility state
│   │   └── services/
│   │       └── chatService.ts           # API client
│   └── package.json
│
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Required
GOOGLE_API_KEY=your_google_ai_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Optional
PORT=8000
```

#### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup

This project uses Supabase PostgreSQL with pgvector for semantic search.

#### Required Tables:
```sql
-- Profiles
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  grade_level TEXT,
  learning_preferences JSONB,
  accessibility_needs TEXT[],
  exam_id TEXT
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id),
  exam_id TEXT,
  subject_id TEXT,
  chapter_id TEXT,
  session_name TEXT,
  status TEXT DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat History
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz Results
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id),
  exam_type TEXT,
  subject_name TEXT,
  chapter_name TEXT,
  difficulty_level TEXT,
  score INTEGER,
  total_questions INTEGER,
  time_taken INTEGER,
  concepts_mastered TEXT[],
  concepts_needing_work TEXT[],
  exam_readiness_score FLOAT,
  recommended_next_difficulty TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (for RAG)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  embedding VECTOR(768),  -- Adjust dimension based on your model
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

## 🎯 Usage Examples

### 1. Start a Tutoring Session
```typescript
// Navigate to TutorChat page
navigate(`/tutor/${exam}/${subject}/${chapter}`);

// Session automatically created/retrieved
// Ask questions naturally
"Can you explain the concept of Newton's laws?"
```

### 2. Generate a Quiz
```typescript
// Call quiz API
const quiz = await chatService.generateQuiz({
  chapter: 'newtons-laws',
  exam_type: 'jee',
  n: 5,
  difficulty: 'intermediate'
});

// Quiz returns 5 JEE-level questions with:
// - 4 options each
// - Hints
// - Detailed explanations
// - Estimated time per question
```

### 3. Use Voice Commands
```typescript
// Enable voice control in settings
updateSetting('voiceControlEnabled', true);

// Click microphone button
// Say: "give me a hint"
// Input field automatically populated
```

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend (use production server)
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 📊 Features by Module

### Socratic Tutoring (main.py)
- Dynamic context-aware prompting
- Session-based conversation history
- RAG with vector similarity search (0.3 threshold)
- Accessibility adaptations (ADHD, dyslexia, working memory)
- Emotional support (frustration detection)

### Quiz System (quiz.py)
- Exam-specific question generation (JEE, CUET, NEET)
- JSON-formatted responses with fallback parsing
- Performance analytics & exam readiness scoring
- Difficulty progression recommendations
- Accessibility support (reading level, cognitive adaptations)

### Smart Suggestions (smart_suggestions.py)
- AI-driven study recommendations
- Performance trend analysis
- Concept mastery tracking
- Personalized study plans

### Voice Control (Browser-Based)
- **useBrowserTTS**: Web Speech Synthesis API
  - 50+ voices across 15+ languages
  - Speed control (0.5x - 2.0x)
  - Queue management
  - Pause/resume/stop controls
- **useBrowserSTT**: Web Speech Recognition API
  - Real-time transcription
  - Interim and final results
  - 15+ language support
  - Error handling with user-friendly messages
- **useVoiceControl**: Command parser & executor
  - 15+ voice commands
  - Navigation, chat, tutor actions, UI control
  - Auto-execute with confidence scoring
  - Fallback for unknown commands

## 🔐 Security

- ✅ JWT authentication with Supabase
- ✅ Row-level security (RLS) on all tables
- ✅ Environment variables for secrets
- ✅ CORS configuration for allowed origins
- ✅ Input validation with Pydantic
- ⚠️ **TODO**: Add rate limiting (use slowapi)
- ⚠️ **TODO**: Add request logging for audit trails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent tutoring capabilities
- **Supabase** for authentication and database
- **shadcn/ui** for beautiful, accessible UI components
- **Web Speech API** for free, offline-capable voice features
- **OpenDyslexic** font for dyslexia support

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact: [your-email@example.com]

---

**Built with ❤️ for accessible, inclusive education**
