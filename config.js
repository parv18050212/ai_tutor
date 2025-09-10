// Configuration file for the AI Physics Tutor Frontend
// Update these values with your actual credentials

// Configuration object
const APP_CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://jwwrgmdsugdroriydkpf.supabase.co', // Replace with your actual Supabase project URL
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3d3JnbWRzdWdkcm9yaXlka3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDI4NTMsImV4cCI6MjA3MTk3ODg1M30.4fVvO_XSg3DJBFAKV51IfbldOmltl1gcyNdnNqlYkPs', // Replace with your actual Supabase anon key (not service_role)
    
    // API Configuration
    API_BASE_URL: 'http://localhost:8000', // Your FastAPI backend URL
    
    // App Configuration
    APP_NAME: 'AI Physics Tutor',
    APP_VERSION: '1.0.0',
    
    // Chat Configuration
    MAX_MESSAGE_LENGTH: 1000,
    MAX_CHAT_HISTORY: 50,
    
    // UI Configuration
    TOAST_DURATION: 5000, // milliseconds
    LOADING_TIMEOUT: 30000, // milliseconds
};

// Make config available globally
window.CONFIG = APP_CONFIG;
