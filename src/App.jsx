import React, { lazy, Suspense, useState, useEffect } from 'react'
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
  <AuthProvider>
    <CelebrationProvider>
      <AppContent />
    </CelebrationProvider>
  </AuthProvider>
)

export default App
