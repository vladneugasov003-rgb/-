require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');
const { init, queries } = require('./db');
const emails = require('./email');
const { createLeadFromChat, getPipelines, isLeadMessage } = require('./amocrm');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'botmaster-dev-secret';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const YUKASSA_SHOP = process.env.YUKASSA_SHOP_ID || '';
const YUKASSA_KEY = process.env.YUKASSA_SECRET_KEY || '';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-change-me';

// ── SECURITY & CORS ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  BASE_URL,
  'https://www.botmasterai.ru',
  'https://botmasterai.ru',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile, curl, webhooks)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, true); // TODO: tighten in production
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── RATE LIMITING (in-memory) ────────────────────────────────────────────────
const rateLimitStore = new Map();

function rateLimit({ windowMs = 60000, max = 60, keyFn, message = 'Слишком много запросов, попробуйте позже' }) {
  // Cleanup old entries every 5 min
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore) {
      if (now - data.start > windowMs * 2) rateLimitStore.delete(key);
    }
  }, 300000);

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.ip || req.connection.remoteAddress);
    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { count: 0, start: now };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    next();
  };
}

// Global: 120 req/min per IP
app.use('/api/', rateLimit({ windowMs: 60000, max: 120 }));

// Strict: auth endpoints — 10 req/min
app.use('/api/auth/login', rateLimit({ windowMs: 60000, max: 10, message: 'Слишком много попыток входа' }));
app.use('/api/auth/register', rateLimit({ windowMs: 60000, max: 5, message: 'Слишком много регистраций' }));

// AI chat: 30 req/min per user
const chatLimiter = rateLimit({
  windowMs: 60000, max: 30,
  keyFn: (req) => req.user?.id || req.ip,
  message: 'Лимит сообщений — 30 в минуту'
});

// Widget chat: 20 req/min per IP
const widgetChatLimiter = rateLimit({
  windowMs: 60000, max: 20,
  keyFn: (req) => `widget_${req.ip}`,
  message: 'Подождите немного, слишком много сообщений'
});

// ── ERROR LOGGING ────────────────────────────────────────────────────────────
const errorLog = [];
const MAX_ERROR_LOG = 500;

function logError(context, error, extra = {}) {
  const entry = {
    time: new Date().toISOString(),
    context,
    message: error?.message || String(error),
    stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    ...extra,
  };
  console.error(`❌ [${context}]`, entry.message);
  errorLog.push(entry);
  if (errorLog.length > MAX_ERROR_LOG) errorLog.shift();
}

// ── WIDGET.JS ────────────────────────────────────────────────────────────────
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'widget.js'));
});

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Неверный токен' }); }
}

function adminAuth(req, res, next) {
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) return res.status(403).json({ error: 'Доступ запрещён' });
  next();
}

async function checkPlan(req, res, next, feature) {
  try {
    const user = await queries.getUserById(req.user.id);
    const plan = queries.getUserPlan(user);
    req.plan = plan; req.userFull = user;
    if (feature === 'telegram' && !plan.telegram)
      return res.status(403).json({ error: 'Telegram доступен от тарифа «Старт»', upgrade: true });
    if (feature === 'analytics' && !plan.analytics)
      return res.status(403).json({ error: 'Аналитика доступна от тарифа «Бизнес»', upgrade: true });
    next();
  } catch(e) {
    logError('checkPlan', e);
    res.status(500).json({ error: 'Ошибка проверки тарифа' });
  }
}

const planMw = (f) => (req, res, next) => checkPlan(req, res, next, f);

// ── AI (with retry & friendly errors) ────────────────────────────────────────
const fetchFn = (...a) => import('node-fetch').then(m => m.default(...a));

