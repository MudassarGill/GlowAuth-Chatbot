/* =============================================
   GlowAuth — Frontend Logic
   Chat Memory + Google OAuth + Burst Animation
   ============================================= */

const API_URL = 'http://127.0.0.1:8000';
let authToken = localStorage.getItem('glowauth_token');
let currentUser = JSON.parse(localStorage.getItem('glowauth_user') || 'null');

// Chat memory — full conversation history sent to backend
let chatHistory = [];

// ---- On Load ----
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    setupFormListeners();
    setupChatInput();
    checkGoogleCallback();
    if (authToken && currentUser) {
        showDashboard(currentUser.name, false); // skip burst on page reload
    }
});

// ============ PARTICLES ============
function initParticles() {
    const container = document.getElementById('bgParticles');
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatParticle {
            0%   { opacity: 0; transform: translateY(0) translateX(0) scale(0); }
            10%  { opacity: 1; transform: scale(1); }
            90%  { opacity: 0.6; }
            100% { opacity: 0; transform: translateY(-90vh) translateX(var(--tx)) scale(0.4); }
        }
    `;
    document.head.appendChild(style);

    for (let i = 0; i < 35; i++) {
        const p = document.createElement('div');
        const tx = (Math.random() - 0.5) * 120;
        const size = Math.random() * 3 + 1;
        const delay = Math.random() * 20;
        const dur = Math.random() * 15 + 12;
        const colors = ['rgba(0,232,123,0.5)', 'rgba(77,242,168,0.4)', 'rgba(0,209,109,0.3)'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        p.style.cssText = `
            position:absolute;
            width:${size}px; height:${size}px;
            background:${color};
            border-radius:50%;
            left:${Math.random() * 100}%;
            bottom:0;
            --tx:${tx}px;
            animation: floatParticle ${dur}s linear ${delay}s infinite;
            opacity:0;
        `;
        container.appendChild(p);
    }
}

// ============ DESK LAMP ============
let lampOn = false;
const lampContainer = document.getElementById('lampContainer');
const lampChain = document.getElementById('lampChain');
const authPanel = document.getElementById('authPanel');
const lampHint = document.getElementById('lampHint');

lampChain.addEventListener('click', e => { e.stopPropagation(); toggleLamp(); });
lampContainer.addEventListener('click', toggleLamp);

function toggleLamp() {
    lampOn = !lampOn;
    lampContainer.classList.toggle('on', lampOn);
    authPanel.classList.toggle('visible', lampOn);
    lampHint.style.opacity = lampOn ? '0' : '1';
    lampChain.style.transform = 'translateY(8px)';
    setTimeout(() => lampChain.style.transform = '', 200);
}

// ============ AUTH FORMS ============
function switchForm(target, e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    const show = target === 'signup' ? 'signupForm' : target === 'forgot' ? 'forgotForm' : 'loginForm';
    const el = document.getElementById(show);
    el.classList.remove('hidden');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'fadeInUp 0.4s ease';
}

function showForgotPassword(e) { e.preventDefault(); switchForm('forgot'); }

function togglePassword(id, btn) {
    const inp = document.getElementById(id);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
    else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
}

function setupFormListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('forgotForm').addEventListener('submit', handleForgot);
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showToast('Please fill all fields', 'error');
    btn.classList.add('loading');
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        saveSession(data.access_token, data.user_name, email);
        showToast('Login successful! 🚀', 'success');
        setTimeout(() => showDashboard(data.user_name, true), 500);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirmPassword').value;
    if (!name || !email || !password || !confirm) return showToast('Please fill all fields', 'error');
    if (password !== confirm) return showToast('Passwords do not match', 'error');
    if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
    btn.classList.add('loading');
    try {
        const res = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Signup failed');
        showToast('Account created! Please sign in. ✨', 'success');
        setTimeout(() => switchForm('login'), 800);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleForgot(e) {
    e.preventDefault();
    const btn = document.getElementById('forgotBtn');
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) return showToast('Please enter your email', 'error');
    btn.classList.add('loading');
    try {
        const res = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Request failed');
        showToast(data.message || 'Reset link sent!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

// ============ GOOGLE OAUTH ============
function loginWithGoogle() {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_URL}/auth/google`;
}

function loginWithApple() {
    showToast('Apple login requires an Apple Developer account.', 'info');
}

function checkGoogleCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    if (token && name) {
        // Clean URL
        window.history.replaceState({}, document.title, '/');
        saveSession(token, name, email || '');
        showToast('Google login successful! 🚀', 'success');
        setTimeout(() => showDashboard(name, true), 500);
    }
}

