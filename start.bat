@echo off
REM AI Meeting Assistant - Quick Start Script for Windows
REM This script sets up and starts both frontend and backend

echo 🚀 Starting AI Meeting Assistant Setup...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    exit /b 1
)

REM Check if Ollama is installed
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Ollama is not installed. Please install from https://ollama.ai
    echo After installation, run: ollama pull llama3.2
    exit /b 1
)

REM Setup Backend
echo 📦 Setting up backend...
cd backend
if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm install
)
cd ..

REM Setup Python Virtual Environment
echo 🐍 Setting up Python environment...
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python packages...
pip install --upgrade pip --quiet
pip install transformers librosa numpy torch --quiet

REM Setup Frontend
echo ⚛️  Setting up frontend...
cd frontend
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
)
cd ..

REM Check if Ollama model is downloaded
echo 🤖 Checking Ollama model...
ollama list | findstr "llama3.2" >nul
if %errorlevel% neq 0 (
    echo Downloading llama3.2 model (this may take a few minutes)...
    ollama pull llama3.2
)

echo.
echo ✅ Setup complete!
echo.
echo 📝 To start the application:
echo.
echo Terminal 1 (Backend):
echo   cd backend ^&^& npm run dev
echo.
echo Terminal 2 (Frontend):
echo   cd frontend ^&^& npm run dev
echo.
echo Terminal 3 (Ollama - if not already running):
echo   ollama serve
echo.
echo 🌐 Frontend will be at: http://localhost:5173
echo 🔧 Backend will be at: http://localhost:5000
echo.
pause