async function askAI(bot, history, retries = 1) {
  if (!ANTHROPIC_KEY) throw new Error('AI_NOT_CONFIGURED');

  const system = `Ты AI-ассистент бизнеса.\nНазвание: ${bot.name}\nНиша: ${bot.niche}\nОписание: ${bot.description}\nБаза знаний: ${bot.knowledge||'не задана'}\nОтвечай коротко (2-4 предложения), дружелюбно, на русском.`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetchFn('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system,
          messages: history
        })
      });

      const data = await resp.json();

      // Handle specific API errors
      if (data.error) {
        const errType = data.error.type || '';
        const errMsg = data.error.message || '';

        if (errType === 'authentication_error' || errMsg.includes('credit'))
          throw new Error('AI_CREDITS_EXHAUSTED');
        if (errType === 'rate_limit_error') {
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw new Error('AI_RATE_LIMITED');
        }
        if (errType === 'overloaded_error') {
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          throw new Error('AI_OVERLOADED');
        }
        throw new Error(errMsg);
      }

      return data.content?.[0]?.text || 'Не смог обработать запрос.';
    } catch(e) {
      if (e.message.startsWith('AI_')) throw e;
      if (attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// Convert AI errors to user-friendly messages
function friendlyAIError(e) {
  const map = {
    'AI_NOT_CONFIGURED': 'Сервис временно недоступен. Мы уже работаем над этим.',
    'AI_CREDITS_EXHAUSTED': 'Сервис временно недоступен. Попробуйте через несколько минут.',
    'AI_RATE_LIMITED': 'Слишком много запросов. Попробуйте через минуту.',
    'AI_OVERLOADED': 'Сервис перегружен. Попробуйте через минуту.',
  };
  return map[e.message] || 'Произошла ошибка при обработке запроса. Попробуйте ещё раз.';
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, referral } = req.body;
    if (!email||!password||!name) return res.status(400).json({ error:'Заполните все поля' });
    if (password.length < 6) return res.status(400).json({ error:'Пароль минимум 6 символов' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error:'Некорректный email' });
    if (await queries.getUserByEmail(email)) return res.status(400).json({ error:'Email уже зарегистрирован' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuid();
    await queries.createUser(id, email, hashed, name.trim(), referral||null);
    const user = await queries.getUserById(id);
    const plan = queries.getUserPlan(user);
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn:'30d' });
    emails.welcome(email, name, 14).catch(()=>{});
    if (ADMIN_EMAIL) emails.adminNewUser(ADMIN_EMAIL, name, email).catch(()=>{});
    res.json({ token, user: { ...user, password:undefined, plan_info:plan } });
  } catch(e) {
    logError('register', e);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ error:'Заполните все поля' });
    const user = await queries.getUserByEmail(email);
    if (!user) return res.status(400).json({ error:'Пользователь не найден' });
    if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error:'Неверный пароль' });
    const plan = queries.getUserPlan(user);
    const token = jwt.sign({ id:user.id, email:user.email }, JWT_SECRET, { expiresIn:'30d' });
    res.json({ token, user: { id:user.id, email:user.email, name:user.name, plan:user.plan, trial_ends_at:user.trial_ends_at, plan_info:plan } });
  } catch(e) {
    logError('login', e);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await queries.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error:'Не найден' });
    res.json({ ...user, password:undefined, plan_info: queries.getUserPlan(user) });
  } catch(e) {
    logError('me', e);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name) return res.status(400).json({ error:'Укажите имя' });
    const existing = await queries.getUserByEmail(email);
    if (existing && existing.id !== req.user.id) return res.status(400).json({ error:'Email уже занят' });
    await queries.updateProfile(name.trim(), email, req.user.id);
    const user = await queries.getUserById(req.user.id);
    res.json({ ...user, password:undefined });
  } catch(e) {
    logError('profile', e);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

app.put('/api/auth/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error:'Пароль минимум 6 символов' });
    const user = await queries.getUserByEmail(req.user.email);
    if (!await bcrypt.compare(current_password, user.password)) return res.status(400).json({ error:'Неверный текущий пароль' });
    await queries.updatePassword(await bcrypt.hash(new_password, 10), req.user.id);
    res.json({ ok: true });
  } catch(e) {
    logError('password', e);
    res.status(500).json({ error: 'Ошибка смены пароля' });
  }
});

