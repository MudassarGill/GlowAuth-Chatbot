"""GlowAuth — Pydantic models."""

from typing import List, Optional
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ChatMessage(BaseModel):
    role: str   # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []   # Full conversation memory


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
