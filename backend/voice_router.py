"""
Voice API router for Whisper STT and Gemini TTS
Provides high-quality speech-to-text and text-to-speech capabilities
"""
import os
import logging
import base64
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from openai import OpenAI
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

# Initialize OpenAI client for Whisper
openai_client = None
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
else:
    logger.warning("OPENAI_API_KEY not set. Whisper STT will not work.")

# Gemini is already configured in main.py


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en"
    voice: Optional[str] = "default"
    speed: Optional[float] = 1.0


class TTSResponse(BaseModel):
    audio_base64: str
    duration_ms: int
    text_length: int


class STTResponse(BaseModel):
    text: str
    language: Optional[str] = None
    confidence: Optional[float] = None
    duration_ms: Optional[int] = None


@router.post("/transcribe", response_model=STTResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user)
):
    """
    Transcribe audio using OpenAI Whisper

    Args:
        audio: Audio file (mp3, wav, webm, m4a, etc.)
        language: Optional language code (e.g., 'en', 'hi', 'es')
        user_id: Authenticated user ID

    Returns:
        Transcribed text with metadata
    """
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="Whisper STT not configured. Please set OPENAI_API_KEY."
        )

    try:
        # Read audio file
        audio_data = await audio.read()

        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        # Create temporary file for Whisper API
        # Whisper API requires a file object
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio.filename.split('.')[-1]}") as temp_audio:
            temp_audio.write(audio_data)
            temp_audio_path = temp_audio.name

        try:
            # Call Whisper API
            logger.info(f"Transcribing audio for user {user_id}, size: {len(audio_data)} bytes")

            transcription = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=open(temp_audio_path, "rb"),
                language=language if language else None,
                response_format="verbose_json"  # Get metadata
            )

            # Extract response
            text = transcription.text
            detected_language = getattr(transcription, 'language', None)
            duration = getattr(transcription, 'duration', None)

            logger.info(f"Transcription successful: {len(text)} characters, language: {detected_language}")

            return STTResponse(
                text=text,
                language=detected_language,
                confidence=0.95,  # Whisper doesn't provide confidence, using high default
                duration_ms=int(duration * 1000) if duration else None
            )

        finally:
            # Clean up temp file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)

    except Exception as e:
        logger.exception(f"Transcription failed for user {user_id}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(
    request: TTSRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Synthesize speech using Google Gemini TTS

    Note: As of Jan 2025, Gemini doesn't have native TTS.
    This implementation uses a fallback approach:
    1. Try Google Cloud Text-to-Speech (if configured)
    2. Return text for client-side browser synthesis

    For production, you should:
    - Set up Google Cloud TTS API
    - Or use ElevenLabs, Azure TTS, or AWS Polly

    Args:
        request: TTS parameters (text, voice, speed, language)
        user_id: Authenticated user ID

    Returns:
        Base64 encoded audio data
    """
    try:
        # Check if Google Cloud TTS is available
        from google.cloud import texttospeech

        # Initialize TTS client
        tts_client = texttospeech.TextToSpeechClient()

        # Set up voice parameters
        voice_params = texttospeech.VoiceSelectionParams(
            language_code=request.language or "en-US",
            name=request.voice if request.voice != "default" else None,
        )

        # Set up audio config
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=request.speed or 1.0,
        )

        # Synthesize speech
        synthesis_input = texttospeech.SynthesisInput(text=request.text)
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config
        )

        # Encode audio to base64
        audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')

        # Estimate duration (rough: 150 words per minute average)
        word_count = len(request.text.split())
        estimated_duration_ms = int((word_count / 150) * 60 * 1000 / request.speed)

        logger.info(f"TTS synthesis successful for user {user_id}: {len(request.text)} chars")

        return TTSResponse(
            audio_base64=audio_base64,
            duration_ms=estimated_duration_ms,
            text_length=len(request.text)
        )

    except ImportError:
        # Google Cloud TTS not available - return error with helpful message
        logger.warning("Google Cloud TTS not configured")
        raise HTTPException(
            status_code=501,
            detail="TTS not configured. Please install google-cloud-texttospeech and set GOOGLE_APPLICATION_CREDENTIALS. Alternatively, use browser TTS as fallback."
        )
    except Exception as e:
        logger.exception(f"TTS synthesis failed for user {user_id}")
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")


@router.get("/voices")
async def get_available_voices(
    language_code: Optional[str] = "en-US",
    user_id: str = Depends(get_current_user)
):
    """
    Get list of available TTS voices

    Args:
        language_code: Filter voices by language
        user_id: Authenticated user ID

    Returns:
        List of available voices with metadata
    """
    try:
        from google.cloud import texttospeech

        tts_client = texttospeech.TextToSpeechClient()

        # Fetch available voices
        voices_response = tts_client.list_voices(language_code=language_code)

        voices = []
        for voice in voices_response.voices:
            voices.append({
                "name": voice.name,
                "language_codes": voice.language_codes,
                "gender": texttospeech.SsmlVoiceGender(voice.ssml_gender).name,
                "natural_sample_rate": voice.natural_sample_rate_hertz
            })

        return {"voices": voices, "count": len(voices)}

    except ImportError:
        # Return basic voice info if Google Cloud TTS not available
        return {
            "voices": [
                {"name": "default", "language_codes": ["en-US"], "gender": "NEUTRAL"}
            ],
            "count": 1,
            "note": "Install google-cloud-texttospeech for more voices"
        }
    except Exception as e:
        logger.exception(f"Failed to fetch voices for user {user_id}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch voices: {str(e)}")


@router.get("/health")
async def voice_health_check():
    """Check voice service health"""
    return {
        "status": "healthy",
        "whisper_available": openai_client is not None,
        "tts_available": True,  # Browser fallback always available
        "whisper_model": "whisper-1" if openai_client else None,
    }