// ── PLANS ─────────────────────────────────────────────────────────────────────
app.get('/api/plans', (_, res) => res.json(queries.PLANS));

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
app.post('/api/payments/create', auth, async (req, res) => {
  const { plan } = req.body;
  const planInfo = queries.PLANS[plan];
  if (!planInfo || planInfo.price === 0) return res.status(400).json({ error:'Неверный тариф' });
  const paymentId = uuid();
  await queries.createPayment(paymentId, req.user.id, plan, planInfo.price);
  if (!YUKASSA_SHOP || !YUKASSA_KEY) {
    await queries.updateUserPlan(plan, req.user.id);
    await queries.updatePayment('succeeded', 'demo_'+paymentId, paymentId);
    const user = await queries.getUserById(req.user.id);
    emails.paymentSuccess(user.email, user.name, planInfo.name, planInfo.price).catch(()=>{});
    return res.json({ success:true, demo:true, message:`Тариф «${planInfo.name}» активирован` });
  }
  try {
    const resp = await fetchFn('https://api.yookassa.ru/v3/payments', {
      method:'POST',
      headers:{ 'Content-Type':'application/json','Idempotence-Key':paymentId,
        'Authorization':'Basic '+Buffer.from(`${YUKASSA_SHOP}:${YUKASSA_KEY}`).toString('base64') },
      body: JSON.stringify({
        amount:{ value:planInfo.price.toFixed(2), currency:'RUB' },
        confirmation:{ type:'redirect', return_url:`${BASE_URL}/dashboard?payment=${paymentId}` },
        capture:true, description:`БотМастер — тариф «${planInfo.name}»`,
        metadata:{ payment_id:paymentId, user_id:req.user.id, plan }
      })
    });
    const data = await resp.json();
    if (data.id) { await queries.updatePayment('pending', data.id, paymentId); res.json({ confirmation_url:data.confirmation.confirmation_url }); }
    else throw new Error(data.description || 'Ошибка ЮКасса');
  } catch(e) {
    logError('payment', e);
    res.status(500).json({ error: 'Ошибка создания платежа. Попробуйте позже.' });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const event = req.body;
    if (event?.event === 'payment.succeeded') {
      const meta = event.object?.metadata;
      if (meta?.payment_id && meta?.user_id && meta?.plan) {
        await queries.updatePayment('succeeded', event.object.id, meta.payment_id);
        await queries.updateUserPlan(meta.plan, meta.user_id);
        const user = await queries.getUserById(meta.user_id);
        const pi = queries.PLANS[meta.plan];
        if (user && pi) emails.paymentSuccess(user.email, user.name, pi.name, pi.price).catch(()=>{});
      }
    }
  } catch(e) { logError('paymentWebhook', e); }
  res.json({ ok:true });
});

app.get('/api/payments/history', auth, async (req, res) => {
  try { res.json(await queries.getUserPayments(req.user.id)); }
  catch(e) { logError('paymentHistory', e); res.status(500).json({ error: 'Ошибка загрузки' }); }
});

// ── BOTS ──────────────────────────────────────────────────────────────────────
app.get('/api/bots', auth, async (req, res) => {
  try {
    const bots = await queries.getBotsByUser(req.user.id);
    const enriched = await Promise.all(bots.map(async b => ({
      ...b, channels:JSON.parse(b.channels||'[]'),
      conv_count: parseInt((await queries.getConvCountByBot(b.id))?.count||0)
    })));
    res.json(enriched);
  } catch(e) {
    logError('getBots', e);
    res.status(500).json({ error: 'Ошибка загрузки ботов' });
  }
});

app.post('/api/bots', auth, planMw(), async (req, res) => {
  try {
    const bots = await queries.getBotsByUser(req.user.id);
    if (bots.length >= req.plan.bots) return res.status(403).json({ error:`Лимит ${req.plan.bots} ботов на тарифе`, upgrade:true });
    const { name, niche='Другое', description='', greeting='Привет! Чем могу помочь?' } = req.body;
    if (!name) return res.status(400).json({ error:'Укажите название' });
    const id = uuid();
    await queries.createBot(id, req.user.id, name.trim(), niche, description, greeting);
    const bot = await queries.getBotById(id);
    res.json({ ...bot, channels:JSON.parse(bot.channels||'[]') });
  } catch(e) {
    logError('createBot', e);
    res.status(500).json({ error: 'Ошибка создания бота' });
  }
});

