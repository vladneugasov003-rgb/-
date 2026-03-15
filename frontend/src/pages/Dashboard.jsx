import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, botsAPI } from '../api/index.js'
import { useAuth } from '../App.jsx'

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div className={`toast toast-${type}`}>{msg}</div>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = () => dashboardAPI.get().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleDelete = async (bot) => {
    if (!confirm(`Удалить бота «${bot.name}»?`)) return
    setDeleting(bot.id)
    try {
      await botsAPI.delete(bot.id)
      setToast({ msg: 'Бот удалён', type: 'success' })
      load()
    } catch (e) {
      setToast({ msg: e.message, type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const NICHES = { 'Beauty & SPA': '💅', Медицина: '🏥', Автосервис: '🔧', Юридия: '⚖️', 'Доставка еды': '🍕', 'Интернет-магазин': '🛍️', Другое: '🤖' }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Добро пожаловать, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--c-muted)', fontSize: 14, marginTop: 4 }}>Дашборд · обновлено только что</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>
          + Создать бота
        </button>
      </div>

      {/* Metrics */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="metric">
          <div className="metric-label">Всего ботов</div>
          <div className="metric-value">{data?.total_bots ?? 0}</div>
          <div className="metric-delta">из 5 на плане Стартап</div>
        </div>
        <div className="metric">
          <div className="metric-label">Диалогов</div>
          <div className="metric-value">{data?.total_conversations ?? 0}</div>
          <div className="metric-delta">за всё время</div>
        </div>
        <div className="metric">
          <div className="metric-label">Сообщений</div>
          <div className="metric-value">{data?.total_messages ?? 0}</div>
          <div className="metric-delta">обработано AI</div>
        </div>
        <div className="metric">
          <div className="metric-label">MRR, ₽</div>
          <div className="metric-value">{(data?.mrr ?? 0).toLocaleString()}</div>
          <div className="metric-delta">расчётная выручка</div>
        </div>
      </div>

      {/* Bot list */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Мои боты</h2>
          <button className="btn btn-sm" onClick={() => navigate('/bots/new')}>+ Добавить</button>
        </div>

        {!data?.bots?.length ? (
          <div style={{ textAlign:'center', padding: '40px 0', color: 'var(--c-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <p style={{ marginBottom: 16 }}>У вас ещё нет ботов</p>
            <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>Создать первого бота</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
            {data.bots.map(bot => (
              <div key={bot.id} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                background:'var(--c-surface2)', borderRadius:10, border:'1px solid var(--c-border)',
              }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%', background:'var(--c-purple-dim)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0,
                }}>
                  {NICHES[bot.niche] || '🤖'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, fontSize:14 }}>{bot.name}</div>
                  <div style={{ fontSize:12, color:'var(--c-muted)' }}>
                    {bot.niche} · {bot.conv_count} диалогов
                  </div>
                </div>
                <span className={`badge badge-${bot.is_active ? 'active' : 'pause'}`}>
                  <span className="badge-dot" />
                  {bot.is_active ? 'Активен' : 'Пауза'}
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm" onClick={() => navigate(`/bots/${bot.id}/chat`)}>💬 Чат</button>
                  <button className="btn btn-sm" onClick={() => navigate(`/bots/${bot.id}/analytics`)}>📊 Аналитика</button>
                  <button className="btn btn-sm" onClick={() => navigate(`/bots/${bot.id}/edit`)}>✏️ Изменить</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bot)} disabled={deleting===bot.id}>
                    {deleting===bot.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
