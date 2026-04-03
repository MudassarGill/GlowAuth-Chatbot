"""GlowAuth — FastAPI Backend with Auth, Chat Memory & Google OAuth."""

import os
import random
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
import bcrypt
import jwt
import httpx
from pathlib import Path
from dotenv import load_dotenv

from database import init_db, get_connection
from models import (
    SignupRequest, LoginRequest, ForgotPasswordRequest,
    ChatRequest, TokenResponse,
)

# ---- Load .env ----
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)

SECRET_KEY = os.getenv("JWT_SECRET", "glowauth-super-secret-key-2026")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/auth/google/callback")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

app = FastAPI(title="GlowAuth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")


@app.on_event("startup")
def startup():
    init_db()


# ---- Serve Frontend ----
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/style.css")
def serve_css():
    return FileResponse(os.path.join(FRONTEND_DIR, "style.css"))


@app.get("/script.js")
def serve_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "script.js"))


# ---- Helpers ----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---- Auth Endpoints ----

@app.post("/signup")
def signup(req: SignupRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")
    pw_hash = hash_password(req.password)
    cursor.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (req.name, req.email, pw_hash),
    )
    conn.commit()
    conn.close()
    return {"message": "Account created successfully!"}


@app.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, password_hash FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], req.email)
    return TokenResponse(access_token=token, user_name=user["name"])


@app.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    return {"message": "If an account with that email exists, a reset link has been sent."}


# ---- Google OAuth ----

@app.get("/auth/google")
def google_login():
    """Redirect user to Google's OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        return RedirectResponse(
            url="/?error=Google+OAuth+not+configured.+Add+GOOGLE_CLIENT_ID+to+.env"
        )
    scope = "openid email profile"
    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={scope.replace(' ', '+')}"
        f"&access_type=offline"
    )
    return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@app.get("/auth/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback, create/get user, return JWT."""
    if error or not code:
        return RedirectResponse(url="/?error=Google+login+failed")

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
        )
        token_data = token_res.json()
        access_token_google = token_data.get("access_token")
        if not access_token_google:
            return RedirectResponse(url="/?error=Google+token+exchange+failed")

        # Get user info
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token_google}"},
        )
        user_info = user_res.json()

    email = user_info.get("email", "")
    name = user_info.get("name", "Google User")

    if not email:
        return RedirectResponse(url="/?error=Could+not+get+email+from+Google")

    # Create or get user in DB
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users WHERE email = ?", (email,))
    db_user = cursor.fetchone()
    if not db_user:
        # Create account with random password (Google users don't need password)
        dummy_hash = hash_password(os.urandom(16).hex())
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, dummy_hash),
        )
        conn.commit()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        db_user = cursor.fetchone()
    conn.close()

    jwt_token = create_token(db_user["id"], email)
    # Redirect back to frontend with token in query string
    return RedirectResponse(
        url=f"/?token={jwt_token}&name={name}&email={email}"
    )


# ---- Chatbot with Memory ----

SYSTEM_PROMPT = (
    "You are GlowBot, a friendly and intelligent AI assistant embedded in GlowAuth. "
    "You were created by MudassarGill (github.com/MudassarGill). "
    "Keep responses concise, helpful, and conversational. Use emojis occasionally. "
    "You remember everything from the current conversation."
)

FALLBACK_RESPONSES = [
    "Hey! 👋 I'm GlowBot (offline mode). Add a Grok API key to `.env` for real AI responses!",
    "I'm in demo mode . Set GROK_API_KEY in your `.env` file to unlock full AI power!",
    "Hi! Connect a Grok API key to get intelligent, context-aware responses.",
]


async def call_ai_api(message: str, history: list) -> str:
    """Call Groq API with full conversation history for memory."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Append conversation history (memory)
    for h in history[:-1]:  # exclude current message (already in history)
        messages.append({"role": h.role, "content": h.content})

    # Add current user message
    messages.append({"role": "user", "content": message})

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 512,
            },
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            print(f"Groq API Error Response: {response.text}")
            return f"⚠️ API Error ({response.status_code}). Please check your API key."


@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if GROQ_API_KEY and GROQ_API_KEY not in ("", "your-grok-api-key-here", "your-groq-api-key-here"):
        try:
            reply = await call_ai_api(req.message, req.history or [])
            return {"response": reply}
        except Exception as e:
            return {"response": f" Connection error: {str(e)}"}
    else:
        return {"response": random.choice(FALLBACK_RESPONSES)}
