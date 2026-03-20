import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'

const NavItem = ({ to, icon, label, end, onClick }) => (
  <NavLink to={to} end={end} onClick={onClick} style={({ isActive }) => ({
    display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
    fontSize:13, color: isActive ? 'var(--c-text)' : 'var(--c-muted)',
    borderRadius:8, margin:'1px 8px', textDecoration:'none',
    backgroundColor: isActive ? 'var(--c-purple-dim)' : 'transparent',
    borderLeft: isActive ? '2px solid var(--c-purple)' : '2px solid transparent',
    fontWeight: isActive ? 500 : 400, transition:'all 0.15s',
  })}>
    <span style={{ fontSize:15 }}>{icon}</span>{label}
  </NavLink>
)

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const plan = user?.plan || 'trial'
  const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : 0
  const planLabels = { trial:`Пробный ${trialDays}д`, free:'Бесплатный', starter:'Старт', business:'Бизнес', pro:'Про' }

  const close = () => setOpen(false)

  const sidebarContent = (
    <>
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--c-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>Б</div>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>БотМастер</div>
            <div style={{ fontSize:11, color:'var(--c-muted)' }}>AI-платформа</div>
          </div>
        </div>
        <button onClick={close} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:'var(--c-muted)', fontSize:20, lineHeight:1 }} className="sidebar-close">✕</button>
      </div>

      <nav style={{ flex:1, paddingTop:10, overflowY:'auto' }}>
        <div style={{ fontSize:10, color:'var(--c-hint)', padding:'8px 22px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Главное</div>
        <NavItem to="/dashboard" end icon="⊞" label="Дашборд" onClick={close} />

        <div style={{ fontSize:10, color:'var(--c-hint)', padding:'14px 22px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Боты</div>
        <NavItem to="/onboarding" icon="🧙" label="Мастер создания" onClick={close} />
        <NavItem to="/bots/new" icon="＋" label="Создать бота" onClick={close} />

        <div style={{ fontSize:10, color:'var(--c-hint)', padding:'14px 22px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Аккаунт</div>
        <NavItem to="/pricing" icon="💎" label="Тарифы" onClick={close} />
        <NavItem to="/profile" icon="👤" label="Профиль" onClick={close} />
        <NavItem to="/docs" icon="📖" label="Документация" onClick={close} />
      </nav>

      {plan === 'trial' && trialDays <= 3 && trialDays > 0 && (
        <div style={{ margin:'0 8px 8px', background:'var(--c-amber-dim)', border:'1px solid var(--c-amber)', borderRadius:8, padding:'10px 12px', fontSize:12 }}>
          <div style={{ fontWeight:500, color:'var(--c-amber)', marginBottom:4 }}>⚠️ Пробный период</div>
          <div style={{ color:'var(--c-muted)' }}>Осталось {trialDays} дн.</div>
          <NavLink to="/pricing" onClick={close} style={{ color:'var(--c-purple)', fontSize:12 }}>Выбрать тариф →</NavLink>
        </div>
      )}

      <div style={{ padding:'10px 8px', borderTop:'1px solid var(--c-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:6 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--c-purple-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'var(--c-purple)', flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <NavLink to="/pricing" onClick={close} style={{ textDecoration:'none' }}>
              <span style={{ background:'var(--c-purple-dim)', color:'var(--c-purple)', padding:'1px 6px', borderRadius:4, fontSize:10 }}>
                {planLabels[plan] || plan}
              </span>
            </NavLink>
          </div>
        </div>
        <button onClick={() => { logout(); close() }} className="btn btn-sm" style={{ width:'100%', justifyContent:'center', color:'var(--c-muted)' }}>
          Выйти
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button onClick={() => setOpen(true)} style={{
        display:'none', position:'fixed', top:12, left:12, zIndex:1000,
        width:40, height:40, borderRadius:10, background:'var(--c-surface)',
        border:'1px solid var(--c-border)', cursor:'pointer', fontSize:18,
        alignItems:'center', justifyContent:'center',
      }} className="hamburger">☰</button>

      {/* Mobile overlay */}
      {open && (
        <div onClick={close} style={{
          display:'none', position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          zIndex:998,
        }} className="sidebar-overlay" />
      )}

      {/* Sidebar */}
      <aside className={`sidebar-main ${open ? 'sidebar-open' : ''}`} style={{
        width:220, flexShrink:0, background:'var(--c-surface)',
        borderRight:'1px solid var(--c-border)', display:'flex',
        flexDirection:'column', height:'100vh',
      }}>
        {sidebarContent}
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .hamburger { display: flex !important; }
          .sidebar-overlay { display: block !important; }
          .sidebar-main {
            position: fixed !important; left: -220px; top: 0; z-index: 999;
            transition: left .25s ease;
          }
          .sidebar-main.sidebar-open { left: 0 !important; }
          .sidebar-close { display: flex !important; }
        }
      `}</style>
    </>
  )
}
