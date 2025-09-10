// Initialize Supabase client using global window.CONFIG
const supabase = window.supabase.createClient(window.window.CONFIG.SUPABASE_URL, window.window.CONFIG.SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let authToken = null;

// DOM elements
const authModal = document.getElementById('authModal');
const app = document.getElementById('app'); 
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    console.log('window.CONFIG available:', !!window.window.CONFIG);
    console.log('DOM elements found:', {
        authModal: !!authModal,
        app: !!app,
        chatMessages: !!chatMessages,
        chatInput: !!chatInput
    });
    
    testSupabaseConnection();
    checkAuthStatus();
    setupEventListeners();
    setupAutoResize();
});

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('chat_history').select('count').limit(1);
        if (error) {
            console.error('Supabase connection test failed:', error);
            showToast('Supabase connection failed. Please check your configuration.', 'error');
        } else {
            console.log('Supabase connection successful');
        }
    } catch (error) {
        console.error('Supabase connection test error:', error);
        showToast('Supabase connection test failed. Please check your configuration.', 'error');
    }
}

// Check authentication status
async function checkAuthStatus() {
    try {
        console.log('Checking auth status...');
        console.log('Supabase client initialized:', !!supabase);
        console.log('Supabase URL:', window.CONFIG.SUPABASE_URL);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session check result:', { session, error });
        
        if (error) {
            console.error('Session check error:', error);
            showAuthModal();
            return;
        }
        
        if (session) {
            currentUser = session.user;
            authToken = session.access_token;
            console.log('User authenticated:', currentUser.email);
            showApp();
        } else {
            console.log('No active session, showing auth modal');
            showAuthModal();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthModal();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Chat input events
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        updateCharCount();
        autoResizeTextarea();
    });

    // Auth button events
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const sendBtn = document.getElementById('sendBtn');

    if (loginBtn) loginBtn.addEventListener('click', login);
    if (signupBtn) signupBtn.addEventListener('click', signup);
    if (loginTab) loginTab.addEventListener('click', () => switchTab('login'));
    if (signupTab) signupTab.addEventListener('click', () => switchTab('signup'));
    if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    // Supabase auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', { event, session: !!session });
        if (event === 'SIGNED_IN' && session) {
            console.log('User signed in:', session.user.email);
            currentUser = session.user;
            authToken = session.access_token;
            showApp();
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            currentUser = null;
            authToken = null;
            showAuthModal();
        }
    });
}

// Setup auto-resize for textarea
function setupAutoResize() {
    chatInput.addEventListener('input', autoResizeTextarea);
}

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
}

// Update character count
function updateCharCount() {
    const count = chatInput.value.length;
    const charCount = document.querySelector('.char-count');
    if (charCount) {
        charCount.textContent = `${count}/1000`;
        charCount.style.color = count > 900 ? '#f56565' : '#a0aec0';
    }
}

