import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './styles/global.css'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="h-screen w-screen bg-void flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-2 h-2 rounded-full bg-gold mx-auto animate-ping" />
        <p className="font-display text-dim tracking-[0.3em] text-xs">POLARIS</p>
      </div>
    </div>
  )

  return user ? <Dashboard /> : <Login />
}

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
)

export default App
