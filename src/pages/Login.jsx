import { useAuth } from '../hooks/useAuth'
import Starfield from '../components/layout/Starfield'
import { Star } from 'lucide-react'

const Login = () => {
  const { signInWithGoogle, signInAsGuest } = useAuth()

  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden">
      <Starfield />

      <div className="relative z-10 text-center space-y-8 animate-float">
        {/* Logo */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
            <Star className="w-8 h-8 text-gold animate-pulse-slow" fill="currentColor" />
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
          </div>
          <h1 className="font-display text-5xl tracking-[0.3em] text-starlight">POLARIS</h1>
          <p className="font-body text-dim text-sm tracking-wider italic">your north star</p>
        </div>

        {/* Tagline */}
        <div className="glass border border-blue-900/20 rounded-xl px-8 py-5 max-w-sm mx-auto">
          <p className="font-body text-sm text-starlight/70 leading-relaxed">
            A personal command centre for<br />
            <span className="text-aurora">Anindita Sarker Aloka</span>
          </p>
          <p className="font-mono text-xs text-dim mt-2">Engineer. Designer. Inventor.</p>
        </div>

        {/* Sign in */}
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button
            onClick={signInWithGoogle}
            className="group flex items-center justify-center gap-3 w-full px-8 py-3 glass border border-pulsar/30 rounded-xl text-starlight text-sm font-body hover:border-pulsar/60 hover:bg-pulsar/10 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
            <span className="text-dim group-hover:text-starlight transition-colors text-xs font-mono ml-1">→</span>
          </button>

          <button
            onClick={signInAsGuest}
            className="group flex items-center justify-center gap-3 w-full px-8 py-2.5 glass border border-gold/20 rounded-xl text-gold text-xs font-display tracking-wider hover:border-gold/50 hover:bg-gold/5 transition-all"
          >
            <span>✨</span> Try as Guest / Demo
            <span className="text-dim group-hover:text-gold transition-colors text-xs font-mono ml-1">→</span>
          </button>
        </div>

        <p className="text-xs text-dim/40 font-mono">private · encrypted · yours</p>
      </div>
    </div>
  )
}

export default Login
