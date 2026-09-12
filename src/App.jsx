import React, { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { CelebrationProvider } from './components/CelebrationEffect'
import './styles/global.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

const LoadingFallback = () => (
  <div className="h-screen w-screen bg-void flex items-center justify-center">
    <div className="text-center space-y-3">
      <div className="w-2 h-2 rounded-full bg-gold mx-auto animate-ping" />
      <p className="font-display text-nova/60 tracking-[0.3em] text-xs">POLARIS</p>
    </div>
  </div>
)

const AppContent = () => {
  const { user, loading } = useAuth()

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
