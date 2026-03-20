import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { botsAPI } from '../api/index.js'

const NICHES = ['Салон красоты', 'Медклиника', 'Автосервис', 'Юридические услуги', 'Доставка еды', 'Интернет-магазин', 'Фитнес', 'Образование', 'Другое']
const CHANNELS = [
  { id: 'site', label: 'Сайт', icon: '🌐' },
  { id: 'telegram', label: 'Telegram', icon: '✈️' },
  { id: 'vk', label: 'ВКонтакте', icon: '💙' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
]
const COLORS = ['#7c6cf5','#3ecf8e','#f87171','#f5c542','#60a5fa','#f472b6']

const TONES = [
  { id: 'friendly', label: '😊 Дружелюбный', desc: 'Тёплый, с эмодзи, обращение на «ты»' },
  { id: 'professional', label: '👔 Профессиональный', desc: 'Вежливый, на «вы», без эмодзи' },
  { id: 'casual', label: '🤙 Неформальный', desc: 'Расслабленный, молодёжный стиль' },
  { id: 'formal', label: '📋 Официальный', desc: 'Строгий, деловой, формальный' },
]

const LENGTHS = [
  { id: 'short', label: 'Коротко', desc: '1-2 предложения' },
  { id: 'medium', label: 'Средне', desc: '2-4 предложения' },
  { id: 'detailed', label: 'Подробно', desc: '4-6 предложений' },
]

const NICHE_TEMPLATES = {
  'Салон красоты': {
    description: 'Салон красоты. Услуги: стрижки, маникюр, педикюр, окрашивание, укладки, уход за лицом.',
    greeting: 'Привет! Я помощник салона. Подскажу по услугам, ценам и помогу записаться 💅',
    knowledge: `Услуги и цены:
Стрижка женская — от 1200₽
Стрижка мужская — от 800₽
Маникюр — от 1500₽
Педикюр — от 1800₽
Окрашивание — от 3000₽
Укладка — от 1000₽

Режим работы: Пн-Вс 9:00–21:00
Адрес: [ваш адрес]
Телефон: [ваш телефон]

Как записаться: через бота, по телефону или в WhatsApp
Отмена/перенос: за 2 часа до визита бесплатно`,
    tone: 'friendly',
  },
  'Медклиника': {
    description: 'Медицинская клиника. Приём врачей, анализы, диагностика.',
    greeting: 'Здравствуйте! Я ассистент клиники. Помогу записаться к врачу или узнать о наших услугах.',
    knowledge: `Направления:
Терапевт — от 1500₽
Стоматолог — от 2000₽
Гинеколог — от 2000₽
УЗИ — от 1200₽
Анализы крови — от 500₽

Режим работы: Пн-Пт 8:00–20:00, Сб 9:00–16:00
Адрес: [ваш адрес]

Запись: через бота, по телефону
Подготовка к анализам: натощак, утром`,
    tone: 'professional',
  },
  'Автосервис': {
    description: 'Автосервис. Ремонт, ТО, диагностика, шиномонтаж.',
    greeting: 'Привет! Я бот автосервиса. Подскажу по ремонту, ценам и запишу на обслуживание 🔧',
    knowledge: `Услуги и цены:
Диагностика — от 1000₽
Замена масла — от 1500₽
ТО — от 3000₽
Шиномонтаж (4 колеса) — от 2000₽
Ремонт ходовой — от 2500₽

Режим работы: Пн-Сб 9:00–19:00
Адрес: [ваш адрес]

Марки: работаем со всеми марками
Запчасти: оригинал и аналоги в наличии`,
    tone: 'friendly',
  },
  'Юридические услуги': {
    description: 'Юридическая компания. Консультации, составление документов, представительство в суде.',
    greeting: 'Здравствуйте. Я ассистент юридической фирмы. Расскажу об услугах и помогу записаться на консультацию.',
    knowledge: `Услуги:
Консультация — от 2000₽ (первая — бесплатно)
Составление договора — от 5000₽
Представительство в суде — от 15000₽
Регистрация ООО/ИП — от 5000₽

Специализация: гражданское, семейное, трудовое право
Режим работы: Пн-Пт 9:00–18:00
Адрес: [ваш адрес]`,
    tone: 'formal',
  },
  'Доставка еды': {
    description: 'Служба доставки еды. Пицца, суши, бургеры, десерты.',
    greeting: 'Привет! 🍕 Я помогу выбрать блюдо и оформить заказ. Что хотите?',
    knowledge: `Меню:
Пицца Маргарита — 490₽
Пицца Пепперони — 590₽
Бургер классический — 350₽
Ролл Филадельфия — 450₽
Картофель фри — 190₽
Кола 0.5л — 90₽

Доставка: бесплатно от 1000₽, иначе 200₽
Время доставки: 30-60 минут
Зона доставки: в пределах города
Оплата: наличные, карта курьеру, онлайн`,
    tone: 'casual',
  },
  'Интернет-магазин': {
    description: 'Интернет-магазин. Продажа товаров онлайн с доставкой.',
    greeting: 'Привет! Я помощник магазина. Помогу найти товар, узнать о доставке и оплате 🛍️',
    knowledge: `Доставка:
СДЭК — от 300₽, 2-5 дней
Почта России — от 200₽, 5-10 дней
Курьер по городу — 250₽, в тот же день

Оплата: карта, СБП, при получении
Возврат: 14 дней, товар в оригинальной упаковке
Гарантия: 12 месяцев на всё`,
    tone: 'friendly',
  },
  'Фитнес': {
    description: 'Фитнес-клуб. Тренажёрный зал, групповые программы, персональные тренировки.',
    greeting: 'Привет! 💪 Я бот фитнес-клуба. Расскажу о абонементах, расписании и помогу записаться!',
    knowledge: `Абонементы:
Дневной (до 17:00) — 2500₽/мес
Полный день — 3500₽/мес
Безлимит + бассейн — 5000₽/мес
Персональная тренировка — 1500₽

Расписание групповых:
Йога — Пн, Ср, Пт 10:00
Кроссфит — Вт, Чт 19:00
Пилатес — Сб 11:00

Режим работы: 7:00–23:00 ежедневно`,
    tone: 'casual',
  },
  'Образование': {
    description: 'Образовательный центр. Курсы, репетиторство, подготовка к экзаменам.',
    greeting: 'Здравствуйте! Я ассистент учебного центра. Расскажу о курсах и помогу записаться.',
    knowledge: `Курсы:
Английский язык — от 4000₽/мес
Математика (ЕГЭ/ОГЭ) — от 5000₽/мес
Программирование — от 6000₽/мес
Пробное занятие — бесплатно

Формат: очно и онлайн
Группы: до 8 человек
Возраст: от 7 лет`,
    tone: 'professional',
  },
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div className={`toast toast-${type}`}>{msg}</div>
}

// Parse description|||settings format
function parseDescription(desc) {
  if (!desc || !desc.includes('|||')) return { text: desc || '', settings: {} }
  const parts = desc.split('|||')
  try { return { text: parts[0].trim(), settings: JSON.parse(parts[1]) } }
  catch { return { text: desc, settings: {} } }
}

function packDescription(text, settings) {
  const hasSettings = settings.tone || settings.length || settings.language
  if (!hasSettings) return text
  return `${text}|||${JSON.stringify(settings)}`
}

export default function Constructor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    name: '',
    niche: 'Салон красоты',
    description: '',
    greeting: 'Привет! Я помощник. Чем могу помочь?',
    knowledge: '',
    channels: ['site'],
    widget_color: '#7c6cf5',
    is_active: true,
  })

  const [promptSettings, setPromptSettings] = useState({
    tone: 'friendly',
    length: 'medium',
    language: 'ru',
  })

  useEffect(() => {
    if (!isEdit) return
    botsAPI.get(id).then(b => {
      const { text, settings } = parseDescription(b.description)
      setForm({ ...b, description: text, channels: b.channels || ['site'] })
      setPromptSettings(ps => ({
        tone: settings.tone || ps.tone,
        length: settings.length || ps.length,
        language: settings.language || ps.language,
      }))
      setLoading(false)
    }).catch(() => navigate('/'))
  }, [id])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))

  const toggleChannel = (ch) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch]
    }))
  }

  const applyTemplate = () => {
    const tmpl = NICHE_TEMPLATES[form.niche]
    if (!tmpl) return
    setForm(f => ({
      ...f,
      description: tmpl.description,
      greeting: tmpl.greeting,
      knowledge: tmpl.knowledge,
    }))
    setPromptSettings(ps => ({ ...ps, tone: tmpl.tone || ps.tone }))
    setToast({ msg: 'Шаблон применён! Отредактируйте под себя', type: 'success' })
  }

  const save = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Введите название бота', type: 'error' }); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        description: packDescription(form.description, promptSettings),
      }
      if (isEdit) {
        await botsAPI.update(id, payload)
        setToast({ msg: 'Бот обновлён ✓', type: 'success' })
      } else {
        const bot = await botsAPI.create(payload)
        setToast({ msg: 'Бот создан! Тестируем...', type: 'success' })
        setTimeout(() => navigate(`/bots/${bot.id}/chat`), 1200)
      }
    } catch (e) {
      setToast({ msg: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <button onClick={() => navigate('/')} style={{ color:'var(--c-muted)', fontSize:13, marginBottom:8, cursor:'pointer', background:'none', border:'none', fontFamily:'var(--font)' }}>
            ← Назад
          </button>
          <h1 className="page-title">{isEdit ? 'Редактировать бота' : 'Создать бота'}</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isEdit && (
            <button className="btn" onClick={() => navigate(`/bots/${id}/chat`)}>
              💬 Тест чат
            </button>
          )}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" style={{ width:16, height:16 }} /> : isEdit ? 'Сохранить' : 'Создать бота'}
          </button>
        </div>
      </div>

      <div className="tabs">
        {[['info','⚙️ Основное'],['prompt','🎭 Поведение AI'],['knowledge','📚 База знаний'],['channels','📡 Каналы'],['widget','🎨 Виджет'],['crm','🔗 CRM']].map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div className="field-label">Название бота *</div>
          <input type="text" value={form.name} onChange={set('name')} placeholder="Например: Салон «Гармония»" />

          <div className="field-label">Ниша / сфера</div>
          <select value={form.niche} onChange={set('niche')}>
            {NICHES.map(n => <option key={n}>{n}</option>)}
          </select>

          {NICHE_TEMPLATES[form.niche] && !isEdit && (
            <button className="btn" onClick={applyTemplate} style={{ marginTop: 10, fontSize: 13 }}>
              ✨ Заполнить шаблоном для «{form.niche}»
            </button>
          )}

          <div className="field-label">Описание бизнеса для AI</div>
          <textarea rows={5} value={form.description} onChange={set('description')}
            placeholder="Опишите ваш бизнес: название, адрес, режим работы, услуги — чем подробнее, тем умнее бот." />

          <div className="field-label">Приветственное сообщение</div>
          <input type="text" value={form.greeting} onChange={set('greeting')} />

          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:20, padding:'12px 14px', background:'var(--c-surface2)', borderRadius:8 }}>
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width:'auto' }} />
            <label htmlFor="active" style={{ fontSize:13, cursor:'pointer' }}>Бот активен</label>
          </div>
        </div>
      )}

      {tab === 'prompt' && (
        <div className="card">
          <p style={{ fontSize:13, color:'var(--c-muted)', marginBottom:20, lineHeight:1.6 }}>
            Настройте как бот общается с клиентами — тон, длину ответов и язык.
          </p>

          {/* Tone */}
          <div className="field-label">Тон общения</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:20 }}>
            {TONES.map(t => (
              <div key={t.id} onClick={() => setPromptSettings(ps => ({...ps, tone: t.id}))}
                style={{
                  border: `1px solid ${promptSettings.tone===t.id ? 'var(--c-purple)' : 'var(--c-border)'}`,
                  background: promptSettings.tone===t.id ? 'var(--c-purple-dim)' : 'var(--c-surface2)',
                  borderRadius: 10, padding:'12px 14px', cursor:'pointer', transition:'all 0.15s',
                }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{t.label}</div>
                <div style={{ fontSize:11, color:'var(--c-muted)', marginTop:2 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Length */}
          <div className="field-label">Длина ответов</div>
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {LENGTHS.map(l => (
              <div key={l.id} onClick={() => setPromptSettings(ps => ({...ps, length: l.id}))}
                style={{
                  flex:1, textAlign:'center',
                  border: `1px solid ${promptSettings.length===l.id ? 'var(--c-purple)' : 'var(--c-border)'}`,
                  background: promptSettings.length===l.id ? 'var(--c-purple-dim)' : 'var(--c-surface2)',
                  borderRadius: 10, padding:'12px 10px', cursor:'pointer', transition:'all 0.15s',
                }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{l.label}</div>
                <div style={{ fontSize:11, color:'var(--c-muted)', marginTop:2 }}>{l.desc}</div>
              </div>
            ))}
          </div>

          {/* Language */}
          <div className="field-label">Язык ответов</div>
          <select value={promptSettings.language} onChange={e => setPromptSettings(ps => ({...ps, language: e.target.value}))}>
            <option value="ru">🇷🇺 Русский</option>
            <option value="en">🇬🇧 English</option>
            <option value="auto">🌐 Язык клиента (авто)</option>
          </select>

          {/* Preview */}
          <div style={{ marginTop:24, padding:16, background:'var(--c-surface2)', borderRadius:10, border:'1px solid var(--c-border)' }}>
            <div style={{ fontSize:12, fontWeight:500, color:'var(--c-muted)', marginBottom:8 }}>Предпросмотр стиля</div>
            <div style={{ fontSize:13, lineHeight:1.6, color:'var(--c-text)' }}>
              {promptSettings.tone === 'friendly' && '😊 «Привет! Конечно, расскажу про наши цены. Стрижка от 1200₽, маникюр от 1500₽. Записать тебя?»'}
              {promptSettings.tone === 'professional' && '«Добрый день. Стоимость стрижки — от 1 200 ₽, маникюра — от 1 500 ₽. Могу записать вас на удобное время.»'}
              {promptSettings.tone === 'casual' && '«Хей! Стрижка от 1200, маникюр от 1500. Когда удобно заглянуть? 💅»'}
              {promptSettings.tone === 'formal' && '«Уважаемый клиент, стоимость стрижки составляет от 1 200 руб., маникюра — от 1 500 руб. Для записи на приём, пожалуйста, сообщите предпочтительную дату и время.»'}
            </div>
          </div>
        </div>
      )}

      {tab === 'knowledge' && (
        <div className="card">
          <p style={{ fontSize:13, color:'var(--c-muted)', marginBottom:16, lineHeight:1.6 }}>
            Здесь AI учится отвечать правильно. Добавьте прайс-лист, FAQ, описание услуг — всё что клиенты спрашивают.
          </p>

          {NICHE_TEMPLATES[form.niche] && !form.knowledge.trim() && (
            <button className="btn" onClick={applyTemplate} style={{ marginBottom: 16, fontSize: 13 }}>
              ✨ Заполнить шаблоном для «{form.niche}»
            </button>
          )}

          <textarea rows={16} value={form.knowledge} onChange={set('knowledge')}
            placeholder={`Цены:\nСтрижка — от 1200 ₽\nМаникюр — от 1500 ₽\n\nЧасто задаваемые вопросы:\nКак записаться? По телефону или через бота.\nЕсть парковка? Да, бесплатная.\n\nАдрес: ул. Ленина, 45, Орёл\nРежим работы: Пн-Вс 9:00–21:00`} />
          <p style={{ fontSize:12, color:'var(--c-hint)', marginTop:8 }}>Нет чёткого формата — пишите как удобно, AI разберётся.</p>
        </div>
      )}

      {tab === 'channels' && (
        <div className="card">
          <p style={{ fontSize:13, color:'var(--c-muted)', marginBottom:16 }}>
            Выберите площадки, где будет работать бот:
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:24 }}>
            {CHANNELS.map(ch => (
              <div key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                style={{
                  border: `1px solid ${form.channels.includes(ch.id) ? 'var(--c-purple)' : 'var(--c-border)'}`,
                  background: form.channels.includes(ch.id) ? 'var(--c-purple-dim)' : 'var(--c-surface2)',
                  borderRadius: 10, padding: '16px', cursor:'pointer', transition:'all 0.15s',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                <span style={{ fontSize:24 }}>{ch.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{ch.label}</div>
                  <div style={{ fontSize:11, color:'var(--c-muted)' }}>
                    {form.channels.includes(ch.id) ? '✓ Включён' : 'Нажмите для включения'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {form.channels.includes('vk') && (
            <div style={{ marginTop:20, background:'var(--c-surface2)', borderRadius:10, padding:16 }}>
              <div style={{ fontWeight:500, fontSize:13, marginBottom:12, color:'var(--c-text)' }}>⚙️ Настройка ВКонтакте</div>
              
              <div className="field-label">Шаг 1 — Токен сообщества</div>
              <input type="text" value={form.vk_token||''} onChange={e => setForm(f=>({...f, vk_token:e.target.value}))}
                placeholder="vk1.a.xxxxx..." />
              <p style={{ fontSize:11, color:'var(--c-hint)', marginTop:4 }}>
                ВКонтакте → Управление сообществом → Работа с API → Ключи доступа → Создать ключ
              </p>

              <div className="field-label">Шаг 2 — ID сообщества</div>
              <input type="text" value={form.vk_group_id||''} onChange={e => setForm(f=>({...f, vk_group_id:e.target.value}))}
                placeholder="123456789" />

              <div className="field-label">Шаг 3 — Код подтверждения</div>
              <input type="text" value={form.vk_confirm_code||''} onChange={e => setForm(f=>({...f, vk_confirm_code:e.target.value}))}
                placeholder="a1b2c3d4" />

              {id && (
                <div style={{ marginTop:12, padding:'10px 12px', background:'var(--c-purple-dim)', borderRadius:8 }}>
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:4 }}>Шаг 4 — Адрес для Callback API:</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--c-purple)', wordBreak:'break-all' }}>
                    {window.location.origin.replace('5173','3000')}/api/vk/webhook/{id}
                  </div>
                </div>
              )}
            </div>
          )}

          {form.channels.includes('telegram') && (
            <div style={{ marginTop:20, background:'var(--c-surface2)', borderRadius:10, padding:16 }}>
              <div style={{ fontWeight:500, fontSize:13, marginBottom:12 }}>⚙️ Настройка Telegram</div>
              <div className="field-label">Telegram Bot Token (от @BotFather)</div>
              <input type="text" value={form.telegram_token||''} onChange={e => setForm(f=>({...f, telegram_token:e.target.value}))}
                placeholder="1234567890:ABCdefGHI..." />
              <p style={{ fontSize:11, color:'var(--c-hint)', marginTop:4 }}>
                Создайте бота через @BotFather → /newbot → скопируйте токен сюда
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'widget' && (
        <div className="card">
          <div className="field-label">Цвет кнопки виджета</div>
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setForm(f => ({ ...f, widget_color: c }))}
                style={{
                  width:32, height:32, borderRadius:'50%', background:c, cursor:'pointer',
                  border: form.widget_color===c ? '3px solid var(--c-text)' : '3px solid transparent',
                  transition:'border 0.15s',
                }} />
            ))}
          </div>

          <div className="field-label">Предпросмотр виджета</div>
          <div style={{ background:'var(--c-surface2)', borderRadius:12, padding:20, display:'flex', justifyContent:'center', alignItems:'flex-end', minHeight:220 }}>
            <div style={{ width:260, border:'1px solid var(--c-border)', borderRadius:12, overflow:'hidden', background:'var(--c-surface)' }}>
              <div style={{ background:form.widget_color, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:600 }}>
                  {form.name?.[0]?.toUpperCase() || 'Б'}
                </div>
                <div>
                  <div style={{ fontSize:12, color:'#fff', fontWeight:500 }}>{form.name || 'Название бота'}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)' }}>онлайн</div>
                </div>
              </div>
              <div style={{ padding:'10px 12px', background:'var(--c-surface2)', minHeight:70 }}>
                <div style={{ background:'var(--c-surface)', borderRadius:8, padding:'6px 10px', fontSize:11, display:'inline-block', maxWidth:'85%' }}>
                  {form.greeting}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, padding:'8px 12px', borderTop:'1px solid var(--c-border)' }}>
                <div style={{ flex:1, background:'var(--c-surface2)', borderRadius:12, padding:'5px 10px', fontSize:11, color:'var(--c-muted)' }}>Написать...</div>
                <div style={{ width:24, height:24, borderRadius:'50%', background:form.widget_color, flexShrink:0 }} />
              </div>
            </div>
          </div>

          <div className="field-label" style={{ marginTop:20 }}>Код для вставки на сайт</div>
          <div style={{ background:'var(--c-surface2)', borderRadius:8, padding:12, fontFamily:'var(--mono)', fontSize:12, color:'var(--c-muted)', lineHeight:1.6 }}>
            {`<script src="${window.location.origin.replace('5173','3000')}/widget.js"\n  data-bot="${id || 'bot-id-после-создания'}"\n  data-color="${form.widget_color}">\n</script>`}
          </div>
        </div>
      )}

      {tab === 'crm' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#e8f0fe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔗</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>AmoCRM интеграция</div>
              <div style={{ fontSize:12, color:'var(--c-muted)' }}>Заявки из бота автоматически попадают в CRM</div>
            </div>
          </div>

          <div style={{ background:'var(--c-surface2)', borderRadius:10, padding:14, marginBottom:20, fontSize:13, lineHeight:1.7 }}>
            <div style={{ fontWeight:500, marginBottom:6 }}>Как это работает:</div>
            <div style={{ color:'var(--c-muted)' }}>
              1. Клиент пишет боту «записаться», «заявка», «цена»<br/>
              2. Бот автоматически создаёт сделку в AmoCRM<br/>
              3. Также сделка создаётся при «Соединить с менеджером»
            </div>
          </div>

          <div className="field-label">Домен AmoCRM</div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <input type="text" value={form.amocrm_domain||''}
              onChange={e => setForm(f=>({...f, amocrm_domain:e.target.value.replace('.amocrm.ru','')}))}
              placeholder="ваш-домен" style={{ flex:1 }} />
            <span style={{ color:'var(--c-muted)', fontSize:13, whiteSpace:'nowrap' }}>.amocrm.ru</span>
          </div>

          <div className="field-label">Токен доступа (API ключ)</div>
          <input type="text" value={form.amocrm_token||''}
            onChange={e => setForm(f=>({...f, amocrm_token:e.target.value}))}
            placeholder="eyJ0eXAiOiJKV1QiLCJhbGc..." />

          <div className="field-label">Воронка для новых сделок (ID)</div>
          <input type="text" value={form.amocrm_pipeline_id||''}
            onChange={e => setForm(f=>({...f, amocrm_pipeline_id:e.target.value}))}
            placeholder="12345 (оставьте пустым для воронки по умолчанию)" />

          {form.amocrm_domain && form.amocrm_token && (
            <div style={{ marginTop:16, padding:'12px 14px', background:'var(--c-green-dim)', borderRadius:8, fontSize:13, color:'var(--c-green)' }}>
              ✅ AmoCRM настроен — заявки будут создаваться автоматически
            </div>
          )}
        </div>
      )}
    </div>
  )
}
