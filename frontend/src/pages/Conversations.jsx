import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { botsAPI } from '../api/index.js'

async function getConversations(botId) {
  const token = localStorage.getItem('bm_token')
  const res = await fetch(`/api/bots/${botId}/conversations`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}

async function getMessages(convId) {
  const token = localStorage.getItem('bm_token')
  const res = await fetch(`/api/conversations/${convId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}

const CHANNEL_LABELS = {
  preview: '🖥 Предпросмотр',
  widget: '🌐 Сайт',
  default: (ch) => ch.startsWith('tg_') ? '✈️ Telegram' : ch,
}

function channelLabel(ch) {
  return CHANNEL_LABELS[ch] || CHANNEL_LABELS.default(ch)
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин. назад`
  if (hr < 24) return `${hr} ч. назад`
  if (day < 7) return `${day} дн. назад`
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

export default function Conversations() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bot, setBot] = useState(null)
  const [convs, setConvs] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    Promise.all([botsAPI.get(id), getConversations(id)])
      .then(([b, c]) => {
        setBot(b)
        setConvs(Array.isArray(c) ? c : [])
        setLoading(false)
      })
      .catch(() => navigate('/'))
  }, [id])

  useEffect(() => {
    if (!selected) return
    setLoadingMsgs(true)
    getMessages(selected.id).then(m => {
      setMessages(Array.isArray(m) ? m : [])
      setLoadingMsgs(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
  }, [selected])

  const filtered = convs.filter(c =>
    !search || channelLabel(c.channel).toLowerCase().includes(search.toLowerCase()) ||
    new Date(c.created_at).toLocaleDateString('ru-RU').includes(search)
  )

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* Left panel — conversation list */}
      <div style={{
        width: 300, flexShrink: 0, borderRight: '1px solid var(--c-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--c-surface)',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--c-border)' }}>
          <button onClick={() => navigate('/')} style={{ color:'var(--c-muted)', fontSize:12, cursor:'pointer', background:'none', border:'none', fontFamily:'var(--font)', marginBottom:8 }}>
            ← Назад
          </button>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:10 }}>
            {bot?.name}
          </div>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск диалогов..."
            style={{ width:'100%', padding:'7px 12px', borderRadius:8, fontSize:13 }}
          />
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {!filtered.length ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--c-muted)', fontSize:13 }}>
              {convs.length ? 'Ничего не найдено' : 'Диалогов пока нет'}
            </div>
          ) : filtered.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              style={{
                padding: '12px 16px', cursor:'pointer', borderBottom:'1px solid var(--c-border)',
                background: selected?.id === c.id ? 'var(--c-purple-dim)' : 'transparent',
                borderLeft: selected?.id === c.id ? '2px solid var(--c-purple)' : '2px solid transparent',
                transition: 'all .1s',
              }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{channelLabel(c.channel)}</span>
                <span style={{ fontSize:11, color:'var(--c-muted)' }}>{timeAgo(c.created_at)}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span className={`badge badge-${c.status === 'active' ? 'active' : 'pause'}`} style={{ fontSize:10 }}>
                  <span className="badge-dot" />
                  {c.status === 'active' ? 'Активен' : 'Завершён'}
                </span>
                <span style={{ fontSize:11, color:'var(--c-hint)' }}>
                  {new Date(c.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--c-border)', fontSize:12, color:'var(--c-muted)' }}>
          Всего: {convs.length} диалогов
        </div>
      </div>

      {/* Right panel — messages */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--c-bg)' }}>
        {!selected ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--c-muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Выберите диалог</div>
            <div style={{ fontSize:13 }}>Нажмите на любой диалог слева</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding:'14px 20px', borderBottom:'1px solid var(--c-border)',
              background:'var(--c-surface)', display:'flex', alignItems:'center', gap:12, flexShrink:0,
            }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:600 }}>
                {bot?.name?.[0]}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{channelLabel(selected.channel)}</div>
                <div style={{ fontSize:12, color:'var(--c-muted)' }}>
                  {new Date(selected.created_at).toLocaleString('ru-RU')} · {messages.length} сообщений
                </div>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <span style={{
                  fontSize:11, padding:'3px 10px', borderRadius:12,
                  background: selected.status === 'active' ? 'var(--c-green-dim)' : 'var(--c-surface2)',
                  color: selected.status === 'active' ? 'var(--c-green)' : 'var(--c-muted)',
                }}>
                  {selected.status === 'active' ? '● Активен' : '○ Завершён'}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:12 }}>
              {loadingMsgs ? (
                <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}>
                  <div className="spinner" />
                </div>
              ) : !messages.length ? (
                <div style={{ textAlign:'center', color:'var(--c-muted)', paddingTop:40, fontSize:13 }}>
                  Сообщений нет
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} style={{
                  display:'flex', gap:10, maxWidth:'75%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>
                      {bot?.name?.[0]}
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--c-surface2)', border:'1px solid var(--c-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--c-muted)', flexShrink:0 }}>
                      К
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <div style={{
                      padding:'9px 13px', fontSize:14, lineHeight:1.6,
                      borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                      background: msg.role === 'user' ? 'var(--c-purple)' : 'var(--c-surface)',
                      color: msg.role === 'user' ? '#fff' : 'var(--c-text)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--c-border)',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize:11, color:'var(--c-hint)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
