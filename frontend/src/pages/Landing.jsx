import React from 'react'
import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { icon: '🤖', title: 'AI на ваших данных', desc: 'Бот обучается на прайсе, адресе и режиме работы вашего бизнеса' },
  { icon: '⚡', title: '30 минут до запуска', desc: 'Конструктор без кода — описали бизнес, нажали кнопку, бот готов' },
  { icon: '📱', title: 'Все каналы сразу', desc: 'Сайт, Telegram, ВКонтакте и WhatsApp — один бот везде' },
  { icon: '📊', title: 'Аналитика диалогов', desc: 'Смотрите что спрашивают клиенты и когда они активны' },
  { icon: '🔗', title: 'CRM интеграция', desc: 'Заявки автоматически уходят в AmoCRM или Bitrix24' },
  { icon: '💸', title: 'Дешевле сотрудника', desc: 'От 790₽/мес вместо 40 000₽ зарплаты менеджера' },
]

const NICHES = ['💅 Салоны красоты', '🏥 Медклиники', '🔧 Автосервисы', '⚖️ Юристы', '🍕 Доставка еды', '🛍️ Интернет-магазины']

const PLANS = [
  { name: 'Старт', price: 790, bots: 3, dialogs: 500, features: ['3 бота', '500 диалогов/мес', 'Telegram + Сайт', 'Поддержка'], popular: false },
  { name: 'Бизнес', price: 1990, bots: 10, dialogs: 2000, features: ['10 ботов', '2000 диалогов/мес', 'Все каналы', 'Аналитика', 'Приоритетная поддержка'], popular: true },
  { name: 'Про', price: 3990, bots: '∞', dialogs: '∞', features: ['Безлимит ботов', 'Безлимит диалогов', 'Все каналы', 'Аналитика', 'API доступ', 'Персональный менеджер'], popular: false },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: 'var(--font)', color: 'var(--c-text)', background: 'var(--c-bg)' }}>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 40px', borderBottom:'1px solid var(--c-border)', position:'sticky', top:0, background:'var(--c-bg)', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--c-purple)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16 }}>Б</div>
          <span style={{ fontWeight:600, fontSize:16 }}>БотМастер</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" onClick={() => navigate('/login')}>Войти</button>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Попробовать бесплатно</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign:'center', padding:'80px 40px 60px', maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--c-purple-dim)', color:'var(--c-purple)', padding:'6px 16px', borderRadius:20, fontSize:13, marginBottom:24 }}>
          ✨ 14 дней бесплатно — без карты
        </div>
        <h1 style={{ fontSize:52, fontWeight:700, lineHeight:1.15, marginBottom:20 }}>
          AI-чат-бот для вашего<br />
          <span style={{ color:'var(--c-purple)' }}>малого бизнеса</span>
        </h1>
        <p style={{ fontSize:18, color:'var(--c-muted)', lineHeight:1.7, marginBottom:36, maxWidth:600, margin:'0 auto 36px' }}>
          Создайте умного бота за 30 минут без программиста. Он ответит клиентам в 3 часа ночи, запишет на услугу и передаст заявку вам.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-primary" style={{ padding:'13px 32px', fontSize:16 }} onClick={() => navigate('/register')}>
            Создать бота бесплатно →
          </button>
          <button className="btn" style={{ padding:'13px 32px', fontSize:16 }} onClick={() => navigate('/login')}>
            Уже есть аккаунт
          </button>
        </div>
        <p style={{ fontSize:13, color:'var(--c-hint)', marginTop:16 }}>Более 6 млн субъектов МСБ в России — ваши потенциальные клиенты</p>
      </section>

      {/* Niches */}
      <section style={{ padding:'20px 40px 60px', textAlign:'center' }}>
        <p style={{ fontSize:13, color:'var(--c-muted)', marginBottom:16 }}>Подходит для любого малого бизнеса:</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center' }}>
          {NICHES.map(n => (
            <span key={n} style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:20, padding:'6px 16px', fontSize:14 }}>{n}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'60px 40px', background:'var(--c-surface)' }}>
        <h2 style={{ textAlign:'center', fontSize:32, fontWeight:600, marginBottom:48 }}>Всё что нужно для продаж 24/7</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, maxWidth:1000, margin:'0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card">
              <div style={{ fontSize:32, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontWeight:600, fontSize:15, marginBottom:8 }}>{f.title}</div>
              <div style={{ fontSize:14, color:'var(--c-muted)', lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding:'60px 40px', textAlign:'center' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:24, maxWidth:800, margin:'0 auto' }}>
          {[['68%','обращений происходят в нерабочее время'],['78%','клиентов уходят без ответа за 5 минут'],['30 мин','настройка бота без программиста'],['40 000₽','экономия на зарплате менеджера в месяц']].map(([v,l]) => (
            <div key={v}>
              <div style={{ fontSize:40, fontWeight:700, color:'var(--c-purple)' }}>{v}</div>
              <div style={{ fontSize:14, color:'var(--c-muted)', marginTop:8, lineHeight:1.5 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding:'60px 40px', background:'var(--c-surface)' }}>
        <h2 style={{ textAlign:'center', fontSize:32, fontWeight:600, marginBottom:12 }}>Тарифы</h2>
        <p style={{ textAlign:'center', color:'var(--c-muted)', marginBottom:48 }}>14 дней бесплатного пробного периода на тарифе Бизнес</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:20, maxWidth:900, margin:'0 auto' }}>
          {PLANS.map(p => (
            <div key={p.name} style={{
              background:'var(--c-bg)', border:`${p.popular?'2px solid var(--c-purple)':'1px solid var(--c-border)'}`,
              borderRadius:16, padding:24, position:'relative',
            }}>
              {p.popular && <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'var(--c-purple)', color:'#fff', padding:'4px 16px', borderRadius:12, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>Популярный</div>}
              <div style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>{p.name}</div>
              <div style={{ fontSize:36, fontWeight:700, marginBottom:4 }}>{p.price}₽<span style={{ fontSize:14, fontWeight:400, color:'var(--c-muted)' }}>/мес</span></div>
              <div style={{ fontSize:13, color:'var(--c-muted)', marginBottom:20 }}>{p.bots} ботов · {p.dialogs} диалогов</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:14 }}>
                    <span style={{ color:'var(--c-green)', fontWeight:700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button className={`btn ${p.popular?'btn-primary':''}`} style={{ width:'100%', justifyContent:'center', padding:'10px' }} onClick={() => navigate('/register')}>
                Начать бесплатно
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 40px', textAlign:'center' }}>
        <h2 style={{ fontSize:36, fontWeight:700, marginBottom:16 }}>Готовы попробовать?</h2>
        <p style={{ color:'var(--c-muted)', fontSize:16, marginBottom:32 }}>14 дней бесплатно — без привязки карты</p>
        <button className="btn btn-primary" style={{ padding:'14px 40px', fontSize:16 }} onClick={() => navigate('/register')}>
          Создать аккаунт бесплатно →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--c-border)', padding:'24px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--c-muted)', fontSize:13 }}>
        <span>© 2026 БотМастер — Программа «Студенческий стартап» · ФСИ</span>
        <span>Орёл, Россия</span>
      </footer>
    </div>
  )
}
