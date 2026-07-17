import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Results {
  rawTranscript: string
  cleanedTranscript: string
  meetingMinutes: string
}

export default function MeetingAssistant() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  // ── Drag & Drop Handlers ──────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
    }
  }

  // ── File Change Handler ───────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
    }
  }

  // ── Microphone Recording ──────────────────────────────────
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          const recordedFile = new File([audioBlob], 'recorded-meeting.wav', {
            type: 'audio/wav',
          })
          setAudioFile(recordedFile)
          stream.getTracks().forEach((track) => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error('Microphone access denied:', err)
        alert('Microphone access is required to record audio.')
      }
    }
  }

  // ── Process Audio ─────────────────────────────────────────
  const handleProcess = async () => {
    if (!audioFile) return

    setIsProcessing(true)
    setCurrentStep(1)
    setCompletedSteps(0)
    setError(null)
    setResults(null)
    clearTimers()

    // Simulate step progress while backend processes
    const t1 = setTimeout(() => {
      setCompletedSteps(1)
      setCurrentStep(2)
    }, 15000) // Whisper can take ~15s

    const t2 = setTimeout(() => {
      setCompletedSteps(2)
      setCurrentStep(3)
    }, 45000) // Ollama cleaning can take ~30s more

    timersRef.current = [t1, t2] as unknown as number[]

    // Abort controller with 10 minute timeout for the entire pipeline
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Server error (${response.status})`)
      }

      const data = await response.json()
      clearTimers()
      clearTimeout(timeoutId)
      setCompletedSteps(3)
      setCurrentStep(0)
      setResults(data)
    } catch (err: any) {
      clearTimers()
      clearTimeout(timeoutId)
      setCurrentStep(0)
      setCompletedSteps(0)

      // Provide user-friendly error messages
      let message = err.message || 'An unexpected error occurred.'
      if (err.name === 'AbortError') {
        message = 'Request timed out after 10 minutes. Try a shorter audio file.'
      } else if (message === 'Failed to fetch' || message.includes('NetworkError')) {
        message = 'Cannot connect to the backend server. Please make sure the backend is running on port 5000.'
      }
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearFile = () => {
    setAudioFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12 relative z-10">
      <div className="text-center mb-10">
        <h2 
          className="text-4xl font-normal tracking-tight text-white mb-2 font-display"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          AI Meeting Assistant
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Convert audio meetings into neat, structured summaries and actionable tasks.
        </p>
      </div>

      {/* ── File Uploader using shadcn/ui Card ── */}
      <Card className="liquid-glass rounded-2xl border-none backdrop-blur-md">
        <CardContent className="p-8">
          <div
            className={`border border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragging 
                ? 'border-white/50 bg-white/5' 
                : 'border-white/10 hover:border-white/20'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isRecording && fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-4 animate-bounce">🎙️</div>
            <h3 className="text-lg font-medium text-white mb-1">
              {audioFile ? 'File Selected' : 'Drop your audio here'}
            </h3>
            <p className="text-xs text-neutral-400 mb-6 font-light">
              Supports WAV, MP3, M4A, OGG
            </p>

            <input
              type="file"
              accept="audio/*"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isRecording}
                className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors"
              >
                📂 Browse Files
              </Button>
              <span className="text-xs text-neutral-500">or</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`rounded-full border flex items-center gap-2 transition-all duration-300 ${
                  isRecording
                    ? 'border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Stop Recording
                  </>
                ) : (
                  '🎤 Record Audio'
                )}
              </Button>
            </div>
          </div>

          {audioFile && (
            <div className="flex items-center justify-between mt-4 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-neutral-300">
              <span className="truncate">🎵 {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              <button
                onClick={clearFile}
                disabled={isProcessing}
                className="text-neutral-500 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          <Button
            onClick={handleProcess}
            disabled={!audioFile || isProcessing}
            className="w-full mt-6 py-6 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
          >
            {isProcessing ? '⏳ Processing Meeting Pipeline...' : '⚡ Start AI Processing'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Step Indicator ── */}
      {(currentStep > 0 || completedSteps > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {[
            { icon: '🎤', label: 'Transcribing' },
            { icon: '✨', label: 'Cleaning' },
            { icon: '📋', label: 'Summarizing' }
          ].map((step, i) => {
            const isActive = i === currentStep - 1
            const isDone = i < completedSteps

            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium transition-all duration-500 ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : isActive
                      ? 'border-white/30 bg-white/5 text-white animate-pulse'
                      : 'border-white/5 bg-transparent text-neutral-500'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                    isDone ? 'bg-emerald-500 text-black' : 'bg-white/10 text-neutral-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                </div>
                {i < 2 && (
                  <div className={`w-6 h-[1px] ${isDone ? 'bg-emerald-500/50' : 'bg-white/5'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 text-center">
          ❌ {error}
        </div>
      )}

      {/* ── Results using shadcn/ui Card ── */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* Raw Transcript */}
          <Card className="liquid-glass rounded-2xl border-none backdrop-blur-md flex flex-col h-[400px]">
            <CardHeader className="border-b border-white/5 px-6 py-4 flex flex-row items-center gap-2 space-y-0">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">📄</span>
              <CardTitle className="text-sm font-semibold text-white">Raw Transcript (Whisper)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {results.rawTranscript}
            </CardContent>
          </Card>

          {/* Cleaned Transcript */}
          <Card className="liquid-glass rounded-2xl border-none backdrop-blur-md flex flex-col h-[400px]">
            <CardHeader className="border-b border-white/5 px-6 py-4 flex flex-row items-center gap-2 space-y-0">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">✨</span>
              <CardTitle className="text-sm font-semibold text-white">Cleaned Transcript (LLaMA 3.2)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {results.cleanedTranscript}
            </CardContent>
          </Card>

          {/* Meeting Minutes */}
          <Card className="liquid-glass rounded-2xl border-none backdrop-blur-md flex flex-col md:col-span-2 h-[450px]">
            <CardHeader className="border-b border-white/5 px-6 py-4 flex flex-row items-center gap-2 space-y-0">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">📋</span>
              <CardTitle className="text-sm font-semibold text-white">Meeting Minutes & Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {results.meetingMinutes}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
