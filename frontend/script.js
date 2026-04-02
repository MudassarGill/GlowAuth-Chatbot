/* =============================================
   GlowAuth — Frontend Logic
   ============================================= */

const API_URL = 'http://127.0.0.1:8000';
let authToken = localStorage.getItem('glowauth_token');
let currentUser = JSON.parse(localStorage.getItem('glowauth_user') || 'null');

// ---- On Load ----
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    setupFormListeners();
    setupChatInput();
    if (authToken && currentUser) {
        showDashboard(currentUser.name);
    }
});

// ============ PARTICLES ============
function initParticles() {
    const container = document.getElementById('bgParticles');
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.style.cssText = `
            position:absolute;
            width:${Math.random() * 3 + 1}px;
            height:${Math.random() * 3 + 1}px;
            background:rgba(0,255,136,${Math.random() * 0.3 + 0.05});
            border-radius:50%;
            left:${Math.random() * 100}%;
            top:${Math.random() * 100}%;
            animation: floatParticle ${Math.random() * 15 + 10}s linear infinite;
            opacity:0;
        `;
        container.appendChild(p);
    }
    const style = document.createElement('style');
    style.textContent = `@keyframes floatParticle {
        0% { opacity:0; transform:translateY(0) translateX(0); }
        10% { opacity:1; }
        90% { opacity:1; }
        100% { opacity:0; transform:translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}${Math.random()*80}px); }
    }`;
    document.head.appendChild(style);
}

// ============ DESK LAMP ============
let lampOn = false;
const lampContainer = document.getElementById('lampContainer');
const lampChain = document.getElementById('lampChain');
const authPanel = document.getElementById('authPanel');
const lampHint = document.getElementById('lampHint');

lampChain.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLamp();
});
lampContainer.addEventListener('click', toggleLamp);

function toggleLamp() {
    lampOn = !lampOn;
    lampContainer.classList.toggle('on', lampOn);
    authPanel.classList.toggle('visible', lampOn);
    if (lampOn) lampHint.style.opacity = '0';
    else lampHint.style.opacity = '1';
    // Pull animation
    lampChain.style.transform = 'translateY(8px)';
    setTimeout(() => lampChain.style.transform = '', 200);
}

// ============ AUTH FORMS ============
function switchForm(target, e) {
    if (e) e.preventDefault();
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(f => { f.classList.add('hidden'); f.style.animation = ''; });
    const show = target === 'signup' ? document.getElementById('signupForm')
               : target === 'forgot' ? document.getElementById('forgotForm')
               : document.getElementById('loginForm');
    show.classList.remove('hidden');
    show.style.animation = 'fadeInUp 0.4s ease';
}

function showForgotPassword(e) {
    e.preventDefault();
    switchForm('forgot');
}

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
        authToken = data.access_token;
        currentUser = { name: data.user_name, email };
        localStorage.setItem('glowauth_token', authToken);
        localStorage.setItem('glowauth_user', JSON.stringify(currentUser));
        showToast('Login successful! 🚀', 'success');
        setTimeout(() => showDashboard(data.user_name), 600);
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
        showToast(data.message || 'Reset link sent! Check your email.', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

// ============ DASHBOARD ============
function showDashboard(name) {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    document.getElementById('userName').textContent = name || 'User';
    animateWelcome();
    spawnWelcomeParticles();
}

function animateWelcome() {
    const title = document.getElementById('welcomeTitle');
    title.style.animation = 'none';
    title.offsetHeight; // reflow
    title.style.animation = 'fadeInUp 0.8s ease, shineText 3s linear infinite';
}

function spawnWelcomeParticles() {
    const container = document.getElementById('welcomeParticles');
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 6 + 2;
        const x = Math.random() * 100;
        const delay = Math.random() * 2;
        p.style.cssText = `
            position:absolute; width:${size}px; height:${size}px;
            background:rgba(0,255,136,${Math.random()*0.4+0.1});
            border-radius:50%; left:${x}%; bottom:0;
            animation: riseParticle ${Math.random()*3+2}s ease-out ${delay}s both;
        `;
        container.appendChild(p);
    }
    if (!document.getElementById('riseStyle')) {
        const s = document.createElement('style');
        s.id = 'riseStyle';
        s.textContent = `@keyframes riseParticle {
            0% { opacity:0; transform:translateY(0) scale(0); }
            20% { opacity:1; transform:scale(1); }
            100% { opacity:0; transform:translateY(-300px) translateX(${Math.random()>0.5?'':'-'}${Math.random()*60}px) scale(0.3); }
        }`;
        document.head.appendChild(s);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
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

// ============ CHATBOT ============
function setupChatInput() {
    const input = document.getElementById('chatInput');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    addBubble(msg, 'user');
    const typingEl = addTypingIndicator();
    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        typingEl.remove();
        addBubble(data.response || data.detail || 'Something went wrong.', 'bot');
    } catch (err) {
        typingEl.remove();
        addBubble('❌ Could not connect to the server.', 'bot');
    }
}

function addBubble(text, type) {
    const container = document.getElementById('chatMessages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    const icon = type === 'bot' ? 'fa-robot' : 'fa-user';
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
    el.innerHTML = `<div class="bubble-avatar"><i class="fas fa-robot"></i></div>
        <div class="bubble-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
}

function clearChat() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = `<div class="chat-bubble bot"><div class="bubble-avatar"><i class="fas fa-robot"></i></div>
        <div class="bubble-content"><p>Chat cleared! How can I help you? 🚀</p><span class="bubble-time">Just now</span></div></div>`;
}

// ============ UTILITIES ============
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
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
