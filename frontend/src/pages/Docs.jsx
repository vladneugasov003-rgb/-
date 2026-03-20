import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  {
    title: '🚀 Быстрый старт',
    items: [
      { q: 'Как создать бота?', a: 'Перейдите в «Мастер создания» → введите название, нишу и описание бизнеса → заполните базу знаний (прайс, FAQ) → нажмите «Создать». Бот готов за 5 минут.' },
      { q: 'Как заполнить базу знаний?', a: 'Откройте бота → вкладка «База знаний» → напишите всё что клиенты спрашивают: прайс, адрес, режим работы, условия доставки, FAQ. Формат свободный — AI разберётся.' },
      { q: 'Как протестировать бота?', a: 'После создания нажмите «Тест чат» или перейдите в «Предпросмотр» — вы сможете писать боту как клиент.' },
    ]
  },
  {
    title: '📡 Каналы',
    items: [
      { q: 'Как подключить Telegram?', a: '1) Создайте бота через @BotFather в Telegram\n2) Скопируйте токен\n3) Вставьте в настройках бота → «Каналы» → Telegram Token\n4) Сохраните — webhook установится автоматически' },
      { q: 'Как подключить ВКонтакте?', a: '1) Создайте сообщество ВК\n2) Управление → Работа с API → создайте ключ\n3) Вставьте токен, ID сообщества и код подтверждения\n4) В Callback API укажите адрес из настроек бота' },
      { q: 'Как добавить виджет на сайт?', a: 'Откройте бота → «Виджет» → скопируйте код. Вставьте его перед </body> на вашем сайте. Виджет появится в правом нижнем углу.' },
    ]
  },
  {
    title: '💳 Тарифы и оплата',
    items: [
      { q: 'Что включено в пробный период?', a: '14 дней с возможностями тарифа «Бизнес»: до 10 ботов, 2000 диалогов, все каналы, аналитика. Карта не нужна.' },
      { q: 'Что будет после окончания триала?', a: 'Аккаунт переходит на бесплатный тариф: 1 бот, 30 диалогов/мес. Все данные сохраняются. Платный тариф можно выбрать в любой момент.' },
      { q: 'Как оплатить?', a: 'Перейдите в «Тарифы» → выберите план → оплатите через ЮКассу (карта, SberPay, ЮMoney). Тариф активируется мгновенно.' },
    ]
  },
  {
    title: '🔗 Интеграции',
    items: [
      { q: 'Как подключить AmoCRM?', a: 'Откройте бота → «CRM» → введите домен AmoCRM и токен API. Когда клиент напишет «записаться» или нажмёт «Соединить с менеджером» — в CRM появится новая сделка.' },
      { q: 'Что такое «Соединить с менеджером»?', a: 'Кнопка в чате, которую может нажать клиент. Вы получите уведомление на email с данными клиента и ссылкой на диалог.' },
    ]
  },
  {
    title: '🛡️ Безопасность',
    items: [
      { q: 'Где хранятся данные?', a: 'В защищённой базе данных PostgreSQL на серверах Railway (Европа). Все соединения шифруются.' },
      { q: 'Кто видит диалоги клиентов?', a: 'Только владелец бота. Мы не читаем и не анализируем ваши диалоги. AI обрабатывает запросы в реальном времени.' },
    ]
  },
]

function DocItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} style={{
      border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px',
      cursor: 'pointer', transition: 'all 0.2s',
      background: open ? 'var(--c-surface)' : 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 500, fontSize: 14, paddingRight: 12 }}>{q}</div>
        <div style={{ fontSize: 16, color: 'var(--c-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</div>
      </div>
      {open && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{a}</div>
      )}
    </div>
  )
}

export default function Docs() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <button onClick={() => navigate(-1)} style={{ color: 'var(--c-muted)', fontSize: 13, marginBottom: 8, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font)' }}>
        ← Назад
      </button>
      <h1 className="page-title" style={{ marginBottom: 8 }}>Документация</h1>
      <p style={{ color: 'var(--c-muted)', fontSize: 14, marginBottom: 32 }}>Ответы на частые вопросы и инструкции по настройке</p>

      {SECTIONS.map(s => (
        <div key={s.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>{s.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.items.map(i => <DocItem key={i.q} q={i.q} a={i.a} />)}
          </div>
        </div>
      ))}

      <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 14, marginBottom: 12 }}>Не нашли ответ?</p>
        <a href="mailto:support@botmasterai.ru" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Написать в поддержку →
        </a>
      </div>
    </div>
  )
}