app.get('/api/bots/:id', auth, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    res.json({ ...bot, channels:JSON.parse(bot.channels||'[]') });
  } catch(e) {
    logError('getBot', e);
    res.status(500).json({ error: 'Ошибка загрузки бота' });
  }
});

app.put('/api/bots/:id', auth, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    const {
      name=bot.name, niche=bot.niche, description=bot.description, greeting=bot.greeting,
      knowledge=bot.knowledge, channels=JSON.parse(bot.channels||'[]'),
      widget_color=bot.widget_color, is_active=bot.is_active,
      telegram_token=bot.telegram_token||'', vk_token=bot.vk_token||'',
      vk_group_id=bot.vk_group_id||'', vk_confirm_code=bot.vk_confirm_code||'',
      amocrm_domain=bot.amocrm_domain||'', amocrm_token=bot.amocrm_token||'',
      amocrm_pipeline_id=bot.amocrm_pipeline_id||''
    } = req.body;

    if (telegram_token && telegram_token !== bot.telegram_token) {
      try {
        await fetchFn(`https://api.telegram.org/bot${telegram_token}/setWebhook`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ url:`${BASE_URL}/api/telegram/webhook/${telegram_token}` })
        });
        await queries.setTelegramWebhook(req.params.id, 1);
      } catch(e) { logError('tgWebhook', e); }
    }

    await queries.updateBot(name,niche,description,greeting,knowledge,JSON.stringify(channels),
      widget_color,is_active?1:0,telegram_token,vk_token,vk_group_id,vk_confirm_code,
      amocrm_domain,amocrm_token,amocrm_pipeline_id,req.params.id,req.user.id);
    const updated = await queries.getBotById(req.params.id);
    res.json({ ...updated, channels:JSON.parse(updated.channels||'[]') });
  } catch(e) {
    logError('updateBot', e);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

app.delete('/api/bots/:id', auth, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    await queries.deleteBot(req.params.id, req.user.id);
    res.json({ ok:true });
  } catch(e) {
    logError('deleteBot', e);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// ── PUBLIC WIDGET ─────────────────────────────────────────────────────────────
app.get('/api/widget/:botId', async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.botId);
    if (!bot || !bot.is_active) return res.status(404).json({ error:'Бот не найден' });
    res.json({ name:bot.name, greeting:bot.greeting, widget_color:bot.widget_color, niche:bot.niche });
  } catch(e) {
    logError('widgetInfo', e);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

app.post('/api/widget/:botId/chat', widgetChatLimiter, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.botId);
    if (!bot || !bot.is_active) return res.status(404).json({ error:'Бот не найден' });
    const owner = await queries.getUserById(bot.user_id);
    const plan = queries.getUserPlan(owner);
    const monthlyCount = parseInt((await queries.getMonthlyConvCount(req.params.botId))?.count||0);
    if (monthlyCount >= plan.dialogs) return res.status(429).json({ error:'Лимит диалогов исчерпан. Попробуйте позже.' });
    const { message, conversation_id } = req.body;
    if (!message) return res.status(400).json({ error:'Нет сообщения' });
    if (message.length > 2000) return res.status(400).json({ error:'Сообщение слишком длинное (макс. 2000 символов)' });
    let convId = conversation_id;
    if (!convId) { convId = uuid(); await queries.createConversation(convId, bot.id, 'widget'); }
    await queries.createMessage(uuid(), convId, 'user', message);
    const history = (await queries.getMessagesByConv(convId)).slice(-10).map(m => ({ role:m.role, content:m.content }));
    const reply = await askAI(bot, history);
    await queries.createMessage(uuid(), convId, 'assistant', reply);
    res.json({ reply, conversation_id:convId });
  } catch(e) {
    logError('widgetChat', e, { botId: req.params.botId });
    res.status(500).json({ error: friendlyAIError(e) });
  }
});

