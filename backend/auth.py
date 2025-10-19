"""
Authentication module for AI Tutor backend.
Handles JWT token validation and user authentication.
"""

import os
import logging
import jwt
from jwt import exceptions as jwt_exceptions
from fastapi import Header, HTTPException, status

# Load environment variables
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

async def get_current_user(authorization: str = Header(None)):
    """
    Extract and validate user ID from JWT token in Authorization header.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        str: User ID from the token

    Raises:
        HTTPException: If token is invalid or missing
    """
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    parts = authorization.split()
    if parts[0].lower() != "bearer" or len(parts) != 2:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    token = parts[1]

    try:
        if SUPABASE_JWT_SECRET:
            decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        else:
            # WARNING: insecure — only allowed for local dev when you can't verify signature
            logging.warning("SUPABASE_JWT_SECRET not set — decoding token WITHOUT verification (dev only).")
            decoded = jwt.decode(token, options={"verify_signature": False})

        user_id = decoded.get("sub") or decoded.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user id")

        return user_id

    except jwt_exceptions.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


def verify_token(token: str) -> str:
    """
    Verify JWT token and return user ID (for WebSocket authentication)

    Args:
        token: JWT token string

    Returns:
        str: User ID from the token

    Raises:
        HTTPException: If token is invalid
    """
    try:
        if SUPABASE_JWT_SECRET:
            decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        else:
            logging.warning("SUPABASE_JWT_SECRET not set — decoding token WITHOUT verification (dev only).")
            decoded = jwt.decode(token, options={"verify_signature": False})

        user_id = decoded.get("sub") or decoded.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user id")

        return user_id

    except jwt_exceptions.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")