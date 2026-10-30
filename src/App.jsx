import React, { lazy, Suspense, useState, useEffect, Component } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { CelebrationProvider } from './components/CelebrationEffect'
import './styles/global.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))

const LoadingFallback = () => (
  <div className="h-screen w-screen bg-void flex items-center justify-center">
    <div className="text-center space-y-3">
      <div className="w-2 h-2 rounded-full bg-gold mx-auto animate-ping" />
      <p className="font-display text-nova/60 tracking-[0.3em] text-xs">POLARIS</p>
    </div>
  </div>
)

class GlobalChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[App] Chunk error caught:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-void flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-3 h-3 rounded-full bg-gold mx-auto animate-ping" />
          <h2 className="font-display text-base font-bold text-starlight">Updating Polaris App...</h2>
          <p className="text-xs text-nova/60 max-w-sm font-body">
            An updated version was deployed. Click below to load the latest features.
          </p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl transition-all cursor-pointer"
          >
            Reload Polaris
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const getRouteFromLocation = () => {
  const hash = (typeof window !== 'undefined' && window.location.hash ? window.location.hash : '').toLowerCase()
  const path = (typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '').toLowerCase()

  if (
    hash === '#/privacy' ||
    hash === '#privacy' ||
    path.endsWith('/privacy') ||
    path.endsWith('/privacy.html')
  ) {
    return 'privacy'
  }
  if (
    hash === '#/terms' ||
    hash === '#terms' ||
    path.endsWith('/terms') ||
    path.endsWith('/terms.html')
  ) {
    return 'terms'
  }
  return null
}

const AppContent = () => {
  const { user, loading } = useAuth()
  const [currentRoute, setCurrentRoute] = useState(getRouteFromLocation)

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getRouteFromLocation())
    }
    window.addEventListener('hashchange', handleLocationChange)
    window.addEventListener('popstate', handleLocationChange)
    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  const handleBackToApp = () => {
    if (window.location.hash) {
      window.location.hash = ''
    }
    if (
      window.location.pathname.endsWith('/privacy') ||
      window.location.pathname.endsWith('/privacy.html') ||
      window.location.pathname.endsWith('/terms') ||
      window.location.pathname.endsWith('/terms.html')
    ) {
      window.history.pushState({}, '', '/asa.polaris/')
    }
    setCurrentRoute(null)
  }

  if (currentRoute === 'privacy') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PrivacyPolicy onBack={handleBackToApp} />
      </Suspense>
    )
  }

  if (currentRoute === 'terms') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TermsOfService onBack={handleBackToApp} />
      </Suspense>
    )
  }

  if (loading) return <LoadingFallback />

  return (
    <Suspense fallback={<LoadingFallback />}>
      {user ? <Dashboard /> : <Login />}
    </Suspense>
  )
}

const App = () => (
  <GlobalChunkErrorBoundary>
    <AuthProvider>
      <CelebrationProvider>
        <AppContent />
      </CelebrationProvider>
    </AuthProvider>
  </GlobalChunkErrorBoundary>
)

export default App