app.post('/api/widget/:botId/transfer', async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.botId);
    if (!bot || !bot.is_active) return res.status(404).json({ error:'Бот не найден' });
    const { conversation_id, client_name, client_contact } = req.body;
    if (conversation_id) await queries.updateConvStatus(conversation_id, 'transferred');
    const owner = await queries.getUserById(bot.user_id);
    if (owner?.email) emails.transferAlert(owner.email, owner.name, bot.name, client_name, client_contact, conversation_id).catch(()=>{});
    if (bot.amocrm_domain && bot.amocrm_token) createLeadFromChat(bot, client_name, client_contact, 'Запрос на связь с менеджером').catch(()=>{});
    res.json({ ok:true });
  } catch(e) {
    logError('widgetTransfer', e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── CHAT (authenticated) ─────────────────────────────────────────────────────
app.post('/api/bots/:id/chat', auth, chatLimiter, planMw(), async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Бот не найден' });
    const monthlyCount = parseInt((await queries.getMonthlyConvCount(req.params.id))?.count||0);
    if (monthlyCount >= req.plan.dialogs) return res.status(403).json({ error:`Лимит ${req.plan.dialogs} диалогов/мес исчерпан`, upgrade:true });
    const { message, conversation_id } = req.body;
    if (!message) return res.status(400).json({ error:'Нет сообщения' });
    if (message.length > 2000) return res.status(400).json({ error:'Сообщение слишком длинное (макс. 2000 символов)' });
    let convId = conversation_id;
    if (!convId) { convId = uuid(); await queries.createConversation(convId, bot.id, 'preview'); }
    await queries.createMessage(uuid(), convId, 'user', message);
    const history = (await queries.getMessagesByConv(convId)).slice(-10).map(m => ({ role:m.role, content:m.content }));
    const reply = await askAI(bot, history);
    await queries.createMessage(uuid(), convId, 'assistant', reply);
    if (bot.amocrm_domain && bot.amocrm_token && isLeadMessage(message)) createLeadFromChat(bot, null, null, message).catch(()=>{});
    res.json({ reply, conversation_id:convId });
  } catch(e) {
    logError('chat', e, { botId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: friendlyAIError(e) });
  }
});

// ── TRANSFER ──────────────────────────────────────────────────────────────────
app.post('/api/bots/:id/transfer', auth, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    const { conversation_id, client_name, client_contact } = req.body;
    if (conversation_id) await queries.updateConvStatus(conversation_id, 'transferred');
    const owner = await queries.getUserById(bot.user_id);
    if (owner?.email) emails.transferAlert(owner.email, owner.name, bot.name, client_name, client_contact, conversation_id).catch(()=>{});
    if (bot.amocrm_domain && bot.amocrm_token) createLeadFromChat(bot, client_name, client_contact, 'Запрос на связь с менеджером').catch(()=>{});
    res.json({ ok:true });
  } catch(e) {
    logError('transfer', e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── CONVERSATIONS ─────────────────────────────────────────────────────────────
app.get('/api/bots/:id/conversations', auth, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    res.json(await queries.getConversationsByBot(req.params.id));
  } catch(e) {
    logError('conversations', e);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

app.get('/api/conversations/:id/messages', auth, async (req, res) => {
  try { res.json(await queries.getMessagesByConv(req.params.id)); }
  catch(e) { logError('messages', e); res.status(500).json({ error: 'Ошибка загрузки' }); }
});

// ── VK ────────────────────────────────────────────────────────────────────────
app.get('/api/vk/webhook/:botId', async (req, res) => {
  const bot = await queries.getBotById(req.params.botId);
  if (!bot) return res.status(404).send('not found');
  res.send(bot.vk_confirm_code || 'ok');
});

app.post('/api/vk/webhook/:botId', async (req, res) => {
  res.send('ok');
  const bot = await queries.getBotById(req.params.botId);
  if (!bot || !bot.is_active || !ANTHROPIC_KEY || !bot.vk_token) return;
  const msg = req.body?.object?.message;
  if (!msg?.text || msg.from_id < 0 || req.body.type === 'confirmation') return;
  const userId = msg.from_id;
  try {
    const owner = await queries.getUserById(bot.user_id);
    const plan = queries.getUserPlan(owner);
    const monthly = parseInt((await queries.getMonthlyConvCount(bot.id))?.count||0);
    if (monthly >= plan.dialogs) return;
    let convs = await queries.getConversationsByBot(bot.id);
    let conv = convs.find(c => c.channel === `vk_${userId}`);
    if (!conv) { const cid = uuid(); await queries.createConversation(cid, bot.id, `vk_${userId}`); conv = {id:cid}; }
    await queries.createMessage(uuid(), conv.id, 'user', msg.text);
    const history = (await queries.getMessagesByConv(conv.id)).slice(-10).map(m => ({ role:m.role, content:m.content }));
    const reply = await askAI(bot, history);
    await queries.createMessage(uuid(), conv.id, 'assistant', reply);
    const rid = Math.floor(Math.random()*1000000);
    await fetchFn(`https://api.vk.com/method/messages.send?user_id=${userId}&message=${encodeURIComponent(reply)}&random_id=${rid}&access_token=${bot.vk_token}&v=5.131`, { method:'POST' });
  } catch(e) { logError('vk', e, { botId: req.params.botId }); }
});

// ── TELEGRAM ──────────────────────────────────────────────────────────────────
app.post('/api/telegram/webhook/:token', async (req, res) => {
  res.json({ ok:true });
  if (!ANTHROPIC_KEY) return;
  const token = req.params.token;
  const msg = req.body?.message || req.body?.edited_message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const bot = await queries.getBotByToken(token);
  if (!bot) return;
  try {
    const owner = await queries.getUserById(bot.user_id);
    const plan = queries.getUserPlan(owner);
    const monthly = parseInt((await queries.getMonthlyConvCount(bot.id))?.count||0);
    if (monthly >= plan.dialogs) return;
    let convs = await queries.getConversationsByBot(bot.id);
    let conv = convs.find(c => c.channel === `tg_${chatId}`);
    if (!conv) { const cid = uuid(); await queries.createConversation(cid, bot.id, `tg_${chatId}`); conv = {id:cid}; }
    await queries.createMessage(uuid(), conv.id, 'user', msg.text);
    const history = (await queries.getMessagesByConv(conv.id)).slice(-10).map(m => ({ role:m.role, content:m.content }));
    const reply = await askAI(bot, history);
    await queries.createMessage(uuid(), conv.id, 'assistant', reply);
    await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id:chatId, text:reply })
    });
  } catch(e) { logError('telegram', e, { botId: bot?.id }); }
});

