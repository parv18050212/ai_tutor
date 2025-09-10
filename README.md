# AI Physics Tutor - Frontend

A modern, responsive web frontend for the AI Physics Tutor chatbot application. This frontend provides an intuitive interface for students to interact with the Socratic tutoring system for JEE Physics preparation.

## Features

- 🔐 **Secure Authentication** - Supabase-powered user authentication
- 💬 **Real-time Chat Interface** - Modern chat UI with message history
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🎨 **Modern UI/UX** - Beautiful gradient design with smooth animations
- 🔄 **Auto-save Chat History** - Persistent conversation history
- ⚡ **Fast Performance** - Optimized for quick responses
- 🌙 **Accessibility** - WCAG compliant design

## Setup Instructions

### 1. Configure Supabase

1. Update the configuration in `config.js`:
   ```javascript
   const CONFIG = {
       SUPABASE_URL: 'your-supabase-project-url',
       SUPABASE_ANON_KEY: 'your-supabase-anon-key',
       API_BASE_URL: 'http://localhost:8000', // Your FastAPI backend URL
   };
   ```

2. Make sure your Supabase project has the following tables:
   - `chat_history` - for storing conversation history
   - User authentication enabled

### 2. Update Script.js

Replace the placeholder values in `script.js`:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const API_BASE_URL = 'http://localhost:8000';
```

### 3. Start the Backend

Make sure your FastAPI backend is running:
```bash
cd /path/to/your/backend
uvicorn main:app --reload
```

### 4. Serve the Frontend

You can serve the frontend in several ways:

#### Option 1: Simple HTTP Server (Python)
```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

#### Option 2: Node.js HTTP Server
```bash
npx http-server -p 3000
```

#### Option 3: Live Server (VS Code Extension)
Install the "Live Server" extension in VS Code and right-click on `index.html` → "Open with Live Server"

### 5. Access the Application

Open your browser and navigate to:
- `http://localhost:3000` (if using a local server)
- Or the URL provided by your chosen server

## File Structure

```
frontend/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript functionality and API integration
├── config.js           # Configuration file
└── README.md           # This file
```

## API Integration

The frontend integrates with your FastAPI backend through the following endpoints:

- `POST /api/chat` - Send messages to the AI tutor
- `GET /api/chat/history` - Retrieve chat history (optional)
- `POST /api/chat/clear` - Clear chat history (optional)

## Authentication Flow

1. **Sign Up**: New users can create an account with email and password
2. **Sign In**: Existing users can log in with their credentials
3. **Session Management**: Automatic session handling with Supabase
4. **Protected Routes**: Chat interface only accessible to authenticated users

## Customization

### Styling
- Modify `styles.css` to change colors, fonts, and layout
- The design uses CSS custom properties for easy theming
- Responsive breakpoints: 768px (tablet), 480px (mobile)

### Functionality
- Update `script.js` to modify chat behavior
- Add new features like file uploads, voice messages, etc.
- Customize the welcome message and UI text

### Configuration
- Edit `config.js` for app-wide settings
- Modify API endpoints, timeouts, and limits

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your FastAPI backend has CORS enabled
   - Check that the API_BASE_URL is correct

2. **Authentication Issues**
   - Verify Supabase URL and keys are correct
   - Check that Supabase authentication is properly configured

3. **Chat Not Working**
   - Ensure the FastAPI backend is running
   - Check browser console for error messages
   - Verify the API endpoint URLs

4. **Styling Issues**
   - Clear browser cache
   - Check that all CSS files are loading properly

### Debug Mode

To enable debug logging, add this to your browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the troubleshooting section above
- Review the browser console for error messages
- Ensure all dependencies are properly configured
