import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { authAPI } from './api/index.js'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Constructor from './pages/Constructor.jsx'
import ChatPreview from './pages/ChatPreview.jsx'
import Analytics from './pages/Analytics.jsx'
import AuthPage from './pages/AuthPage.jsx'

export const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

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
    <AuthCtx.Provider value={{ user, login, logout }}>
      {!user ? (
        <AuthPage />
      ) : (
        <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
          <Sidebar />
          <main style={{ flex:1, overflow:'auto', background:'var(--c-bg)' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bots/new" element={<Constructor />} />
              <Route path="/bots/:id/edit" element={<Constructor />} />
              <Route path="/bots/:id/chat" element={<ChatPreview />} />
              <Route path="/bots/:id/analytics" element={<Analytics />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      )}
    </AuthCtx.Provider>
  )
}
