import React, { useState } from 'react'
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

const FAQ = [
  { q: 'Нужен ли программист для настройки?', a: 'Нет. Конструктор визуальный — вы описываете бизнес текстом, выбираете каналы и нажимаете «Создать». Весь процесс занимает 15–30 минут.' },
  { q: 'Какие каналы поддерживаются?', a: 'Сайт (виджет), Telegram, ВКонтакте. WhatsApp в разработке. Один бот работает во всех каналах одновременно.' },
  { q: 'Что происходит после окончания пробного периода?', a: 'Аккаунт переходит на бесплатный тариф: 1 бот, 30 диалогов/мес. Данные сохраняются. Вы можете перейти на платный тариф в любой момент.' },
  { q: 'Бот понимает русский язык?', a: 'Да, бот работает на основе нейросети и свободно общается на русском языке. Он понимает контекст, отвечает по существу и использует базу знаний вашего бизнеса.' },
  { q: 'Как бот узнаёт о моём бизнесе?', a: 'Вы заполняете «Базу знаний» — прайс-лист, FAQ, адрес, режим работы. AI использует эти данные для ответов клиентам. Чем подробнее — тем точнее ответы.' },
  { q: 'Можно ли передать клиента живому менеджеру?', a: 'Да. Клиент может нажать «Соединить с менеджером», и вы получите уведомление на email. Также заявка попадёт в AmoCRM если подключена интеграция.' },
  { q: 'Безопасны ли мои данные?', a: 'Данные хранятся в защищённой базе PostgreSQL. Мы не передаём информацию третьим лицам. Платёжные данные обрабатывает ЮКасса (сертификат PCI DSS).' },
]

