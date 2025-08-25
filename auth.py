import os
import json
import logging
from typing import Dict, Optional
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from db import get_db_pool

logger = logging.getLogger(__name__)

# Global Firebase app instance
_firebase_app: Optional[firebase_admin.App] = None

def init_firebase() -> None:
    """Initialize Firebase Admin SDK."""
    global _firebase_app
    
    if _firebase_app is not None:
        return
    
    try:
        # Load Firebase credentials from environment variable
        firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if not firebase_creds_json:
            raise ValueError("FIREBASE_CREDENTIALS_JSON environment variable is required")
        
        # Parse JSON credentials
        creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(creds_dict)
        
        # Initialize Firebase app
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise

async def get_or_create_user(firebase_uid: str, email: str) -> int:
    """
    Get existing user or create new user in database.
    Returns the user_id.
    """
    pool = get_db_pool()
    
    async with pool.acquire() as conn:
        # Try to get existing user
        user_id = await conn.fetchval(
            "SELECT id FROM users WHERE firebase_uid = $1",
            firebase_uid
        )
        
        if user_id is not None:
            return user_id
        
        # Create new user
        user_id = await conn.fetchval(
            """
            INSERT INTO users (firebase_uid, email)
            VALUES ($1, $2)
            RETURNING id
            """,
            firebase_uid,
            email
        )
        
        logger.info(f"Created new user with ID {user_id} for Firebase UID {firebase_uid}")
        return user_id

async def verify_firebase_token(token: str) -> Dict[str, any]:
    """
    Verify Firebase ID token and return user information.
    
    Args:
        token: Firebase ID token from client
        
    Returns:
        Dict containing user_id and email
        
    Raises:
        ValueError: If token is invalid or verification fails
    """
    if _firebase_app is None:
        init_firebase()
    
    try:
        # Verify the token with Firebase
        decoded_token = firebase_auth.verify_id_token(token)
        
        firebase_uid = decoded_token.get('uid')
        email = decoded_token.get('email')
        
        if not firebase_uid:
            raise ValueError("Token does not contain valid user ID")
        
        if not email:
            raise ValueError("Token does not contain valid email")
        
        # Get or create user in database
        user_id = await get_or_create_user(firebase_uid, email)
        
        return {
            'user_id': user_id,
            'firebase_uid': firebase_uid,
            'email': email
        }
        
    except firebase_auth.InvalidIdTokenError as e:
        logger.error(f"Invalid Firebase token: {e}")
        raise ValueError("Invalid authentication token")
    except firebase_auth.ExpiredIdTokenError as e:
        logger.error(f"Expired Firebase token: {e}")
        raise ValueError("Authentication token has expired")
    except firebase_auth.RevokedIdTokenError as e:
        logger.error(f"Revoked Firebase token: {e}")
        raise ValueError("Authentication token has been revoked")
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {e}")
        raise ValueError("Authentication verification failed")