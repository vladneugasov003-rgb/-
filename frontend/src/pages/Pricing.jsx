import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'

const PLANS = [
  {
    key: 'free', name: 'Бесплатный', price: 0, bots: 1, dialogs: 30,
    features: ['1 бот', '30 диалогов/мес', 'Только сайт'], color: 'var(--c-muted)'
  },
  {
    key: 'starter', name: 'Старт', price: 790, bots: 3, dialogs: 500,
    features: ['3 бота', '500 диалогов/мес', 'Telegram + Сайт', 'Поддержка'], color: '#3ecf8e'
  },
  {
    key: 'business', name: 'Бизнес', price: 1990, bots: 10, dialogs: 2000,
    features: ['10 ботов', '2000 диалогов/мес', 'Все каналы', 'Аналитика', 'Приоритет поддержки'],
    color: 'var(--c-purple)', popular: true
  },
  {
    key: 'pro', name: 'Про', price: 3990, bots: '∞', dialogs: '∞',
    features: ['Безлимит ботов', 'Безлимит диалогов', 'Все каналы', 'Аналитика', 'API доступ'],
    color: '#f5c542'
  },
]

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return <div className={`toast toast-${type}`}>{msg}</div>
}

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const currentPlan = user?.plan || 'trial'

  const subscribe = async (planKey) => {
    if (planKey === 'free') return
    setLoading(planKey)
    try {
      const token = localStorage.getItem('bm_token')
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.demo) {
        setToast({ msg: `✅ ${data.message}`, type: 'success' })
        setTimeout(() => window.location.reload(), 1500)
      } else if (data.confirmation_url) {
        window.location.href = data.confirmation_url
      }
    } catch (e) {
      setToast({ msg: e.message, type: 'error' })
    } finally {
      setLoading(null)
    }
  }

  const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : 0

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <button onClick={() => navigate('/')} style={{ color:'var(--c-muted)', fontSize:13, marginBottom:8, cursor:'pointer', background:'none', border:'none', fontFamily:'var(--font)' }}>← Назад</button>
          <h1 className="page-title">Тарифы и подписка</h1>
        </div>
      </div>

      {/* Current plan banner */}
      {currentPlan === 'trial' && trialDays > 0 && (
        <div style={{ background:'var(--c-purple-dim)', border:'1px solid var(--c-purple)', borderRadius:12, padding:'16px 20px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:600, marginBottom:4 }}>🎁 Пробный период активен</div>
            <div style={{ fontSize:13, color:'var(--c-muted)' }}>Осталось {trialDays} дн. · Тариф Бизнес бесплатно</div>
          </div>
          <div style={{ fontSize:32, fontWeight:700, color:'var(--c-purple)' }}>{trialDays}</div>
        </div>
      )}

      {currentPlan !== 'trial' && currentPlan !== 'free' && (
        <div style={{ background:'var(--c-green-dim)', border:'1px solid var(--c-green)', borderRadius:12, padding:'14px 20px', marginBottom:24, fontSize:14 }}>
          ✅ Активный тариф: <strong>{PLANS.find(p=>p.key===currentPlan)?.name}</strong>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, marginBottom:32 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key || (currentPlan === 'trial' && plan.key === 'business')
          return (
            <div key={plan.key} style={{
              background:'var(--c-surface)', border:`${plan.popular ? '2px solid var(--c-purple)' : '1px solid var(--c-border)'}`,
              borderRadius:16, padding:20, position:'relative', display:'flex', flexDirection:'column',
            }}>
              {plan.popular && (
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'var(--c-purple)', color:'#fff', padding:'3px 14px', borderRadius:12, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>Популярный</div>
              )}
              <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>{plan.name}</div>
              <div style={{ fontSize:28, fontWeight:700, marginBottom:4 }}>
                {plan.price === 0 ? 'Бесплатно' : `${plan.price}₽`}
                {plan.price > 0 && <span style={{ fontSize:13, fontWeight:400, color:'var(--c-muted)' }}>/мес</span>}
              </div>
              <div style={{ fontSize:12, color:'var(--c-muted)', marginBottom:16 }}>
                {plan.bots} ботов · {plan.dialogs} диалогов
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7, marginBottom:20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                    <span style={{ color: plan.color, fontWeight:700, fontSize:14 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                className={`btn ${plan.popular ? 'btn-primary' : ''}`}
                style={{ width:'100%', justifyContent:'center', opacity: isCurrent ? 0.5 : 1 }}
                disabled={isCurrent || plan.key === 'free' || loading === plan.key}
                onClick={() => subscribe(plan.key)}
              >
                {loading === plan.key ? <span className="spinner" style={{width:14,height:14}} /> :
                 isCurrent ? 'Текущий тариф' :
                 plan.price === 0 ? 'Текущий' : `Выбрать за ${plan.price}₽`}
              </button>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ fontSize:13, color:'var(--c-muted)', lineHeight:1.8 }}>
        <div style={{ fontWeight:500, color:'var(--c-text)', marginBottom:8 }}>💳 Оплата</div>
        Оплата через ЮКасса — банковские карты, СБП, ЮMoney. Подписка продлевается автоматически.
        Отменить можно в любое время. При отмене тариф остаётся активным до конца оплаченного периода.
        {!process.env.YUKASSA_SHOP_ID && ' (Сейчас работает демо-режим — оплата не требуется)'}
      </div>
    </div>
  )
}
