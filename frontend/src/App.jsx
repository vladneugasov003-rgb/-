import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { authAPI } from './api/index.js'
import Landing from './pages/Landing.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Constructor from './pages/Constructor.jsx'
import ChatPreview from './pages/ChatPreview.jsx'
import Analytics from './pages/Analytics.jsx'
import Pricing from './pages/Pricing.jsx'

export const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function AppLayout() {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar />
      <main style={{ flex:1, overflow:'auto', background:'var(--c-bg)' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/bots/new" element={<Constructor />} />
          <Route path="/bots/:id/edit" element={<Constructor />} />
          <Route path="/bots/:id/chat" element={<ChatPreview />} />
          <Route path="/bots/:id/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bm_token')
    if (!token) { setLoading(false); return }
    authAPI.me().then(u => { setUser(u); setLoading(false) }).catch(() => {
      localStorage.removeItem('bm_token'); setLoading(false)
    })
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('bm_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('bm_token')
    setUser(null)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <AuthCtx.Provider value={{ user, login, logout, setUser }}>
      <Routes>
        <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={!user ? <AuthPage mode="login" /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <AuthPage mode="register" /> : <Navigate to="/dashboard" />} />
        <Route path="/*" element={user ? <AppLayout /> : <Navigate to="/" />} />
      </Routes>
    </AuthCtx.Provider>
  )
}
