export default function NavBar() {
  return (
    <nav className="relative z-10 flex flex-row items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
      {/* Logo */}
      <a 
        href="#" 
        className="text-3xl tracking-tight text-foreground select-none hover:opacity-90 transition-opacity"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        meetAi
      </a>
    </nav>
  )
}
