"""
OpenAI Realtime Voice API Integration
WebSocket relay that connects frontend to OpenAI Realtime API
and routes transcriptions through Gemini Socratic tutoring logic
"""
import os
import json
import logging
import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
import websockets
from websockets.client import WebSocketClientProtocol
import google.generativeai as genai
from supabase import Client
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["realtime-voice"])

# OpenAI Realtime API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not set. Realtime voice will not work.")


# Store active sessions (in production, use Redis)
active_sessions: Dict[str, Dict[str, Any]] = {}


async def connect_to_openai_realtime() -> WebSocketClientProtocol:
    """
    Establish WebSocket connection to OpenAI Realtime API

    Returns:
        WebSocket connection to OpenAI
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    try:
        ws = await websockets.connect(
            OPENAI_REALTIME_URL,
            additional_headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            },
            ping_interval=20,
            ping_timeout=10
        )

        logger.info("Connected to OpenAI Realtime API")

        # Configure session for full voice conversation mode
        session_config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": "You are a helpful AI assistant. When given text to speak, read it naturally with appropriate intonation and pacing.",
                "voice": "alloy",  # Voice for TTS responses (options: alloy, echo, shimmer)
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",  # Server-side Voice Activity Detection
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 700  # Wait 700ms of silence before considering turn complete
                },
                "temperature": 0.8,
                "max_response_output_tokens": 4096
            }
        }

        await ws.send(json.dumps(session_config))
        logger.info("Sent session configuration to OpenAI")

        return ws

    except Exception as e:
        logger.exception("Failed to connect to OpenAI Realtime API")
        raise HTTPException(status_code=503, detail=f"Could not connect to OpenAI: {str(e)}")


async def get_gemini_tutoring_response(
    question: str,
    session_id: str,
    user_id: str,
    exam_id: str,
    subject_id: str,
    chapter_id: str,
    exam_name: str,
    subject_name: str,
    chapter_name: str,
    supabase: Client,
    accessibility_settings: Optional[Dict] = None
) -> str:
    """
    Route user question through existing Gemini Socratic tutoring logic
    This is the SAME logic from main.py /api/chat endpoint

    Args:
        question: User's transcribed question
        session_id: Chat session ID
        user_id: Authenticated user ID
        exam_id, subject_id, chapter_id: Educational context
        exam_name, subject_name, chapter_name: Display names
        supabase: Supabase client
        accessibility_settings: User accessibility preferences

    Returns:
        Gemini's Socratic response text
    """
    try:
        # Import functions from main.py
        from main import (
            get_session_chat_history,
            save_session_chat_turn,
            get_dynamic_socratic_prompt,
            provide_emotional_support,
            add_memory_scaffold,
            detect_frustration_markers
        )

        # 1. Embed question for RAG search
        try:
            embedding_resp = genai.embed_content(
                model="models/text-embedding-004",
                content=question,
                task_type="RETRIEVAL_QUERY"
            )
            question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']
        except Exception as e:
            logger.warning(f"Embedding failed, trying fallback: {e}")
            embedding_resp = genai.embed_content(
                model="models/embedding-001",
                content=question,
                task_type="RETRIEVAL_QUERY"
            )
            question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']

        # 2. Vector search for relevant content
        matching_chunks = supabase.rpc("match_chunks", {
            "query_embedding": question_embedding,
            "match_threshold": 0.3,
            "match_count": 5
        }).execute()
        chunks = matching_chunks.data or []
        context = "\n\n".join([c.get("content", "") for c in chunks])

        # 3. Get session history with conversation summary
        history_data = get_session_chat_history(session_id, limit=6)
        messages = history_data.get("messages", [])
        summary = history_data.get("summary")

        # Format history: [Optional Summary] + Recent Messages
        history_parts = []
        if summary:
            history_parts.append(f"[Previous Conversation Summary]\n{summary}\n")
        if messages:
            history_parts.append("[Recent Messages]")
            history_parts.extend([f"{msg.get('role')}: {msg.get('message')}" for msg in messages])

        history_text = "\n".join(history_parts) if history_parts else ""

        # 4. Generate Socratic prompt
        prompt_template = get_dynamic_socratic_prompt(
            exam_name,
            subject_name,
            chapter_name,
            accessibility_settings
        )
        prompt = prompt_template.format(history=history_text, context=context, question=question)

        # 5. Call Gemini
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0,
                "top_p": 0.1,
                "top_k": 40,
                "max_output_tokens": 512
            }
        )
        answer = getattr(response, "text", None) or (response.get("content") if isinstance(response, dict) else str(response))

        # 6. Apply accessibility post-processing
        if accessibility_settings:
            is_frustrated = detect_frustration_markers(question)
            answer = provide_emotional_support(answer, is_frustrated)
            answer = add_memory_scaffold(answer, chapter_name, accessibility_settings)

        # 7. Save chat turns
        save_session_chat_turn(user_id, session_id, "user", question)
        save_session_chat_turn(user_id, session_id, "assistant", answer)

        logger.info(f"Generated Gemini response for session {session_id}")
        return answer

    except Exception as e:
        logger.exception(f"Failed to get Gemini tutoring response: {str(e)}")
        return (
            "I had trouble understanding your question. "
            "Could you try rephrasing it? For example: 'What is a matrix?' or 'Explain how to multiply matrices.'"
        )


async def relay_with_gemini_processing(
    client_ws: WebSocket,
    openai_ws: WebSocketClientProtocol,
    session_data: Dict[str, Any],
    supabase: Client
):
    """
    Relay WebSocket messages between client and OpenAI
    Intercept transcriptions and route through Gemini

    Args:
        client_ws: Frontend WebSocket connection
        openai_ws: OpenAI Realtime API WebSocket
        session_data: Session metadata (user_id, session_id, etc.)
        supabase: Supabase client
    """

    # Send welcome greeting if requested (for accessibility - blind users)
    if session_data.get("send_welcome"):
        welcome_message = session_data.get("welcome_message", "")

        # Send text to client for display
        await client_ws.send_json({
            "type": "ai_response_text",
            "text": welcome_message,
            "is_error": False,
            "timestamp": datetime.now().isoformat()
        })

        # Use OpenAI TTS for text-to-speech
        try:
            from openai import OpenAI
            import base64

            # Initialize OpenAI client
            openai_client = OpenAI(api_key=OPENAI_API_KEY)

            # Generate speech using OpenAI TTS
            response = openai_client.audio.speech.create(
                model="tts-1",  # or "tts-1-hd" for higher quality
                voice="alloy",  # Options: alloy, echo, fable, onyx, nova, shimmer
                input=welcome_message
            )

            # Get audio bytes and encode to base64
            audio_bytes = response.content
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

            # Send audio to client
            await client_ws.send_json({
                "type": "tts_audio",
                "audio": audio_base64,
                "format": "mp3",
                "timestamp": datetime.now().isoformat()
            })

            logger.info(f"Sent welcome greeting via OpenAI TTS ({len(audio_bytes)} bytes)")
        except Exception as e:
            logger.error(f"Welcome TTS generation failed: {e}")

        session_data["send_welcome"] = False  # Only send once

    async def forward_client_to_openai():
        """Forward audio from client to OpenAI"""
        try:
            while True:
                # Receive from frontend
                data = await client_ws.receive_text()
                message = json.loads(data)

                # Forward to OpenAI (audio chunks, commits, etc.)
                await openai_ws.send(json.dumps(message))

        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except Exception as e:
            logger.exception("Error forwarding client to OpenAI")

    async def process_openai_to_client():
        """Process OpenAI events, intercept transcriptions for Gemini"""
        try:
            async for message in openai_ws:
                try:
                    event = json.loads(message)
                    event_type = event.get("type")

                    # Log all events for debugging
                    logger.debug(f"OpenAI event: {event_type}")
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON from OpenAI: {e}")
                    continue  # Skip malformed message

                # === INTERCEPT TRANSCRIPTION ===
                if event_type == "conversation.item.input_audio_transcription.completed":
                    transcript = event.get("transcript", "")
                    logger.info(f"User said: {transcript}")

                    # Forward transcription to client (for display)
                    await client_ws.send_json({
                        "type": "user_transcript",
                        "transcript": transcript,
                        "timestamp": datetime.now().isoformat()
                    })

                    # Route through Gemini Socratic tutoring
                    gemini_response = await get_gemini_tutoring_response(
                        question=transcript,
                        session_id=session_data["session_id"],
                        user_id=session_data["user_id"],
                        exam_id=session_data["exam_id"],
                        subject_id=session_data["subject_id"],
                        chapter_id=session_data["chapter_id"],
                        exam_name=session_data["exam_name"],
                        subject_name=session_data["subject_name"],
                        chapter_name=session_data["chapter_name"],
                        supabase=supabase,
                        accessibility_settings=session_data.get("accessibility_settings")
                    )

                    logger.info(f"Gemini response: {gemini_response[:100]}...")

                    # Send Gemini response text to client (for display)
                    is_error_response = gemini_response.startswith("I'm having trouble")
                    await client_ws.send_json({
                        "type": "ai_response_text",
                        "text": gemini_response,
                        "is_error": is_error_response,
                        "timestamp": datetime.now().isoformat()
                    })

                    # === CREATE TTS RESPONSE ===
                    # Only speak response if it's not an error message
                    if not is_error_response:
                        # Use OpenAI TTS for text-to-speech
                        try:
                            from openai import OpenAI
                            import base64

                            # Initialize OpenAI client
                            openai_client = OpenAI(api_key=OPENAI_API_KEY)

                            # Generate speech using OpenAI TTS
                            tts_response = openai_client.audio.speech.create(
                                model="tts-1",  # or "tts-1-hd" for higher quality
                                voice="alloy",  # Options: alloy, echo, fable, onyx, nova, shimmer
                                input=gemini_response
                            )

                            # Get audio bytes and encode to base64
                            audio_bytes = tts_response.content
                            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

                            # Send audio to client
                            await client_ws.send_json({
                                "type": "tts_audio",
                                "audio": audio_base64,
                                "format": "mp3",
                                "timestamp": datetime.now().isoformat()
                            })

                            logger.info(f"Sent Gemini response via OpenAI TTS ({len(audio_bytes)} bytes)")
                        except Exception as e:
                            logger.error(f"TTS generation failed: {e}")
                    else:
                        logger.warning("Gemini returned error response, skipping TTS")

                # === FORWARD AUDIO TO CLIENT ===
                elif event_type == "response.audio.delta":
                    # Forward audio chunks to client for playback
                    logger.debug(f"🔊 Forwarding audio delta to client (size: {len(event.get('delta', ''))} bytes)")
                    await client_ws.send_json(event)

                elif event_type == "response.audio.done":
                    # Audio response complete
                    await client_ws.send_json(event)
                    logger.info("✅ Audio response completed")

                # === FORWARD OTHER EVENTS ===
                elif event_type in ["response.created", "response.done", "conversation.item.created"]:
                    await client_ws.send_json(event)

                # === ERROR HANDLING ===
                elif event_type == "error":
                    logger.error(f"OpenAI error: {event}")
                    await client_ws.send_json(event)

        except websockets.exceptions.ConnectionClosed:
            logger.info("OpenAI connection closed")
        except Exception as e:
            logger.exception("Error processing OpenAI to client")

    # Run both relay directions concurrently
    await asyncio.gather(
        forward_client_to_openai(),
        process_openai_to_client(),
        return_exceptions=True
    )


@router.websocket("/ws/voice")
async def voice_websocket(
    websocket: WebSocket,
    session_id: str,
    exam_id: str,
    subject_id: str,
    chapter_id: str,
    exam_name: str,
    subject_name: str,
    chapter_name: str,
    accessibility_settings: Optional[str] = None
):
    """
    WebSocket endpoint for real-time voice conversation

    Query parameters:
        session_id: Chat session ID
        exam_id, subject_id, chapter_id: Educational context
        exam_name, subject_name, chapter_name: Display names
        accessibility_settings: JSON string of accessibility preferences
    """
    await websocket.accept()
    logger.info(f"Voice WebSocket connected for session {session_id}")

    # Get user authentication
    # Note: WebSocket doesn't support Depends(), need to authenticate manually
    try:
        # Get token from query params or headers
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008, reason="Missing authentication token")
            return

        # Import auth functions
        from auth import verify_token
        user_id = verify_token(token)

    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        await websocket.close(code=1008, reason="Authentication failed")
        return

    # Parse accessibility settings
    parsed_settings = None
    if accessibility_settings:
        try:
            parsed_settings = json.loads(accessibility_settings)
        except:
            logger.warning("Failed to parse accessibility settings")

    # Store session data
    session_data = {
        "user_id": user_id,
        "session_id": session_id,
        "exam_id": exam_id,
        "subject_id": subject_id,
        "chapter_id": chapter_id,
        "exam_name": exam_name,
        "subject_name": subject_name,
        "chapter_name": chapter_name,
        "accessibility_settings": parsed_settings
    }

    openai_ws = None

    try:
        # Import Supabase client from main
        from main import supabase

        # Connect to OpenAI Realtime API
        openai_ws = await connect_to_openai_realtime()

        # Send connection success to client
        await websocket.send_json({
            "type": "connection_established",
            "message": "Voice mode activated. Start speaking!",
            "timestamp": datetime.now().isoformat()
        })

        # Prepare welcome greeting for blind users (will be sent after relay starts)
        session_data["send_welcome"] = True
        session_data["welcome_message"] = (
            f"Hello! Voice mode is now active for your {chapter_name} tutoring session. "
            f"I'm your AI tutor, ready to guide you through this chapter using the Socratic method. "
            f"You can start by asking me any question, or I can begin with an overview. "
            f"What would you like to explore today?"
        )

        # Start relay (welcome will be sent inside relay function)
        await relay_with_gemini_processing(websocket, openai_ws, session_data, supabase)

    except WebSocketDisconnect:
        logger.info(f"Client disconnected from voice session {session_id}")
    except Exception as e:
        logger.exception(f"Voice WebSocket error for session {session_id}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        except:
            pass
    finally:
        # Cleanup
        if openai_ws:
            await openai_ws.close()
        logger.info(f"Voice WebSocket closed for session {session_id}")


@router.get("/health")
async def voice_health_check():
    """Check if OpenAI Realtime API is configured"""
    return {
        "status": "healthy",
        "realtime_api_configured": OPENAI_API_KEY is not None,
        "model": "gpt-4o-realtime-preview-2024-12-17"
    }
