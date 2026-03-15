import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'

const NavItem = ({ to, icon, label, end }) => (
  <NavLink to={to} end={end} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
    fontSize: 13, color: isActive ? 'var(--c-text)' : 'var(--c-muted)',
    borderRadius: 8, margin: '1px 8px', textDecoration: 'none',
    background: 'transparent', transition: 'all 0.15s',
    borderLeft: isActive ? '2px solid var(--c-purple)' : '2px solid transparent',
    paddingLeft: isActive ? 14 : 14,
    backgroundColor: isActive ? 'var(--c-purple-dim)' : 'transparent',
    fontWeight: isActive ? 500 : 400,
  })}>
    <span style={{ fontSize: 16 }}>{icon}</span>
    {label}
  </NavLink>
)

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: 'var(--c-surface)',
      borderRight: '1px solid var(--c-border)', display: 'flex',
      flexDirection: 'column', height: '100vh',
    }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--c-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff',
          }}>Б</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>БотМастер</div>
            <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>AI-платформа</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--c-hint)', padding: '0 24px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Главное
        </div>
        <NavItem to="/" end icon="⊞" label="Дашборд" />

        <div style={{ fontSize: 10, color: 'var(--c-hint)', padding: '16px 24px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Инструменты
        </div>
        <NavItem to="/bots/new" icon="＋" label="Создать бота" />
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--c-border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          borderRadius: 8, marginBottom: 6,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'var(--c-purple-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--c-purple)',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>
              <span style={{ background: 'var(--c-purple-dim)', color: 'var(--c-purple)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                Стартап
              </span>
            </div>
          </div>
        </div>
        <button onClick={logout} className="btn btn-sm" style={{ width: '100%', justifyContent: 'center', color: 'var(--c-muted)' }}>
          Выйти
        </button>
      </div>
    </aside>
  )
}
