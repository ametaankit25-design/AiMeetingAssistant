import NavBar from './components/NavBar'
import MeetingAssistant from './components/MeetingAssistant'

export default function App() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col justify-between">
      {/* Fullscreen Loop Video Background (Fixed) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none select-none opacity-40"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* Navigation */}
      <NavBar />

      {/* Main Content Area: Centered AI Meeting Assistant */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full py-8">
        <MeetingAssistant />
      </main>
    </div>
  )
}
