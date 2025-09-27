// =================================================================================
// 🚨 IMPORTANT: CONFIGURE YOUR DETAILS HERE 🚨
// =================================================================================

const SUPABASE_URL = window.APP_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.APP_CONFIG.SUPABASE_ANON_KEY;
const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
// APP INITIALIZATION
// =================================================================================

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authView = document.getElementById('auth-view');
const chatView = document.getElementById('chat-view');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const logoutButton = document.getElementById('logout-button');
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const clearHistoryButton = document.getElementById('clear-history-button');

// =================================================================================
// EVENT LISTENERS
// =================================================================================

// Check session on page load
document.addEventListener('DOMContentLoaded', () => checkSession());

// Handle Auth Form (Login/Sign Up)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    await handleLogin(email, password);
});

// Handle Logout
logoutButton.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    switchView('auth');
});

// Handle Chat Form (Send Message)
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = messageInput.value.trim();
    if (question) {
        await handleSendMessage(question);
        messageInput.value = '';
    }
});

// Handle Clear History
clearHistoryButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear the entire chat history?')) {
        await handleClearHistory();
    }
});


// =================================================================================
// CORE FUNCTIONS
// =================================================================================

// Check for active session and switch view
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        switchView('chat');
        await fetchChatHistory();
    } else {
        switchView('auth');
    }
}

// Unified Login / Sign Up Handler
async function handleLogin(email, password) {
    authError.textContent = '';
    // Try to sign in first
    let { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        // If user does not exist, try to sign them up
        if (error.message.includes("Invalid login credentials")) {
             let { error: signUpError } = await supabaseClient.auth.signUp({ email, password });
             if (signUpError) {
                authError.textContent = signUpError.message;
             } else {
                // On successful sign-up, sign them in
                await handleLogin(email, password);
             }
        } else {
            authError.textContent = error.message;
        }
    } else {
         await checkSession(); // Success, check session and switch view
    }
}

// Fetch and display chat history
async function fetchChatHistory() {
    chatWindow.innerHTML = ''; // Clear existing messages
    const token = await getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch history.');
        
        const data = await response.json();
        data.history.forEach(turn => {
            addMessageToChat(turn.role, turn.message);
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        addMessageToChat('assistant', 'Sorry, I couldn\'t load your chat history.');
    }
}


// Send a message to the backend
async function handleSendMessage(question) {
    addMessageToChat('user', question);
    const loadingMessageId = showLoader();

    const token = await getAuthToken();
    if (!token) {
        removeLoader(loadingMessageId);
        addMessageToChat('assistant', 'Your session has expired. Please log in again.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ question })
        });
        
        removeLoader(loadingMessageId);
        
        if (!response.ok) throw new Error('The server returned an error.');

        const data = await response.json();
        if (data.answer) {
            addMessageToChat('assistant', data.answer);
        } else {
            throw new Error(data.error || 'No answer received.');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        removeLoader(loadingMessageId);
        addMessageToChat('assistant', `Sorry, something went wrong: ${error.message}`);
    }
}

// Clear chat history
async function handleClearHistory() {
    const token = await getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/clear`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to clear history.');

        chatWindow.innerHTML = '';
        addMessageToChat('assistant', 'Chat history has been cleared.');

    } catch (error) {
        console.error('Error clearing history:', error);
        addMessageToChat('assistant', 'Sorry, I couldn\'t clear your history.');
    }
}


// =================================================================================
// HELPER & UTILITY FUNCTIONS
// =================================================================================

// Switch between 'auth' and 'chat' views
function switchView(viewName) {
    if (viewName === 'chat') {
        chatView.style.display = 'flex';
        authView.style.display = 'none';
    } else {
        authView.style.display = 'flex';
        chatView.style.display = 'none';
    }
}

// Add a message to the chat UI
function addMessageToChat(role, message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    messageDiv.textContent = message;
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
}

// Show a loading indicator
function showLoader() {
    const loadingId = `loading-${Date.now()}`;
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.classList.add('message', 'loading-message');
    loadingDiv.textContent = 'Newton is thinking...';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return loadingId;
}

// Remove the loading indicator
function removeLoader(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Get the current user's JWT token
async function getAuthToken() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        console.error("No active session. User needs to log in.");
        switchView('auth');
        return null;
    }
    return session.access_token;
}