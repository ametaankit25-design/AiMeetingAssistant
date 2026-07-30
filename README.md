# AI Meeting Assistant

An intelligent meeting assistant that converts audio recordings into structured summaries and actionable tasks using Whisper for speech-to-text and LLaMA 3.2 for natural language processing.

## Features

- 🎤 **Audio Recording**: Record meetings directly in the browser
- 📁 **File Upload**: Support for WAV, MP3, M4A, OGG, and more
- 🎯 **Speech-to-Text**: Powered by OpenAI's Whisper model
- ✨ **Transcript Cleaning**: AI-powered cleanup using LLaMA 3.2
- 📋 **Meeting Minutes**: Automatic generation of summaries and action items
- 🎨 **Modern UI**: Beautiful glass-morphic design with Tailwind CSS

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS 4 for styling
- shadcn/ui components
- Lucide React icons

### Backend
- Node.js with Express
- Python with Whisper (transformers)
- Ollama with LLaMA 3.2
- Multer for file uploads

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Ollama installed and running
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ametaankit25-design/AiMeetingAssistant.git
cd AiMeetingAssistant
```

### 2. Set Up Backend

```bash
cd backend
npm install
cd ..
```

### 3. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install transformers librosa numpy torch
```

### 4. Set Up Frontend

```bash
cd frontend
npm install
cd ..
```

### 5. Install and Start Ollama

```bash
# Install Ollama from https://ollama.ai

# Pull the LLaMA 3.2 model
ollama pull llama3.2

# Start Ollama server (in a separate terminal)
ollama serve
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Production Build

### Frontend
```bash
cd frontend
npm run build
```

### Backend
```bash
cd backend
npm start
```

## Deployment to AWS Amplify

### Prerequisites
- AWS Account
- GitHub repository with your code
- AWS Amplify CLI (optional)

### Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Set Up AWS Amplify:**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Select the `main` branch

3. **Configure Build Settings:**
   - Amplify will auto-detect the `amplify.yml` file
   - Set environment variables if needed:
     - `OLLAMA_URL` (if using external Ollama service)
     - `PORT` for backend (default: 5000)

4. **Deploy:**
   - Click "Save and deploy"
   - Wait for the build to complete

### Important Notes for Amplify

- **Backend**: You'll need to configure a separate backend hosting solution (EC2, ECS, Lambda) as Amplify primarily hosts static frontends
- **Ollama**: Must be running on a server accessible to your backend
- **Python Dependencies**: Ensure the build environment has sufficient resources for PyTorch and Transformers

### Alternative Backend Deployment

For the backend, consider:
- **AWS EC2**: Run Node.js + Python + Ollama on a single instance
- **AWS Lambda**: Serverless functions (requires containerization for Python deps)
- **AWS ECS/Fargate**: Docker container deployment
- **AWS Elastic Beanstalk**: Easy Node.js deployment

## API Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### `POST /api/process-audio`
Upload and process audio file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `audio` field with audio file

**Response:**
```json
{
  "rawTranscript": "...",
  "cleanedTranscript": "...",
  "meetingMinutes": "..."
}
```

## Project Structure

```
.
├── backend/
│   ├── routes/
│   │   └── process.js          # Audio processing route
│   ├── services/
│   │   └── ollama.js            # Ollama service integration
│   ├── uploads/                 # Temporary audio uploads
│   ├── server.js                # Express server
│   ├── whisper_runner.py        # Python Whisper integration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MeetingAssistant.tsx
│   │   │   ├── NavBar.tsx
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── venv/                        # Python virtual environment
├── amplify.yml                  # AWS Amplify build config
└── README.md
```

## Troubleshooting

### Ollama Connection Error
```
Error: Cannot connect to Ollama at http://127.0.0.1:11434/api/generate
```
**Solution:** Start Ollama server with `ollama serve`

### Model Not Found Error
```
Error: Ollama model "llama3.2" not found
```
**Solution:** Pull the model with `ollama pull llama3.2`

### Python Dependencies Error
```
ModuleNotFoundError: No module named 'transformers'
```
**Solution:** 
1. Activate virtual environment
2. Run `pip install transformers librosa numpy torch`

### Port Already in Use
```
Error: Port 5000 is already in use
```
**Solution:** 
1. Find and kill the process using port 5000
2. Or change the PORT in `backend/server.js`

## Environment Variables

Create a `.env` file in the backend directory (optional):

```env
PORT=5000
OLLAMA_URL=http://127.0.0.1:11434/api/generate
OLLAMA_MODEL=llama3.2
MAX_FILE_SIZE_MB=100
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- OpenAI Whisper for speech recognition
- Meta's LLaMA for language processing
- Ollama for local LLM deployment
- shadcn/ui for beautiful components

## Support

For issues and questions, please open an issue on GitHub.
