require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');
const { init, queries } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'botmaster-dev-secret';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const YUKASSA_SHOP = process.env.YUKASSA_SHOP_ID || '';
const YUKASSA_KEY = process.env.YUKASSA_SECRET_KEY || '';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Неверный токен' }); }
}

// ── Plan limits middleware ───────────────────────────────────────────────────
function checkPlan(feature) {
  return (req, res, next) => {
    const user = queries.getUserById(req.user.id);
    const plan = queries.getUserPlan(user);
    req.plan = plan;
    req.userFull = user;
    if (feature === 'telegram' && !plan.telegram)
      return res.status(403).json({ error: 'Telegram доступен от тарифа «Старт». Обновите план.', upgrade: true });
    if (feature === 'analytics' && !plan.analytics)
      return res.status(403).json({ error: 'Аналитика доступна от тарифа «Бизнес». Обновите план.', upgrade: true });
    next();
  };
}

// ── Fetch helper ─────────────────────────────────────────────────────────────
const fetchFn = (...a) => import('node-fetch').then(m => m.default(...a));

// ── AI helper ─────────────────────────────────────────────────────────────────
async function askAI(bot, history) {
  const system = `Ты AI-ассистент бизнеса.\nНазвание: ${bot.name}\nНиша: ${bot.niche}\nОписание: ${bot.description}\nБаза знаний: ${bot.knowledge||'не задана'}\nОтвечай коротко (2-4 предложения), дружелюбно, на русском.`;
  const resp = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:400, system, messages:history })
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || 'Не смог обработать запрос.';
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email||!password||!name) return res.status(400).json({ error:'Заполните все поля' });
  if (queries.getUserByEmail(email)) return res.status(400).json({ error:'Email уже зарегистрирован' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();
  queries.createUser(id, email, hashed, name);
  const user = queries.getUserById(id);
  const plan = queries.getUserPlan(user);
  const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn:'30d' });
  res.json({ token, user: { ...user, password:undefined, plan_info: plan } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = queries.getUserByEmail(email);
  if (!user) return res.status(400).json({ error:'Пользователь не найден' });
  if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error:'Неверный пароль' });
  const plan = queries.getUserPlan(user);
  const token = jwt.sign({ id:user.id, email:user.email }, JWT_SECRET, { expiresIn:'30d' });
  res.json({ token, user: { id:user.id, email:user.email, name:user.name, plan:user.plan, trial_ends_at:user.trial_ends_at, plan_info:plan } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = queries.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error:'Не найден' });
  const plan = queries.getUserPlan(user);
  res.json({ ...user, password:undefined, plan_info:plan });
});