// ── AMOCRM ────────────────────────────────────────────────────────────────────
app.get('/api/bots/:id/amocrm/pipelines', auth, async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    if (!bot.amocrm_domain || !bot.amocrm_token) return res.status(400).json({ error:'AmoCRM не настроен' });
    res.json(await getPipelines(bot.amocrm_domain, bot.amocrm_token));
  } catch(e) {
    logError('amocrm', e);
    res.status(500).json({ error: 'Ошибка подключения к AmoCRM' });
  }
});

// ── ANALYTICS ────────────────────────────────────────────────────────────────
app.get('/api/bots/:id/analytics', auth, planMw('analytics'), async (req, res) => {
  try {
    const bot = await queries.getBotById(req.params.id);
    if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
    const totalConvs = parseInt((await queries.getConvCountByBot(req.params.id))?.count||0);
    const totalMsgs = parseInt((await queries.getMsgCountByBot(req.params.id))?.count||0);
    const byHour = await queries.getConvByHour(req.params.id);
    const hourly = Array.from({length:24},(_,h) => { const f=byHour.find(r=>parseInt(r.hour)===h); return {hour:h,count:f?parseInt(f.count):0}; });
    res.json({ total_conversations:totalConvs, total_messages:totalMsgs,
      avg_messages_per_conv:totalConvs>0?+(totalMsgs/totalConvs).toFixed(1):0,
      hourly, top_questions:await queries.getTopQuestions(req.params.id),
      by_status:await queries.getConvByStatus(req.params.id) });
  } catch(e) {
    logError('analytics', e);
    res.status(500).json({ error: 'Ошибка загрузки аналитики' });
  }
});

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const user = await queries.getUserById(req.user.id);
    const plan = queries.getUserPlan(user);
    const bots = await queries.getBotsByUser(req.user.id);
    let totalConvs=0, totalMsgs=0;
    const enriched = await Promise.all(bots.map(async b => {
      const convs = parseInt((await queries.getConvCountByBot(b.id))?.count||0);
      const msgs = parseInt((await queries.getMsgCountByBot(b.id))?.count||0);
      totalConvs+=convs; totalMsgs+=msgs;
      return {...b, channels:JSON.parse(b.channels||'[]'), conv_count:convs, msg_count:msgs};
    }));
    res.json({ bots:enriched, total_bots:bots.length, total_conversations:totalConvs,
      total_messages:totalMsgs, mrr:bots.filter(b=>b.is_active).length*1590,
      plan_info:plan, user:{...user,password:undefined} });
  } catch(e) {
    logError('dashboard', e);
    res.status(500).json({ error: 'Ошибка загрузки дашборда' });
  }
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/stats', adminAuth, async (_, res) => {
  try { res.json(await queries.getAdminStats()); }
  catch(e) { logError('adminStats', e); res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/api/admin/users', adminAuth, async (_, res) => {
  try { res.json((await queries.getAllUsers()).map(u => ({...u,password:undefined}))); }
  catch(e) { logError('adminUsers', e); res.status(500).json({ error: 'Ошибка' }); }
});