// Authentication functions
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');

    // Remove active class from all tabs
    if (loginTab) loginTab.classList.remove('active');
    if (signupTab) signupTab.classList.remove('active');

    if (tab === 'login') {
        if (loginTab) loginTab.classList.add('active');
        if (loginForm) loginForm.classList.remove('hidden');
        if (signupForm) signupForm.classList.add('hidden');
    } else {
        if (signupTab) signupTab.classList.add('active');
        if (loginForm) loginForm.classList.add('hidden');
        if (signupForm) signupForm.classList.remove('hidden');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    setButtonLoading(btn, true);

    try {
        console.log('Attempting login with:', { email });
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        console.log('Login response:', { data, error });

        if (error) {
            console.error('Login error:', error);
            throw error;
        }

        if (data.user && data.session) {
            console.log('Login successful, updating state...');
            currentUser = data.user;
            authToken = data.session.access_token;
            
            // Manually trigger the app display since auth state change might not fire immediately
            showApp();
            showToast('Welcome back!', 'success');
            
            // Clear form
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        } else {
            throw new Error('Login successful but no user data received');
        }
    } catch (error) {
        console.error('Login failed:', error);
        showToast(`Login failed: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function signup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const btn = document.getElementById('signupBtn');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    setButtonLoading(btn, true);

    try {
        console.log('Attempting signup with:', { email, passwordLength: password.length });
        console.log('Supabase client:', supabase);
        console.log('Supabase URL:', window.CONFIG.SUPABASE_URL);
        console.log('Using anon key:', window.CONFIG.SUPABASE_ANON_KEY.substring(0, 20) + '...');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        console.log('Signup response:', { data, error });

        if (error) {
            console.error('Signup error:', error);
            throw error;
        }

        showToast('Account created! Please check your email to verify your account.', 'success');
        
        // Clear form
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
        
        // Switch to login tab
        switchTab('login');
    } catch (error) {
        console.error('Signup failed:', error);
        showToast(`Signup failed: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

// UI functions
function showAuthModal() {
    console.log('Showing auth modal');
    authModal.classList.remove('hidden');
    app.classList.add('hidden');
}

function showApp() {
    console.log('Showing app interface');
    authModal.classList.add('hidden');
    app.classList.remove('hidden');
    loadChatHistory();
}

function setButtonLoading(btn, loading) {
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    
    if (loading) {
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        btn.disabled = true;
    } else {
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        btn.disabled = false;
    }
}

// Chat functions
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessageToChat('user', message);
    chatInput.value = '';
    updateCharCount();
    autoResizeTextarea();
    
    // Show loading
    showLoading(true);
    sendBtn.disabled = true;

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ question: message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get response');
        }

        // Add assistant response to chat
        addMessageToChat('assistant', data.answer);
        
    } catch (error) {
        console.error('Chat error:', error);
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
        showToast('Failed to get response from tutor', 'error');
    } finally {
        showLoading(false);
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageContent.appendChild(messageTime);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    // Remove welcome message if it exists
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadChatHistory() {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/chat/history`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.history && data.history.length > 0) {
                // Clear welcome message
                const welcomeMessage = chatMessages.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.remove();
                }
                
                // Add chat history
                data.history.forEach(msg => {
                    addMessageToChat(msg.role, msg.message);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
}

async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
        return;
    }

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/chat/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            // Clear chat messages
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <h3>Welcome to your AI Physics Tutor!</h3>
                    <p>I'm here to help you master JEE Physics through guided learning. Ask me about:</p>
                    <ul>
                        <li>Mechanics and Motion</li>
                        <li>Thermodynamics</li>
                        <li>Electromagnetism</li>
                        <li>Optics and Waves</li>
                        <li>Modern Physics</li>
                    </ul>
                    <p>I'll ask you questions to help you understand concepts better!</p>
                </div>
            `;
            showToast('Chat history cleared', 'success');
        } else {
            throw new Error('Failed to clear chat history');
        }
    } catch (error) {
        console.error('Clear chat error:', error);
        showToast('Failed to clear chat history', 'error');
    }
}

// Utility functions
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    
    switch (type) {
        case 'success':
            icon.innerHTML = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon.innerHTML = '<i class="fas fa-info-circle"></i>';
    }
    
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.innerHTML = `<div class="toast-message">${message}</div>`;
    
    toast.appendChild(icon);
    toast.appendChild(content);
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
});

// Debug function to test login flow
window.debugLogin = async function(email = 'test@example.com', password = 'testpassword123') {
    console.log('=== DEBUG LOGIN TEST ===');
    console.log('Testing with:', { email, password });
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        console.log('Login result:', { data, error });
        
        if (data.user && data.session) {
            console.log('✅ Login successful!');
            console.log('User:', data.user.email);
            console.log('Session exists:', !!data.session);
            
            // Test manual state update
            currentUser = data.user;
            authToken = data.session.access_token;
            showApp();
            
            return { success: true, user: data.user };
        } else {
            console.log('❌ Login failed - no user data');
            return { success: false, error: 'No user data' };
        }
    } catch (error) {
        console.log('❌ Login exception:', error);
        return { success: false, error: error.message };
    }
};

// Export functions for global access (for debugging)
window.switchTab = switchTab;
window.login = login;
window.signup = signup;
window.logout = logout;
window.sendMessage = sendMessage;
window.clearChat = clearChat;
