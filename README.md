# GlowAuth — AI-Powered Authentication & Chatbot Platform 🚀

GlowAuth is a premium, full-stack web application featuring a stunning **cyberpunk neon UI**, an **interactive desk lamp animation**, and an integrated **AI Chatbot** powered by the Grok API.

Built with performance and aesthetics in mind, this project seamlessly combines secure authentication (JWT) with modern HTML/CSS glassmorphism.

Created by **[MudassarGill](https://github.com/MudassarGill)**.

---

## ✨ Key Features

- **Premium Cyberpunk Aesthetics:** A dynamic dark-mode interface featuring a deep cosmic mesh gradient and highly distinct neon emerald green UI accents.
- **Interactive Desk Lamp:** A unique onboarding experience. Pull the lamp chain to smoothly reveal the login panel!
- **Complete Auth System:**
  - Secure **JWT-based Authentication** via FastAPI.
  - Classic Email/Password Login & Signup (`bcrypt` password hashing).
  - **Google OAuth Integration** allows users to instantly securely sign up and sign in.
- **AI Chatbot with Full Memory:**
  - Integrated with **Grok API (xAI)**.
  - Context-aware chatbot that tracks the full conversation history.
  - Fully animated, real-time typing indicators globally.
- **Dynamic Splash Animations:** Welcomes users to the dashboard securely with bursting neon particle effects upon authentication.
- **Zero-Dependency Frontend:** Optimized with pure, lightweight Vanilla HTML, CSS3, and modern JavaScript.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JS
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **Database:** SQLite
- **AI Integration:** xAI Grok API (`httpx`)

## ⚙️ Local Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/MudassarGill/GlowAuth-Chatbot.git
cd GlowAuth-Chatbot
```

### 2. Set Up Environment Variables (Backend)
Navigate to the `backend/` directory and create a `.env` file:
```env
# backend/.env

# AI API Key (from x.ai)
GROK_API_KEY=your-grok-api-key

# JWT Token Secret
JWT_SECRET=your-secure-random-secret-key

# Google OAuth (Optional for Social Login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
```

### 3. Install Dependencies
Navigate inside the `backend` folder and ensure you have Python installed, then run:
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the API Server
Start the Uvicorn server:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 5. Access the Application
FastAPI serves the frontend directly. Simply open your browser and go to:
➡️ **http://127.0.0.1:8000**

---

## 👨‍💻 Author

**MudassarGill**
- GitHub: [@MudassarGill](https://github.com/MudassarGill)
- LinkedIn: [m-mudassar-85](https://www.linkedin.com/in/m-mudassar-85)
- Email: [mudassarjutt65030@gmail.com](mailto:mudassarjutt65030@gmail.com)

---
*Feel free to star ⭐ this repository if you find it helpful!*
