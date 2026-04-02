"""GlowAuth — FastAPI Backend with Auth & AI Chatbot."""

import os
import re
import random
import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import bcrypt
import jwt

from database import init_db, get_connection
from models import (
    SignupRequest, LoginRequest, ForgotPasswordRequest,
    ChatRequest, TokenResponse,
)

# ---- Config ----
SECRET_KEY = os.environ.get("JWT_SECRET", "glowauth-super-secret-key-2026")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

app = FastAPI(title="GlowAuth API", version="1.0.0")

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Init DB on startup ----
@app.on_event("startup")
def startup():
    init_db()


# ---- Serve Frontend ----
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

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


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- Auth Endpoints ----

@app.post("/signup")
def signup(req: SignupRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    conn = get_connection()
    cursor = conn.cursor()
    # Check if user exists
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    # Always return success (security best practice — don't reveal if email exists)
    return {"message": "If an account with that email exists, a reset link has been sent."}


# ---- Chatbot ----

CHAT_RESPONSES = {
    "hello": [
        "Hey there! 👋 I'm GlowBot, your AI assistant. How can I help you today?",
        "Hello! 🚀 Welcome to GlowAuth. What would you like to know?",
        "Hi! I'm here and ready to assist. Fire away!",
    ],
    "hi": [
        "Hey! 👋 What's on your mind?",
        "Hi there! How can I assist you today?",
    ],
    "help": [
        "I can help with:\n🔹 General questions\n🔹 Coding assistance\n🔹 Tech explanations\n🔹 Creative ideas\n\nJust ask me anything! 🧠",
    ],
    "who are you": [
        "I'm GlowBot 🤖 — an AI assistant built into GlowAuth. Created by MudassarGill, I'm here to make your experience smarter!",
    ],
    "who made you": [
        "I was crafted by MudassarGill 🛠️ — check out their work at github.com/MudassarGill!",
    ],
    "joke": [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😄",
        "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?' 😂",
        "Why was the JavaScript developer sad? Because he didn't Node how to Express himself! 😅",
    ],
    "python": [
        "Python is amazing! 🐍 It's versatile, readable, and powers everything from web apps to AI. Fun fact: this very backend is built with Python + FastAPI!",
    ],
    "fastapi": [
        "FastAPI is a modern, high-performance Python web framework. It's async-ready, auto-generates docs, and is blazing fast! ⚡ This app runs on it!",
    ],
    "ai": [
        "AI is transforming the world! 🌍 From language models to computer vision, the possibilities are endless. I'm a small taste of what AI assistants can do!",
    ],
    "bye": [
        "Goodbye! 👋 Come back anytime. I'll be here!",
        "See you later! 🚀 Have a great day!",
    ],
    "thank": [
        "You're welcome! 😊 Happy to help!",
        "Anytime! That's what I'm here for! 🙌",
    ],
}

FALLBACK_RESPONSES = [
    "That's an interesting thought! 🤔 I'm still learning, but I'd love to explore that topic with you.",
    "Great question! While I'm a simulated AI, I can tell you this — the future of AI is incredibly exciting! 🚀",
    "Hmm, let me think about that... 🧠 I may not have the perfect answer, but feel free to ask me something else!",
    "I appreciate the question! As GlowBot, I'm here to chat and assist. Try asking me about Python, AI, or coding! 💡",
    "Interesting! I'm always learning. Could you rephrase that or try a different question? 😊",
]


def get_ai_response(message: str) -> str:
    """Simulate a Grok-like AI response based on keyword matching."""
    msg_lower = message.lower().strip()

    # Check keyword matches
    for keyword, responses in CHAT_RESPONSES.items():
        if keyword in msg_lower:
            return random.choice(responses)

    # Math expressions
    if re.match(r'^[\d\s\+\-\*\/\.\(\)]+$', msg_lower):
        try:
            result = eval(msg_lower)  # Only safe math expressions
            return f"The answer is **{result}** 🧮"
        except Exception:
            pass

    # Greeting patterns
    if any(g in msg_lower for g in ["hey", "hola", "sup", "yo", "what's up"]):
        return random.choice(CHAT_RESPONSES["hello"])

    return random.choice(FALLBACK_RESPONSES)


@app.post("/chat")
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    response = get_ai_response(req.message)
    return {"response": response}
