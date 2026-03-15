import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { analyticsAPI, botsAPI } from '../api/index.js'

function BarChart({ data, maxVal, color = 'var(--c-purple)' }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80 }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{
            width:'100%', borderRadius:'2px 2px 0 0',
            height: maxVal > 0 ? `${(d.value / maxVal) * 100}%` : '4%',
            background: d.value > 0 ? color : 'var(--c-border)',
            minHeight: 4, transition: 'height 0.3s',
          }} />
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bot, setBot] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([botsAPI.get(id), analyticsAPI.get(id)])
      .then(([b, a]) => { setBot(b); setData(a); setLoading(false) })
      .catch(() => navigate('/'))
  }, [id])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div className="spinner" />
    </div>
  )

  const hourlyMax = Math.max(...(data?.hourly || []).map(h => h.count), 1)

  const statusLabels = { active:'Активен', resolved:'Решён', transferred:'Передан' }

  return (
    <div style={{ padding:32, maxWidth:1000 }}>
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/')} style={{ color:'var(--c-muted)', fontSize:13, marginBottom:8, cursor:'pointer', background:'none', border:'none', fontFamily:'var(--font)' }}>
            ← Назад
          </button>
          <h1 className="page-title">Аналитика · {bot?.name}</h1>
        </div>
        <button className="btn" onClick={() => navigate(`/bots/${id}/chat`)}>💬 Тест чат</button>
      </div>

      {/* Key metrics */}
      <div className="grid-4" style={{ marginBottom:24 }}>
        <div className="metric">
          <div className="metric-label">Всего диалогов</div>
          <div className="metric-value">{data?.total_conversations ?? 0}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Всего сообщений</div>
          <div className="metric-value">{data?.total_messages ?? 0}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Ср. длина диалога</div>
          <div className="metric-value">{data?.avg_messages_per_conv ?? 0}</div>
          <div className="metric-delta">сообщений</div>
        </div>
        <div className="metric">
          <div className="metric-label">Активность</div>
          <div className="metric-value">
            {data?.total_conversations > 0 ? '🟢' : '⚪'}
          </div>
          <div className="metric-delta" style={{ color: data?.total_conversations > 0 ? 'var(--c-green)' : 'var(--c-muted)' }}>
            {data?.total_conversations > 0 ? 'есть данные' : 'нет диалогов'}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:24 }}>
        {/* Hourly activity */}
        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--c-muted)' }}>Активность по часам суток</div>
          <BarChart
            data={(data?.hourly || []).map(h => ({ label:`${h.hour}:00`, value: h.count }))}
            maxVal={hourlyMax}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--c-hint)', marginTop:6 }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
          {data?.total_conversations === 0 && (
            <p style={{ fontSize:12, color:'var(--c-muted)', textAlign:'center', marginTop:12 }}>
              Начните тестировать бота в чате — данные появятся здесь
            </p>
          )}
        </div>

        {/* Status distribution */}
        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--c-muted)' }}>Статусы диалогов</div>
          {data?.by_status?.length ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {data.by_status.map(s => {
                const total = data.by_status.reduce((a,b) => a+b.count, 0)
                const pct = total > 0 ? Math.round(s.count / total * 100) : 0
                return (
                  <div key={s.status}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
                      <span>{statusLabels[s.status] || s.status}</span>
                      <span style={{ color:'var(--c-muted)' }}>{s.count} ({pct}%)</span>
                    </div>
                    <div style={{ height:6, background:'var(--c-surface2)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'var(--c-purple)', borderRadius:3, transition:'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize:13, color:'var(--c-muted)', textAlign:'center', padding:'20px 0' }}>
              Нет данных пока
            </p>
          )}
        </div>
      </div>

      {/* Top questions */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--c-muted)' }}>Популярные вопросы клиентов</div>
        {data?.top_questions?.length ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {data.top_questions.map((q, i) => {
              const maxQ = data.top_questions[0].count
              const pct = Math.round(q.count / maxQ * 100)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:12, color:'var(--c-muted)', width:20, textAlign:'right', flexShrink:0 }}>#{i+1}</span>
                  <span style={{ flex:1, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.content}</span>
                  <div style={{ width:120, height:6, background:'var(--c-surface2)', borderRadius:3, overflow:'hidden', flexShrink:0 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'var(--c-purple)', borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:12, color:'var(--c-muted)', width:30, textAlign:'right', flexShrink:0 }}>{q.count}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize:13, color:'var(--c-muted)', textAlign:'center', padding:'20px 0' }}>
            Нет данных — протестируйте бота через предпросмотр чата
          </p>
        )}
      </div>
    </div>
  )
}
