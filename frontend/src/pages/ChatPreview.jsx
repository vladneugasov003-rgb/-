import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { botsAPI, chatAPI } from '../api/index.js'

export default function ChatPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bot, setBot] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [convId, setConvId] = useState(null)
  const [error, setError] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferred, setTransferred] = useState(false)
  const [transferForm, setTransferForm] = useState({ name:'', contact:'' })
  const bottomRef = useRef(null)

  useEffect(() => {
    botsAPI.get(id).then(b => {
      setBot(b)
      setMessages([{ role:'assistant', content: b.greeting, id: Date.now() }])
    }).catch(() => navigate('/'))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])


  const transfer = async () => {
    try {
      const token = localStorage.getItem('bm_token')
      await fetch(`/api/bots/${id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ conversation_id: convId, ...transferForm })
      })
      setTransferred(true)
      setShowTransfer(false)
      setMessages(m => [...m, { role:'assistant', content:'✅ Запрос передан! Менеджер свяжется с вами в ближайшее время.', id: Date.now() }])
    } catch(e) { setError('Не удалось передать запрос') }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setError('')

    const userMsg = { role:'user', content:text, id: Date.now() }
    setMessages(m => [...m, userMsg])
    setSending(true)

    const thinkingMsg = { role:'assistant', content:'...', id:'thinking', thinking:true }
    setMessages(m => [...m, thinkingMsg])

    try {
      const res = await chatAPI.send(id, { message: text, conversation_id: convId })
      setConvId(res.conversation_id)
      setMessages(m => m.filter(x => x.id !== 'thinking').concat({ role:'assistant', content:res.reply, id: Date.now() }))
    } catch (e) {
      setMessages(m => m.filter(x => x.id !== 'thinking'))
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setConvId(null)
    setMessages([{ role:'assistant', content: bot?.greeting, id: Date.now() }])
    setError('')
  }

  if (!bot) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 24px',
        borderBottom:'1px solid var(--c-border)', background:'var(--c-surface)', flexShrink:0,
      }}>
        <button onClick={() => navigate('/')} className="btn btn-sm">← Назад</button>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:600, color:'#fff', flexShrink:0 }}>
          {bot.name[0]}
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:600 }}>{bot.name}</div>
          <div style={{ fontSize:12, color:'var(--c-green)' }}>AI-ассистент · онлайн</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--c-muted)', padding:'4px 10px', background:'var(--c-surface2)', borderRadius:6 }}>
            Предпросмотр
          </span>
          <button className="btn btn-sm" onClick={reset}>↺ Сбросить</button>
          <button className="btn btn-sm" onClick={() => navigate(`/bots/${id}/edit`)}>✏️ Редактировать</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display:'flex', gap:10, maxWidth:'75%',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#fff', flexShrink:0 }}>
                {bot.name[0]}
              </div>
            )}
            <div style={{
              padding: '10px 14px', borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              background: msg.role === 'user' ? 'var(--c-purple)' : 'var(--c-surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--c-text)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--c-border)',
              fontSize: 14, lineHeight: 1.6,
            }}>
              {msg.thinking ? (
                <div style={{ display:'flex', gap:4, alignItems:'center', padding:'2px 0' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width:6, height:6, borderRadius:'50%', background:'var(--c-muted)',
                      animation:'blink 1.2s infinite', animationDelay:`${i*0.2}s`,
                    }} />
                  ))}
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {error && (
          <div style={{ padding:'10px 14px', background:'var(--c-red-dim)', color:'var(--c-red)', borderRadius:8, fontSize:13, maxWidth:'80%' }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div style={{ padding:'0 24px 12px', display:'flex', gap:8, flexWrap:'wrap' }}>
          {['Какие у вас цены?', 'Как записаться?', 'Режим работы', 'Где вы находитесь?'].map(q => (
            <button key={q} onClick={() => { setInput(q); setTimeout(() => document.getElementById('chat-inp')?.focus(), 0) }}
              className="btn btn-sm" style={{ fontSize:12 }}>
              {q}
            </button>
          ))}
        </div>
      )}


      {/* Transfer to manager */}
      {!transferred && convId && (
        <div style={{ padding:'0 24px 8px' }}>
          {!showTransfer ? (
            <button className="btn btn-sm" style={{ fontSize:12, color:'var(--c-muted)' }}
              onClick={() => setShowTransfer(true)}>
              🙋 Соединить с менеджером
            </button>
          ) : (
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Оставьте контакт — менеджер свяжется с вами</div>
              <input type="text" placeholder="Ваше имя" value={transferForm.name}
                onChange={e => setTransferForm(f => ({...f, name:e.target.value}))}
                style={{ marginBottom:8 }} />
              <input type="text" placeholder="Телефон или email"
                value={transferForm.contact}
                onChange={e => setTransferForm(f => ({...f, contact:e.target.value}))}
                style={{ marginBottom:10 }} />
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary btn-sm" onClick={transfer}>Отправить</button>
                <button className="btn btn-sm" onClick={() => setShowTransfer(false)}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Input */}
      <div style={{
        display:'flex', gap:10, padding:'12px 24px', borderTop:'1px solid var(--c-border)',
        background:'var(--c-surface)', flexShrink:0,
      }}>
        <input
          id="chat-inp"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Напишите вопрос как клиент..."
          disabled={sending}
          style={{ flex:1, padding:'10px 16px', borderRadius:24, background:'var(--c-surface2)' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="btn btn-primary"
          style={{ borderRadius:24, minWidth:48 }}
        >
          {sending ? <span className="spinner" style={{ width:16, height:16 }} /> : '→'}
        </button>
      </div>

      <style>{`@keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }`}</style>
    </div>
  )
}