// ════════════════════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/plans', (req, res) => {
  res.json(queries.PLANS);
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS (ЮКасса)
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/payments/create', auth, async (req, res) => {
  const { plan } = req.body;
  const planInfo = queries.PLANS[plan];
  if (!planInfo || planInfo.price === 0) return res.status(400).json({ error:'Неверный тариф' });

  const paymentId = uuid();
  queries.createPayment(paymentId, req.user.id, plan, planInfo.price);

  if (!YUKASSA_SHOP || !YUKASSA_KEY) {
    // Demo mode — activate plan immediately
    queries.updateUserPlan(plan, req.user.id);
    queries.updatePayment('succeeded', 'demo_' + paymentId, paymentId);
    return res.json({ success: true, demo: true, message: 'Тариф активирован (тестовый режим без ЮКасса)' });
  }

  try {
    const resp = await fetchFn('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': paymentId,
        'Authorization': 'Basic ' + Buffer.from(`${YUKASSA_SHOP}:${YUKASSA_KEY}`).toString('base64')
      },
      body: JSON.stringify({
        amount: { value: planInfo.price.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: `${BASE_URL}/dashboard?payment=${paymentId}` },
        capture: true,
        description: `БотМастер — тариф «${planInfo.name}»`,
        metadata: { payment_id: paymentId, user_id: req.user.id, plan }
      })
    });
    const data = await resp.json();
    if (data.id) {
      queries.updatePayment('pending', data.id, paymentId);
      res.json({ confirmation_url: data.confirmation.confirmation_url });
    } else {
      throw new Error(data.description || 'Ошибка ЮКасса');
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payments/webhook', express.json({ type: '*/*' }), (req, res) => {
  const event = req.body;
  if (event?.event === 'payment.succeeded') {
    const meta = event.object?.metadata;
    if (meta?.payment_id && meta?.user_id && meta?.plan) {
      queries.updatePayment('succeeded', event.object.id, meta.payment_id);
      queries.updateUserPlan(meta.plan, meta.user_id);
      console.log(`✅ Оплата подтверждена: ${meta.user_id} → ${meta.plan}`);
    }
  }
  res.json({ ok: true });
});

app.get('/api/payments/history', auth, (req, res) => {
  res.json(queries.getUserPayments(req.user.id));
});

// ════════════════════════════════════════════════════════════════════════════
// BOTS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/bots', auth, (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  res.json(bots.map(b => ({
    ...b,
    channels: JSON.parse(b.channels||'[]'),
    conv_count: (queries.getConvCountByBot(b.id)||{}).count||0
  })));
});

app.post('/api/bots', auth, checkPlan(), (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  const limit = req.plan.bots;
  if (bots.length >= limit)
    return res.status(403).json({ error:`Лимит ${limit} ботов на вашем тарифе. Обновите план.`, upgrade:true });
  const { name, niche='Другое', description='', greeting='Привет! Чем могу помочь?' } = req.body;
  if (!name) return res.status(400).json({ error:'Укажите название' });
  const id = uuid();
  queries.createBot(id, req.user.id, name, niche, description, greeting);
  const bot = queries.getBotById(id);
  res.json({ ...bot, channels: JSON.parse(bot.channels||'[]') });
});

app.get('/api/bots/:id', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  res.json({ ...bot, channels: JSON.parse(bot.channels||'[]') });
});

app.put('/api/bots/:id', auth, async (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  const {
    name=bot.name, niche=bot.niche, description=bot.description, greeting=bot.greeting,
    knowledge=bot.knowledge, channels=JSON.parse(bot.channels||'[]'),
    widget_color=bot.widget_color, is_active=bot.is_active,
    telegram_token=bot.telegram_token||''
  } = req.body;

  // Register Telegram webhook if token changed
  if (telegram_token && telegram_token !== bot.telegram_token) {
    try {
      const webhookUrl = `${BASE_URL}/api/telegram/webhook/${telegram_token}`;
      await fetchFn(`https://api.telegram.org/bot${telegram_token}/setWebhook`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ url: webhookUrl })
      });
      queries.setTelegramWebhook(req.params.id, 1);
      console.log(`✅ Telegram webhook set for bot ${req.params.id}`);
    } catch(e) {
      console.error('Telegram webhook error:', e.message);
    }
  }

  queries.updateBot(name,niche,description,greeting,knowledge,JSON.stringify(channels),widget_color,is_active?1:0,telegram_token,req.params.id,req.user.id);
  const updated = queries.getBotById(req.params.id);
  res.json({ ...updated, channels: JSON.parse(updated.channels||'[]') });
});

app.delete('/api/bots/:id', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  queries.deleteBot(req.params.id, req.user.id);
  res.json({ ok:true });
});

// ════════════════════════════════════════════════════════════════════════════
// CHAT
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/bots/:id/chat', auth, checkPlan(), async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error:'ANTHROPIC_API_KEY не настроен' });
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Бот не найден' });

  // Check dialog limit
  const monthlyCount = (queries.getMonthlyConvCount(req.params.id)||{}).count||0;
  if (monthlyCount >= req.plan.dialogs)
    return res.status(403).json({ error:`Лимит ${req.plan.dialogs} диалогов/месяц исчерпан. Обновите тариф.`, upgrade:true });

  const { message, conversation_id } = req.body;
  if (!message) return res.status(400).json({ error:'Нет сообщения' });

  let convId = conversation_id;
  if (!convId) { convId = uuid(); queries.createConversation(convId, bot.id, 'preview'); }
  queries.createMessage(uuid(), convId, 'user', message);

  const history = queries.getMessagesByConv(convId).map(m => ({ role:m.role, content:m.content }));
  try {
    const reply = await askAI(bot, history);
    queries.createMessage(uuid(), convId, 'assistant', reply);
    res.json({ reply, conversation_id: convId });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/telegram/webhook/:token', async (req, res) => {
  res.json({ ok: true }); // respond immediately
  if (!ANTHROPIC_KEY) return;

  const token = req.params.token;
  const update = req.body;
  const msg = update?.message || update?.edited_message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const text = msg.text;
  const bot = queries.getBotByToken(token);
  if (!bot) return;

  try {
    // Check owner's plan
    const owner = queries.getUserById(bot.user_id);
    const plan = queries.getUserPlan(owner);
    const monthlyCount = (queries.getMonthlyConvCount(bot.id)||{}).count||0;
    if (monthlyCount >= plan.dialogs) {
      await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ chat_id:chatId, text:'Бот временно недоступен. Попробуйте позже.' })
      });
      return;
    }

    // Get or create conversation for this chat
    let conv = queries.getConversationsByBot(bot.id).find(c => c.channel === `tg_${chatId}`);
    if (!conv) {
      const cid = uuid();
      queries.createConversation(cid, bot.id, `tg_${chatId}`);
      conv = { id: cid };
    }

    queries.createMessage(uuid(), conv.id, 'user', text);
    const history = queries.getMessagesByConv(conv.id).slice(-10).map(m => ({ role:m.role, content:m.content }));
    const reply = await askAI(bot, history);
    queries.createMessage(uuid(), conv.id, 'assistant', reply);

    await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id:chatId, text:reply })
    });
  } catch(e) {
    console.error('Telegram error:', e.message);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS & DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/bots/:id/analytics', auth, checkPlan('analytics'), (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  const totalConvs = (queries.getConvCountByBot(req.params.id)||{}).count||0;
  const totalMsgs = (queries.getMsgCountByBot(req.params.id)||{}).count||0;
  const byHour = queries.getConvByHour(req.params.id);
  const hourly = Array.from({length:24},(_,h)=>{ const f=byHour.find(r=>parseInt(r.hour)===h); return {hour:h,count:f?f.count:0}; });
  res.json({ total_conversations:totalConvs, total_messages:totalMsgs,
    avg_messages_per_conv:totalConvs>0?+(totalMsgs/totalConvs).toFixed(1):0,
    hourly, top_questions:queries.getTopQuestions(req.params.id), by_status:queries.getConvByStatus(req.params.id) });
});

app.get('/api/dashboard', auth, (req, res) => {
  const user = queries.getUserById(req.user.id);
  const plan = queries.getUserPlan(user);
  const bots = queries.getBotsByUser(req.user.id);
  let totalConvs=0, totalMsgs=0;
  const enriched = bots.map(b => {
    const convs=(queries.getConvCountByBot(b.id)||{}).count||0;
    const msgs=(queries.getMsgCountByBot(b.id)||{}).count||0;
    totalConvs+=convs; totalMsgs+=msgs;
    return {...b, channels:JSON.parse(b.channels||'[]'), conv_count:convs, msg_count:msgs};
  });
  res.json({ bots:enriched, total_bots:bots.length, total_conversations:totalConvs,
    total_messages:totalMsgs, mrr:bots.filter(b=>b.is_active).length*1590,
    plan_info:plan, user:{...user,password:undefined} });
});

app.get('/api/health', (_,res) => res.json({ status:'ok' }));

// Serve frontend
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req,res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(publicDir,'index.html'));
  });
}

init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ БотМастер запущен: http://localhost:${PORT}`);
    console.log(`   ANTHROPIC_KEY: ${ANTHROPIC_KEY?'✓':'✗ не задан'}`);
    console.log(`   YUKASSA: ${YUKASSA_SHOP?'✓':'✗ демо-режим (без оплаты)'}\n`);
  });
}).catch(e => { console.error('Ошибка:', e); process.exit(1); });
