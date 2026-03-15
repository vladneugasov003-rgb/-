require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { init, queries } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'botmaster-dev-secret';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Неверный токен' }); }
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Заполните все поля' });
  if (queries.getUserByEmail(email)) return res.status(400).json({ error: 'Email уже зарегистрирован' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();
  queries.createUser(id, email, hashed, name);
  const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id, email, name, plan: 'startup' } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = queries.getUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Неверный пароль' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = queries.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  res.json(user);
});

app.get('/api/bots', auth, (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  const enriched = bots.map(b => {
    const cc = queries.getConvCountByBot(b.id);
    return { ...b, channels: JSON.parse(b.channels || '[]'), conv_count: cc ? cc.count : 0 };
  });
  res.json(enriched);
});

app.post('/api/bots', auth, (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  if (bots.length >= 5) return res.status(400).json({ error: 'Лимит 5 ботов' });
  const { name, niche = 'Другое', description = '', greeting = 'Привет! Чем могу помочь?' } = req.body;
  if (!name) return res.status(400).json({ error: 'Укажите название' });
  const id = uuid();
  queries.createBot(id, req.user.id, name, niche, description, greeting);
  const bot = queries.getBotById(id);
  res.json({ ...bot, channels: JSON.parse(bot.channels || '[]') });
});

app.get('/api/bots/:id', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error: 'Не найден' });
  res.json({ ...bot, channels: JSON.parse(bot.channels || '[]') });
});

app.put('/api/bots/:id', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error: 'Не найден' });
  const { name=bot.name, niche=bot.niche, description=bot.description, greeting=bot.greeting,
    knowledge=bot.knowledge, channels=JSON.parse(bot.channels), widget_color=bot.widget_color, is_active=bot.is_active } = req.body;
  queries.updateBot(name, niche, description, greeting, knowledge, JSON.stringify(channels), widget_color, is_active ? 1 : 0, req.params.id, req.user.id);
  const updated = queries.getBotById(req.params.id);
  res.json({ ...updated, channels: JSON.parse(updated.channels || '[]') });
});

app.delete('/api/bots/:id', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error: 'Не найден' });
  queries.deleteBot(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.post('/api/bots/:id/chat', auth, async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY не настроен в .env' });
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error: 'Бот не найден' });
  const { message, conversation_id } = req.body;
  if (!message) return res.status(400).json({ error: 'Нет сообщения' });

  let convId = conversation_id;
  if (!convId) {
    convId = uuid();
    queries.createConversation(convId, bot.id, 'preview');
  }
  queries.createMessage(uuid(), convId, 'user', message);

  const history = queries.getMessagesByConv(convId).map(m => ({ role: m.role, content: m.content }));
  const system = `Ты AI-ассистент бизнеса.\nНазвание: ${bot.name}\nНиша: ${bot.niche}\nОписание: ${bot.description}\nБаза знаний: ${bot.knowledge || 'не задана'}\nОтвечай коротко и по-русски.`;

  try {
    const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, system, messages: history })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    const reply = data.content?.[0]?.text || 'Ошибка ответа';
    queries.createMessage(uuid(), convId, 'assistant', reply);
    res.json({ reply, conversation_id: convId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bots/:id/analytics', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error: 'Не найден' });
  const totalConvs = (queries.getConvCountByBot(req.params.id) || {}).count || 0;
  const totalMsgs = (queries.getMsgCountByBot(req.params.id) || {}).count || 0;
  const byHour = queries.getConvByHour(req.params.id);
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const found = byHour.find(r => parseInt(r.hour) === h);
    return { hour: h, count: found ? found.count : 0 };
  });
  res.json({
    total_conversations: totalConvs, total_messages: totalMsgs,
    avg_messages_per_conv: totalConvs > 0 ? +(totalMsgs / totalConvs).toFixed(1) : 0,
    hourly, top_questions: queries.getTopQuestions(req.params.id),
    by_status: queries.getConvByStatus(req.params.id)
  });
});

app.get('/api/dashboard', auth, (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  let totalConvs = 0, totalMsgs = 0;
  const enriched = bots.map(b => {
    const convs = (queries.getConvCountByBot(b.id) || {}).count || 0;
    const msgs = (queries.getMsgCountByBot(b.id) || {}).count || 0;
    totalConvs += convs; totalMsgs += msgs;
    return { ...b, channels: JSON.parse(b.channels || '[]'), conv_count: convs, msg_count: msgs };
  });
  res.json({ bots: enriched, total_bots: bots.length, total_conversations: totalConvs, total_messages: totalMsgs, mrr: bots.filter(b => b.is_active).length * 1590 });
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

init().then(() => {
  app.listen(PORT, () => {
    console.log('\n✅ БотМастер API запущен: http://localhost:' + PORT);
    console.log('   ANTHROPIC_KEY: ' + (ANTHROPIC_KEY ? '✓ настроен' : '✗ не задан (добавьте в .env)') + '\n');
  });
}).catch(e => {
  console.error('Ошибка запуска БД:', e);
  process.exit(1);
});

// Serve frontend static files in production
const path = require('path');
const fs = require('fs');
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}