function saveSession(token, name, email) {
    authToken = token;
    currentUser = { name, email };
    localStorage.setItem('glowauth_token', token);
    localStorage.setItem('glowauth_user', JSON.stringify(currentUser));
}

// ============ DASHBOARD ============
function showDashboard(name, showBurst = true) {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    document.getElementById('userName').textContent = name || 'User';
    chatHistory = []; // Reset chat memory on new login

    if (showBurst) {
        playWelcomeBurst(name);
    }
    spawnWelcomeParticles();
}

function playWelcomeBurst(name) {
    const burst = document.getElementById('welcomeBurst');
    const burstName = document.getElementById('burstUserName');
    burstName.textContent = name || 'User';
    burst.classList.remove('hidden');

    // Auto dismiss after 2.5s
    setTimeout(() => {
        burst.style.animation = 'burstFadeOut 0.5s ease forwards';
        setTimeout(() => {
            burst.classList.add('hidden');
            burst.style.animation = '';
        }, 500);
    }, 2500);
}

// Add fadeOut keyframe dynamically
const burstStyle = document.createElement('style');
burstStyle.textContent = `@keyframes burstFadeOut { from { opacity:1; } to { opacity:0; transform: scale(1.05); } }`;
document.head.appendChild(burstStyle);

function spawnWelcomeParticles() {
    const container = document.getElementById('welcomeParticles');
    container.innerHTML = '';
    const style = document.createElement('style');
    style.id = 'riseStyle';
    if (!document.getElementById('riseStyle')) {
        style.textContent = `@keyframes riseParticle {
            0% { opacity:0; transform:translateY(0) scale(0); }
            20% { opacity:1; transform:scale(1); }
            100% { opacity:0; transform:translateY(-280px) translateX(var(--rx)) scale(0.3); }
        }`;
        document.head.appendChild(style);
    }
    for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        const rx = (Math.random() - 0.5) * 120;
        const size = Math.random() * 7 + 2;
        const colors = ['#00e87b', '#00d16d', '#4df2a8', '#00a657'];
        p.style.cssText = `
            position:absolute; width:${size}px; height:${size}px;
            background:${colors[Math.floor(Math.random() * colors.length)]};
            border-radius:50%; left:${Math.random() * 100}%; bottom:0;
            --rx:${rx}px; opacity:0;
            animation: riseParticle ${Math.random()*2+2}s ease-out ${Math.random()*1.5}s both;
        `;
        container.appendChild(p);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    chatHistory = [];
    localStorage.removeItem('glowauth_token');
    localStorage.removeItem('glowauth_user');
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    lampOn = false;
    lampContainer.classList.remove('on');
    authPanel.classList.remove('visible');
    lampHint.style.opacity = '1';
    showToast('Logged out successfully', 'info');
}

// ============ CHATBOT WITH MEMORY ============
function setupChatInput() {
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    // Add user message to UI
    addBubble(msg, 'user');

    // Add to conversation history (memory)
    chatHistory.push({ role: 'user', content: msg });

    const typingEl = addTypingIndicator();

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken || ''}`
            },
            body: JSON.stringify({
                message: msg,
                history: chatHistory  // Send full conversation history
            })
        });
        const data = await res.json();
        typingEl.remove();
        const reply = data.response || data.detail || 'Something went wrong.';

        // Add bot reply to memory
        chatHistory.push({ role: 'assistant', content: reply });

        addBubble(reply, 'bot');
    } catch (err) {
        typingEl.remove();
        addBubble('❌ Could not connect to the server. Make sure the backend is running.', 'bot');
    }
}

function addBubble(text, type) {
    const container = document.getElementById('chatMessages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    const icon = type === 'bot' ? 'fa-brain' : 'fa-user';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fas ${icon}"></i></div>
        <div class="bubble-content"><p>${escapeHtml(text)}</p><span class="bubble-time">${now}</span></div>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const el = document.createElement('div');
    el.className = 'chat-bubble bot';
    el.innerHTML = `
        <div class="bubble-avatar"><i class="fas fa-brain"></i></div>
        <div class="bubble-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
}

function clearChat() {
    chatHistory = []; // Clear memory too
    const container = document.getElementById('chatMessages');
    container.innerHTML = `
        <div class="chat-bubble bot">
            <div class="bubble-avatar"><i class="fas fa-brain"></i></div>
            <div class="bubble-content">
                <p>Chat cleared! I've also reset my memory. Let's start fresh! 🚀</p>
                <span class="bubble-time">Just now</span>
            </div>
        </div>
    `;
}

// ============ UTILITIES ============
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
