import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/index.js'
import { useAuth } from '../App.jsx'

export default function AuthPage({ mode: initialMode = 'login' }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ email:'', password:'', name:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const fn = mode === 'login' ? authAPI.login : authAPI.register
      const { token, user } = await fn(form)
      login(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-bg)' }}>
      <div style={{ width:'100%', maxWidth:400, padding:24 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'#fff', margin:'0 auto 16px', cursor:'pointer' }} onClick={() => navigate('/')}>Б</div>
          <h1 style={{ fontSize:24, fontWeight:600, marginBottom:6 }}>БотМастер</h1>
          <p style={{ color:'var(--c-muted)', fontSize:14 }}>
            {mode === 'login' ? 'Войдите в свой аккаунт' : '14 дней бесплатно — без карты'}
          </p>
        </div>

        <div className="card">
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <div className="field-label">Имя</div>
                <input type="text" placeholder="Владислав" value={form.name} onChange={set('name')} required />
              </>
            )}
            <div className="field-label">Email</div>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            <div className="field-label">Пароль</div>
            <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />

            {error && (
              <div style={{ marginTop:12, padding:'8px 12px', background:'var(--c-red-dim)', color:'var(--c-red)', borderRadius:6, fontSize:13 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:20, padding:'10px' }} disabled={loading}>
              {loading ? <span className="spinner" style={{width:16,height:16}} /> :
               mode === 'login' ? 'Войти' : 'Зарегистрироваться бесплатно'}
            </button>
          </form>

          <div style={{ marginTop:16, textAlign:'center', fontSize:13, color:'var(--c-muted)' }}>
            {mode === 'login' ? (
              <>Нет аккаунта? <button onClick={() => setMode('register')} style={{ color:'var(--c-purple)', cursor:'pointer', background:'none', border:'none', fontSize:13, fontFamily:'var(--font)' }}>Зарегистрироваться</button></>
            ) : (
              <>Уже есть аккаунт? <button onClick={() => setMode('login')} style={{ color:'var(--c-purple)', cursor:'pointer', background:'none', border:'none', fontSize:13, fontFamily:'var(--font)' }}>Войти</button></>
            )}
          </div>
        </div>

        {mode === 'register' && (
          <p style={{ textAlign:'center', fontSize:12, color:'var(--c-hint)', marginTop:16, lineHeight:1.6 }}>
            Регистрируясь, вы получаете 14 дней тарифа «Бизнес» бесплатно.<br />
            Программа «Студенческий стартап» · ФСИ 2026
          </p>
        )}
      </div>
    </div>
  )
}
