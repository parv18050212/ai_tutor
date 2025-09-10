// Simple AI Physics Tutor - Hardcoded User ID
// Initialize Supabase client using global CONFIG
const supabase = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);

// Global state
let chatHistory = [];
const HARDCODED_USER_ID = "06fb2f05-131e-47c1-8b75-3e393738e87c"; // This matches the backend

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');
const clearChatBtn = document.getElementById('clearChatBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎓 AI Physics Tutor - Simple Mode (Black UI)');
    console.log('CONFIG available:', !!window.CONFIG);
    console.log('DOM elements found:', {
        chatMessages: !!chatMessages,
        chatInput: !!chatInput,
        sendBtn: !!sendBtn
    });
    console.log('🎨 Black UI theme loaded successfully!');
    
    setupEventListeners();
    setupAutoResize();
    loadChatHistory();
});

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

    // Button events
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);
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

// Chat functions
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessageToChat('user', message);
    chatInput.value = '';
    updateCharCount();
    autoResizeTextarea();
    
    // Show thinking dots
    showThinkingDots();
    sendBtn.disabled = true;

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HARDCODED_USER_ID}` // Send hardcoded user ID
            },
            body: JSON.stringify({ question: message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get response');
        }

        // Remove thinking dots and add assistant response
        removeThinkingDots();
        addMessageToChat('assistant', data.answer);
        
    } catch (error) {
        console.error('Chat error:', error);
        removeThinkingDots();
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
        showToast('Failed to get response from tutor', 'error');
    } finally {
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
    
    // Store in local history
    chatHistory.push({ role, content, timestamp: new Date() });
    saveChatHistory();
}

async function loadChatHistory() {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/chat/history`, {
            headers: {
                'Authorization': `Bearer ${HARDCODED_USER_ID}`
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
                
                // Add chat history from backend
                data.history.forEach(msg => {
                    addMessageToChat(msg.role, msg.message);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load chat history:', error);
        // Fallback to local storage if backend fails
        loadLocalChatHistory();
    }
}

function loadLocalChatHistory() {
    try {
        const saved = localStorage.getItem('physicsTutorChat');
        if (saved) {
            chatHistory = JSON.parse(saved);
            
            // Clear welcome message
            const welcomeMessage = chatMessages.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            // Add chat history
            chatHistory.forEach(msg => {
                addMessageToChat(msg.role, msg.content);
            });
        }
    } catch (error) {
        console.error('Failed to load local chat history:', error);
    }
}

function saveChatHistory() {
    try {
        // Keep only last 50 messages
        const recentHistory = chatHistory.slice(-50);
        localStorage.setItem('physicsTutorChat', JSON.stringify(recentHistory));
    } catch (error) {
        console.error('Failed to save chat history:', error);
    }
}

async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
        return;
    }

    try {
        // Clear chat history from backend
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/chat/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HARDCODED_USER_ID}`
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
            
            // Clear local storage as backup
            chatHistory = [];
            localStorage.removeItem('physicsTutorChat');
            showToast('Chat history cleared', 'success');
        } else {
            throw new Error('Failed to clear chat history');
        }
    } catch (error) {
        console.error('Clear chat error:', error);
        showToast('Failed to clear chat history', 'error');
    }
}

// Thinking dots functions
function showThinkingDots() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message assistant';
    thinkingDiv.id = 'thinking-dots';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const thinkingDots = document.createElement('div');
    thinkingDots.className = 'thinking-dots';
    thinkingDots.innerHTML = `
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
    `;
    
    thinkingDiv.appendChild(avatar);
    thinkingDiv.appendChild(thinkingDots);
    
    // Remove welcome message if it exists
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeThinkingDots() {
    const thinkingDots = document.getElementById('thinking-dots');
    if (thinkingDots) {
        thinkingDots.remove();
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

// Export functions for global access
window.sendMessage = sendMessage;
window.clearChat = clearChat;
