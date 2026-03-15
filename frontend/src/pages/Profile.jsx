import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'

async function apiRequest(path, method, body) {
  const token = localStorage.getItem('bm_token')
  const res = await fetch('/api' + path, {
    method, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
  return data
}

function Toast({ msg, type, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div className={`toast toast-${type}`}>{msg}</div>
}

export default function Profile() {
  const { user, logout, setUser } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const [info, setInfo] = useState({ name: user?.name || '', email: user?.email || '' })
  const [pass, setPass] = useState({ current: '', new: '', confirm: '' })

  const setI = k => e => setInfo(f => ({ ...f, [k]: e.target.value }))
  const setP = k => e => setPass(f => ({ ...f, [k]: e.target.value }))

  const saveInfo = async (e) => {
    e.preventDefault()
    if (!info.name.trim()) return setToast({ msg:'Введите имя', type:'error' })
    setSavingInfo(true)
    try {
      const updated = await apiRequest('/auth/profile', 'PUT', { name: info.name, email: info.email })
      setUser(updated)
      setToast({ msg:'Профиль обновлён ✓', type:'success' })
    } catch(err) {
      setToast({ msg: err.message, type:'error' })
    } finally { setSavingInfo(false) }
  }

  const savePass = async (e) => {
    e.preventDefault()
    if (pass.new.length < 6) return setToast({ msg:'Пароль минимум 6 символов', type:'error' })
    if (pass.new !== pass.confirm) return setToast({ msg:'Пароли не совпадают', type:'error' })
    setSavingPass(true)
    try {
      await apiRequest('/auth/password', 'PUT', { current_password: pass.current, new_password: pass.new })
      setPass({ current:'', new:'', confirm:'' })
      setToast({ msg:'Пароль изменён ✓', type:'success' })
    } catch(err) {
      setToast({ msg: err.message, type:'error' })
    } finally { setSavingPass(false) }
  }

  const PLAN_NAMES = { trial:'Пробный', free:'Бесплатный', starter:'Старт', business:'Бизнес', pro:'Про' }
  const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : 0

  return (
    <div style={{ padding:32, maxWidth:600 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <button onClick={() => navigate('/')} style={{ color:'var(--c-muted)', fontSize:13, marginBottom:8, cursor:'pointer', background:'none', border:'none', fontFamily:'var(--font)' }}>← Назад</button>
          <h1 className="page-title">Профиль</h1>
        </div>
      </div>

      {/* Avatar + plan */}
      <div className="card" style={{ marginBottom:16, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{
          width:56, height:56, borderRadius:'50%', background:'var(--c-purple)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, fontWeight:700, color:'#fff', flexShrink:0,
        }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:600 }}>{user?.name}</div>
          <div style={{ fontSize:13, color:'var(--c-muted)' }}>{user?.email}</div>
          <div style={{ marginTop:6, display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ background:'var(--c-purple-dim)', color:'var(--c-purple)', padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:500 }}>
              {PLAN_NAMES[user?.plan] || user?.plan}
              {user?.plan === 'trial' && trialDays > 0 && ` · ${trialDays} дн.`}
            </span>
            <button className="btn btn-sm" onClick={() => navigate('/pricing')} style={{ fontSize:11 }}>
              Сменить тариф
            </button>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Личные данные</div>
        <form onSubmit={saveInfo}>
          <div className="field-label">Имя</div>
          <input type="text" value={info.name} onChange={setI('name')} placeholder="Ваше имя" required />
          <div className="field-label">Email</div>
          <input type="email" value={info.email} onChange={setI('email')} placeholder="your@email.com" required />
          <button type="submit" className="btn btn-primary" style={{ marginTop:16 }} disabled={savingInfo}>
            {savingInfo ? <span className="spinner" style={{width:14,height:14}} /> : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Изменить пароль</div>
        <form onSubmit={savePass}>
          <div className="field-label">Текущий пароль</div>
          <input type="password" value={pass.current} onChange={setP('current')} placeholder="••••••••" required />
          <div className="field-label">Новый пароль</div>
          <input type="password" value={pass.new} onChange={setP('new')} placeholder="Минимум 6 символов" required minLength={6} />
          <div className="field-label">Повторите новый пароль</div>
          <input type="password" value={pass.confirm} onChange={setP('confirm')} placeholder="Повторите пароль" required />
          <button type="submit" className="btn btn-primary" style={{ marginTop:16 }} disabled={savingPass}>
            {savingPass ? <span className="spinner" style={{width:14,height:14}} /> : 'Сменить пароль'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor:'var(--c-red-dim)' }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:8, color:'var(--c-red)' }}>Опасная зона</div>
        <p style={{ fontSize:13, color:'var(--c-muted)', marginBottom:16 }}>
          Выход из аккаунта на всех устройствах
        </p>
        <button className="btn btn-danger" onClick={() => { logout(); navigate('/') }}>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}