const STEPS = [
  { num: '1', title: 'Опишите бизнес', desc: 'Заполните название, нишу и базу знаний — прайс, адрес, услуги' },
  { num: '2', title: 'Подключите каналы', desc: 'Выберите Telegram, сайт или ВКонтакте — бот работает сразу везде' },
  { num: '3', title: 'Запустите и получайте заявки', desc: 'Бот отвечает 24/7, а вы получаете уведомления о клиентах' },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} style={{
      border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px',
      cursor: 'pointer', transition: 'all 0.2s',
      background: open ? 'var(--c-surface)' : 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.5, paddingRight: 12 }}>{q}</div>
        <div style={{ fontSize: 18, color: 'var(--c-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</div>
      </div>
      {open && (
        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing" style={{ fontFamily: 'var(--font)', color: 'var(--c-text)', background: 'var(--c-bg)' }}>

      {/* Nav */}
      <nav className="l-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--c-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>Б</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>БотМастер</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn l-login-btn" onClick={() => navigate('/login')}>Войти</button>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Попробовать бесплатно</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="l-section l-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--c-purple-dim)', color: 'var(--c-purple)', padding: '6px 16px', borderRadius: 20, fontSize: 13, marginBottom: 24 }}>
          ✨ 14 дней бесплатно — без карты
        </div>
        <h1 className="l-h1">
          AI-чат-бот для вашего<br />
          <span style={{ color: 'var(--c-purple)' }}>малого бизнеса</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--c-muted)', lineHeight: 1.7, marginBottom: 36, maxWidth: 600, margin: '0 auto 36px' }}>
          Создайте умного бота за 30 минут без программиста. Он ответит клиентам в 3 часа ночи, запишет на услугу и передаст заявку вам.
        </p>
        <div className="l-btns">
          <button className="btn btn-primary" style={{ padding: '13px 32px', fontSize: 16 }} onClick={() => navigate('/register')}>
            Создать бота бесплатно →
          </button>
          <button className="btn" style={{ padding: '13px 32px', fontSize: 16 }} onClick={() => navigate('/login')}>
            Уже есть аккаунт
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--c-hint)', marginTop: 16 }}>Более 6 млн субъектов МСБ в России — ваши потенциальные клиенты</p>
      </section>

      {/* Niches */}
      <section className="l-section" style={{ paddingTop: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 16, textAlign: 'center' }}>Подходит для любого малого бизнеса:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {NICHES.map(n => (
            <span key={n} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '6px 16px', fontSize: 14 }}>{n}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="l-section" style={{ background: 'var(--c-surface)' }}>
        <h2 className="l-h2">Как это работает</h2>
        <div className="l-steps">
          {STEPS.map(s => (
            <div key={s.num} style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c-purple)', color: '#fff', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{s.num}</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="l-section">
        <h2 className="l-h2">Всё что нужно для продаж 24/7</h2>
        <div className="l-features">
          {FEATURES.map(f => (
            <div key={f.title} className="card">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="l-section" style={{ background: 'var(--c-surface)' }}>
        <div className="l-stats">
          {[['68%', 'обращений происходят в нерабочее время'], ['78%', 'клиентов уходят без ответа за 5 минут'], ['30 мин', 'настройка бота без программиста'], ['40 000₽', 'экономия на зарплате менеджера в месяц']].map(([v, l]) => (
            <div key={v}>
              <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--c-purple)' }}>{v}</div>
              <div style={{ fontSize: 14, color: 'var(--c-muted)', marginTop: 8, lineHeight: 1.5 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="l-section">
        <h2 className="l-h2">Тарифы</h2>
        <p style={{ textAlign: 'center', color: 'var(--c-muted)', marginBottom: 48 }}>14 дней бесплатного пробного периода на тарифе Бизнес</p>
        <div className="l-plans">
          {PLANS.map(p => (
            <div key={p.name} style={{
              background: 'var(--c-bg)', border: `${p.popular ? '2px solid var(--c-purple)' : '1px solid var(--c-border)'}`,
              borderRadius: 16, padding: 24, position: 'relative',
            }}>
              {p.popular && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--c-purple)', color: '#fff', padding: '4px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Популярный</div>}
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{p.price}₽<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--c-muted)' }}>/мес</span></div>
              <div style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 20 }}>{p.bots} ботов · {p.dialogs} диалогов</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <span style={{ color: 'var(--c-green)', fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button className={`btn ${p.popular ? 'btn-primary' : ''}`} style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => navigate('/register')}>
                Начать бесплатно
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="l-section" style={{ background: 'var(--c-surface)' }}>
        <h2 className="l-h2">Частые вопросы</h2>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="l-section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>Готовы попробовать?</h2>
        <p style={{ color: 'var(--c-muted)', fontSize: 16, marginBottom: 32 }}>14 дней бесплатно — без привязки карты</p>
        <button className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 16 }} onClick={() => navigate('/register')}>
          Создать аккаунт бесплатно →
        </button>
      </section>

      {/* Footer */}
      <footer className="l-footer">
        <span>© 2026 БотМастер — Программа «Студенческий стартап» · ФСИ</span>
        <span>Орёл, Россия · <a href="mailto:support@botmasterai.ru" style={{ color: 'var(--c-purple)', textDecoration: 'none' }}>support@botmasterai.ru</a></span>
      </footer>

      <style>{`
        .l-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 40px; border-bottom: 1px solid var(--c-border);
          position: sticky; top: 0; background: var(--c-bg); z-index: 100;
        }
        .l-hero { text-align: center; padding: 80px 40px 60px; max-width: 800; margin: 0 auto; }
        .l-h1 { font-size: 52px; font-weight: 700; line-height: 1.15; margin-bottom: 20px; }
        .l-h2 { text-align: center; font-size: 32px; font-weight: 600; margin-bottom: 48px; }
        .l-section { padding: 60px 40px; }
        .l-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .l-features { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 20px; max-width: 1000px; margin: 0 auto; }
        .l-stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 24px; max-width: 800px; margin: 0 auto; text-align: center; }
        .l-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; max-width: 900px; margin: 0 auto; }
        .l-plans { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 20px; max-width: 900px; margin: 0 auto; }
        .l-footer {
          border-top: 1px solid var(--c-border); padding: 24px 40px;
          display: flex; justify-content: space-between; align-items: center;
          color: var(--c-muted); font-size: 13px;
        }

        @media (max-width: 768px) {
          .l-nav { padding: 12px 16px; }
          .l-login-btn { display: none; }
          .l-hero { padding: 48px 16px 32px; }
          .l-h1 { font-size: 32px !important; }
          .l-h2 { font-size: 24px; margin-bottom: 32px; }
          .l-section { padding: 40px 16px; }
          .l-btns { flex-direction: column; }
          .l-btns button { width: 100%; }
          .l-features { grid-template-columns: 1fr; }
          .l-stats { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .l-steps { grid-template-columns: 1fr; gap: 24px; }
          .l-plans { grid-template-columns: 1fr; }
          .l-footer { flex-direction: column; text-align: center; gap: 8px; padding: 20px 16px; }
        }
      `}</style>
    </div>
  )
}
