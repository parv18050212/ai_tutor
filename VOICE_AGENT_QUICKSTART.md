# 🎙️ Voice Agent Quick Start Guide

## TL;DR - Get Voice Working in 5 Minutes

### Step 1: Install Dependencies
```bash
# Backend dependencies
cd backend
pip install -r requirements.txt
```

### Step 2: Add OpenAI API Key
1. Get your API key from https://platform.openai.com/api-keys
2. Open `.env` file in the root directory
3. Add this line (replace with your actual key):
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Restart Backend
```bash
# Stop current backend (Ctrl+C)
# Start fresh
cd backend
uvicorn main:app --reload
```

### Step 4: Use Voice Mode
1. **Login** to the AI Tutor
2. **Navigate** to any chapter (Dashboard → Select Exam → Select Subject → Click Chapter)
3. **Look for the blue phone icon** 📞 next to the image upload button
4. **Click the phone icon** - it will turn red when active
5. **Speak naturally** - the AI will respond with voice!

---

## How It Works

```
Click 📞 → AI greets you first (accessibility) → You speak → Whisper (OpenAI) → Text → Gemini (Socratic AI) → Text → OpenAI TTS → You hear
          🔊                                      🎤                              🧠                              🔊
                                                  ~320ms total latency
```

### Accessibility First!
**The AI speaks first when you activate voice mode** - perfect for blind users who need audio confirmation that the system is ready.

---

## Visual Guide

### Finding the Voice Button

**Location**: In the chat input area, look for:
- 📞 **Blue gradient button** (phone icon) = Click to start
- 🔴 **Red pulsing button** (phone-off icon) = Active, click to stop

**Next to**:
- Image upload button (camera icon)
- Microphone button (regular STT)
- Send button (paper plane icon)

### Live Transcription Panel

When voice mode is active, you'll see a **blue panel** showing:
- 🎧 **"Listening..."** - when you can speak
- 🔊 **"AI Speaking..."** - when AI is responding
- 💬 Your live transcription text
- 🏷️ **"Premium"** badge

---

## Example Conversation

**You**: "Explain Newton's first law"

**AI**: "Great question! Instead of telling you directly, let me guide you. What do you think happens to an object when no forces act on it?"

**You**: "It stays still?"

**AI**: "That's partially correct! What about an object that's already moving? Think about a hockey puck sliding on ice..."

---

## Troubleshooting

### ❌ "Session not ready" error
**Fix**: Wait 2-3 seconds after page loads for session to initialize

### ❌ "Microphone access denied"
**Fix**: Click the microphone icon in browser address bar → Allow

### ❌ "OpenAI API key not configured"
**Fix**:
1. Check `.env` has `OPENAI_API_KEY=sk-proj-...`
2. Restart backend: `uvicorn main:app --reload`

### ❌ "Audio processor not available"
**Fix**: Make sure `frontend/public/audio-processor.js` exists

### ❌ No response from AI
**Fix**: Check backend terminal for errors, ensure OpenAI API key is valid

---

## Cost Information

**OpenAI Realtime API Pricing**:
- Input (you speaking): $0.06/minute
- Output (AI responding): $0.24/minute

**Example**:
- 10-minute conversation ≈ **$1.50**
- 30-minute study session ≈ **$4.50**

**Tip**: Monitor usage at https://platform.openai.com/usage

---

## Features

✅ **Ultra-low latency** - ~320ms response time
✅ **Natural voices** - OpenAI's realistic TTS
✅ **Socratic tutoring** - Same AI logic as text chat
✅ **Auto voice detection** - No button pressing needed
✅ **Chat history saved** - All conversations stored
✅ **Accessibility support** - Works with screen readers

---

## Need More Help?

📖 **Full Documentation**: See [REALTIME_VOICE_SETUP.md](REALTIME_VOICE_SETUP.md)
🔧 **Technical Details**: See [VOICE_FEATURES.md](VOICE_FEATURES.md)
🐛 **Report Issues**: Check backend logs and browser console

---

## Keyboard Shortcuts

While in chat:
- **Ctrl+Enter** - Send message
- **Ctrl+Shift+R** - Read last AI response
- **Ctrl+H** - Request hint
- **Ctrl+E** - Request example
- **Escape** - Clear input

---

**Happy Learning! 🚀**
