#!/usr/bin/env python3
"""
Startup script for AI Physics Tutor
This script helps you start both the backend and frontend servers.
"""

import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

def check_requirements():
    """Check if required packages are installed."""
    try:
        import fastapi
        import uvicorn
        import supabase
        import google.generativeai
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def start_backend():
    """Start the FastAPI backend server."""
    print("🚀 Starting FastAPI backend server...")
    try:
        # Start the backend server
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
        print("✅ Backend server started on http://localhost:8000")
        return process
    except Exception as e:
        print(f"❌ Failed to start backend server: {e}")
        return None

def start_frontend():
    """Start a simple HTTP server for the frontend."""
    print("🌐 Starting frontend server...")
    try:
        # Start a simple HTTP server
        process = subprocess.Popen([
            sys.executable, "-m", "http.server", 
            "3000"
        ])
        print("✅ Frontend server started on http://localhost:3000")
        return process
    except Exception as e:
        print(f"❌ Failed to start frontend server: {e}")
        return None

def main():
    """Main function to start both servers."""
    print("🎓 AI Physics Tutor - Starting Application")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("main.py").exists():
        print("❌ main.py not found. Please run this script from the project root directory.")
        return
    
    # Check requirements
    if not check_requirements():
        return
    
    # Check for environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        print("⚠️  Warning: GOOGLE_API_KEY not found in environment variables")
        print("   Please create a .env file with your Google API key")
    
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        print("⚠️  Warning: Supabase credentials not found in environment variables")
        print("   Please create a .env file with your Supabase credentials")
    
    print("\n📋 Configuration Checklist:")
    print("1. ✅ Update config.js with your Supabase URL and anon key")
    print("2. ✅ Update script.js with your Supabase credentials")
    print("3. ✅ Ensure your .env file has all required variables")
    print("4. ✅ Make sure your Supabase database is set up correctly")
    
    input("\nPress Enter to continue...")
    
    # Start servers
    backend_process = start_backend()
    if not backend_process:
        return
    
    time.sleep(2)  # Give backend time to start
    
    frontend_process = start_frontend()
    if not frontend_process:
        backend_process.terminate()
        return
    
    print("\n🎉 Both servers are running!")
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    
    # Open browser
    try:
        webbrowser.open("http://localhost:3000")
        print("🌐 Opening browser...")
    except:
        print("💡 Please manually open http://localhost:3000 in your browser")
    
    print("\n⏹️  Press Ctrl+C to stop both servers")
    
    try:
        # Wait for user to stop
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Servers stopped successfully")

if __name__ == "__main__":
    main()