app.put('/api/admin/users/:id/plan', adminAuth, async (req, res) => {
  const { plan } = req.body;
  if (!queries.PLANS[plan]) return res.status(400).json({ error:'Неверный тариф' });
  await queries.updateUserPlan(plan, req.params.id);
  res.json({ ok:true });
});

app.get('/api/admin/payments', adminAuth, async (_, res) => {
  try { res.json(await queries.getAllPayments()); }
  catch(e) { logError('adminPayments', e); res.status(500).json({ error: 'Ошибка' }); }
});

// Admin: error log
app.get('/api/admin/errors', adminAuth, (_, res) => {
  res.json(errorLog.slice(-100).reverse());
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  db: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
  ai: ANTHROPIC_KEY ? 'configured' : 'missing',
  payments: YUKASSA_SHOP ? 'yukassa' : 'demo',
  uptime: Math.floor(process.uptime()) + 's',
}));

// ── TRIAL ENDING CRON ────────────────────────────────────────────────────────
async function checkTrialEnding() {
  if (!process.env.DATABASE_URL) return; // Only in production
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
    });

    // Users whose trial ends in 3 days
    const result = await pool.query(`
      SELECT id, email, name, trial_ends_at FROM users
      WHERE plan = 'trial'
        AND trial_ends_at > NOW()
        AND trial_ends_at <= NOW() + INTERVAL '3 days'
        AND trial_ends_at > NOW() + INTERVAL '2 days'
    `);

    for (const user of result.rows) {
      const daysLeft = Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000);
      emails.trialEnding(user.email, user.name, daysLeft).catch(() => {});
      console.log(`📧 Trial ending email → ${user.email} (${daysLeft} days left)`);
    }

    // Downgrade expired trials
    const expired = await pool.query(`
      UPDATE users SET plan = 'free'
      WHERE plan = 'trial' AND trial_ends_at <= NOW()
      RETURNING id, email, name
    `);

    for (const user of expired.rows) {
      console.log(`⬇️ Trial expired → ${user.email} downgraded to free`);
    }

    await pool.end();
  } catch(e) {
    logError('trialCron', e);
  }
}

// ── SERVE FRONTEND ───────────────────────────────────────────────────────────
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && req.path !== '/widget.js')
      res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logError('unhandled', err, { path: req.path });
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

process.on('uncaughtException', (e) => logError('uncaughtException', e));
process.on('unhandledRejection', (e) => logError('unhandledRejection', e));

// ── START ────────────────────────────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ БотМастер v3.1 запущен: http://localhost:${PORT}`);
    console.log(`   DB: ${process.env.DATABASE_URL ? 'PostgreSQL ✓' : 'SQLite (локально)'}`);
    console.log(`   AI: ${ANTHROPIC_KEY?'✓':'✗'}`);
    console.log(`   Payments: ${YUKASSA_SHOP?'ЮКасса ✓':'демо-режим'}\n`);
  });

  // Run trial check every 6 hours
  checkTrialEnding();
  setInterval(checkTrialEnding, 6 * 60 * 60 * 1000);
}).catch(e => { console.error('Ошибка запуска:', e); process.exit(1); });
