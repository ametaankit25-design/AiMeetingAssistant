#!/bin/bash

# AI Meeting Assistant - Quick Start Script
# This script sets up and starts both frontend and backend

set -e

echo "🚀 Starting AI Meeting Assistant Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama is not installed. Please install from https://ollama.ai"
    echo "After installation, run: ollama pull llama3.2"
    exit 1
fi

# Setup Backend
echo "📦 Setting up backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
cd ..

# Setup Python Virtual Environment
echo "🐍 Setting up Python environment..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Install Python dependencies
echo "Installing Python packages..."
pip install --upgrade pip --quiet
pip install transformers librosa numpy torch --quiet

# Setup Frontend
echo "⚛️  Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
cd ..

# Check if Ollama model is downloaded
echo "🤖 Checking Ollama model..."
if ! ollama list | grep -q "llama3.2"; then
    echo "Downloading llama3.2 model (this may take a few minutes)..."
    ollama pull llama3.2
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo "Terminal 3 (Ollama - if not already running):"
echo "  ollama serve"
echo ""
echo "🌐 Frontend will be at: http://localhost:5173"
echo "🔧 Backend will be at: http://localhost:5000"
echo ""
