import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'

const NavItem = ({ to, icon, label, end }) => (
  <NavLink to={to} end={end} style={({ isActive }) => ({
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

  const plan = user?.plan || 'trial'
  const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : 0
  const planLabels = { trial:`Пробный ${trialDays}д`, free:'Бесплатный', starter:'Старт', business:'Бизнес', pro:'Про' }

  return (
    <aside style={{ width:220, flexShrink:0, background:'var(--c-surface)', borderRight:'1px solid var(--c-border)', display:'flex', flexDirection:'column', height:'100vh' }}>
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--c-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>Б</div>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>БотМастер</div>
            <div style={{ fontSize:11, color:'var(--c-muted)' }}>AI-платформа</div>
          </div>
        </div>
      </div>

      <nav style={{ flex:1, paddingTop:10, overflowY:'auto' }}>
        <div style={{ fontSize:10, color:'var(--c-hint)', padding:'8px 22px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Главное</div>
        <NavItem to="/dashboard" end icon="⊞" label="Дашборд" />

        <div style={{ fontSize:10, color:'var(--c-hint)', padding:'14px 22px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Боты</div>
        <NavItem to="/onboarding" icon="🧙" label="Мастер создания" />
        <NavItem to="/bots/new" icon="＋" label="Создать бота" />

        <div style={{ fontSize:10, color:'var(--c-hint)', padding:'14px 22px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Аккаунт</div>
        <NavItem to="/pricing" icon="💎" label="Тарифы" />
      </nav>

      {/* Trial warning */}
      {plan === 'trial' && trialDays <= 3 && trialDays > 0 && (
        <div style={{ margin:'0 8px 8px', background:'var(--c-amber-dim)', border:'1px solid var(--c-amber)', borderRadius:8, padding:'10px 12px', fontSize:12 }}>
          <div style={{ fontWeight:500, color:'var(--c-amber)', marginBottom:4 }}>⚠️ Пробный период</div>
          <div style={{ color:'var(--c-muted)' }}>Осталось {trialDays} дн.</div>
          <NavLink to="/pricing" style={{ color:'var(--c-purple)', fontSize:12 }}>Выбрать тариф →</NavLink>
        </div>
      )}

      <div style={{ padding:'10px 8px', borderTop:'1px solid var(--c-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:6 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--c-purple-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'var(--c-purple)', flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <NavLink to="/pricing" style={{ textDecoration:'none' }}>
              <span style={{ background:'var(--c-purple-dim)', color:'var(--c-purple)', padding:'1px 6px', borderRadius:4, fontSize:10 }}>
                {planLabels[plan] || plan}
              </span>
            </NavLink>
          </div>
        </div>
        <button onClick={logout} className="btn btn-sm" style={{ width:'100%', justifyContent:'center', color:'var(--c-muted)' }}>
          Выйти
        </button>
      </div>
    </aside>
  )
}
