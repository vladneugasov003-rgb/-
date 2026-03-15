require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');
const { init, queries } = require('./db');
const { send, emails, ADMIN_EMAIL } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'botmaster-dev-secret';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const YUKASSA_SHOP = process.env.YUKASSA_SHOP_ID || '';
const YUKASSA_KEY = process.env.YUKASSA_SECRET_KEY || '';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Middlewares ───────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Неверный токен' }); }
}

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Доступ запрещён' });
  next();
}

function checkPlan(feature) {
  return (req, res, next) => {
    const user = queries.getUserById(req.user.id);
    const plan = queries.getUserPlan(user);
    req.plan = plan; req.userFull = user;
    if (feature === 'telegram' && !plan.telegram)
      return res.status(403).json({ error: 'Telegram доступен от тарифа «Старт»', upgrade: true });
    if (feature === 'analytics' && !plan.analytics)
      return res.status(403).json({ error: 'Аналитика доступна от тарифа «Бизнес»', upgrade: true });
    next();
  };
}

const fetchFn = (...a) => import('node-fetch').then(m => m.default(...a));

async function askAI(bot, history) {
  const system = `Ты AI-ассистент бизнеса.\nНазвание: ${bot.name}\nНиша: ${bot.niche}\nОписание: ${bot.description}\nБаза знаний: ${bot.knowledge||'не задана'}\nОтвечай коротко (2-4 предложения), дружелюбно, на русском языке.`;
  const resp = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:400, system, messages: history })
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

  // Send welcome email
  const tpl = emails.welcome(name);
  send(email, tpl.subject, tpl.html);
  // Notify admin
  if (ADMIN_EMAIL) { const a = emails.newUser(name, email); send(ADMIN_EMAIL, a.subject, a.html); }

  res.json({ token, user: { id, email, name, plan: user.plan, trial_ends_at: user.trial_ends_at, plan_info: plan } });
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
  res.json({ ...user, password:undefined, plan_info: queries.getUserPlan(user) });
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const users = queries.getAllUsers();
  const bots = queries.getAllBots();
  const totalConvs = queries.getTotalConversations();
  const totalMsgs = queries.getTotalMessages();
  const byPlan = users.reduce((acc, u) => { acc[u.plan] = (acc[u.plan]||0)+1; return acc; }, {});
  const recentUsers = users.slice(0,10);
  res.json({ total_users: users.length, total_bots: bots.length,
    total_conversations: totalConvs, total_messages: totalMsgs,
    by_plan: byPlan, recent_users: recentUsers.map(u => ({...u, password:undefined})) });
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  const users = queries.getAllUsers().map(u => ({
    ...u, password:undefined,
    bot_count: queries.getBotsByUser(u.id).length,
    plan_info: queries.getUserPlan(u)
  }));
  res.json(users);
});

app.put('/api/admin/users/:id/plan', adminAuth, (req, res) => {
  const { plan } = req.body;
  queries.updateUserPlan(plan, req.params.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/plans', (_, res) => res.json(queries.PLANS));

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/payments/create', auth, async (req, res) => {
  const { plan } = req.body;
  const planInfo = queries.PLANS[plan];
  if (!planInfo || planInfo.price === 0) return res.status(400).json({ error:'Неверный тариф' });
  const paymentId = uuid();
  queries.createPayment(paymentId, req.user.id, plan, planInfo.price);

  if (!YUKASSA_SHOP || !YUKASSA_KEY) {
    queries.updateUserPlan(plan, req.user.id);
    queries.updatePayment('succeeded', 'demo_'+paymentId, paymentId);
    const user = queries.getUserById(req.user.id);
    const tpl = emails.paymentSuccess(user.name, planInfo.name, planInfo.price);
    send(user.email, tpl.subject, tpl.html);
    return res.json({ success:true, demo:true, message:`Тариф «${planInfo.name}» активирован` });
  }
  try {
    const resp = await fetchFn('https://api.yookassa.ru/v3/payments', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Idempotence-Key':paymentId,
        'Authorization':'Basic '+Buffer.from(`${YUKASSA_SHOP}:${YUKASSA_KEY}`).toString('base64') },
      body: JSON.stringify({ amount:{ value:planInfo.price.toFixed(2), currency:'RUB' },
        confirmation:{ type:'redirect', return_url:`${BASE_URL}/dashboard?payment=${paymentId}` },
        capture:true, description:`БотМастер — тариф «${planInfo.name}»`,
        metadata:{ payment_id:paymentId, user_id:req.user.id, plan } })
    });
    const data = await resp.json();
    if (data.id) { queries.updatePayment('pending', data.id, paymentId); res.json({ confirmation_url:data.confirmation.confirmation_url }); }
    else throw new Error(data.description||'Ошибка ЮКасса');
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/payments/webhook', (req, res) => {
  res.json({ ok:true });
  const ev = req.body;
  if (ev?.event === 'payment.succeeded') {
    const m = ev.object?.metadata;
    if (m?.payment_id && m?.user_id && m?.plan) {
      queries.updatePayment('succeeded', ev.object.id, m.payment_id);
      queries.updateUserPlan(m.plan, m.user_id);
      const user = queries.getUserById(m.user_id);
      const plan = queries.PLANS[m.plan];
      if (user && plan) { const t = emails.paymentSuccess(user.name, plan.name, plan.price); send(user.email, t.subject, t.html); }
    }
  }
});

app.get('/api/payments/history', auth, (req, res) => res.json(queries.getUserPayments(req.user.id)));

// ════════════════════════════════════════════════════════════════════════════
// BOTS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/bots', auth, (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  res.json(bots.map(b => ({ ...b, channels:JSON.parse(b.channels||'[]'), conv_count:(queries.getConvCountByBot(b.id)||{}).count||0 })));
});

app.post('/api/bots', auth, checkPlan(), (req, res) => {
  const bots = queries.getBotsByUser(req.user.id);
  if (bots.length >= req.plan.bots)
    return res.status(403).json({ error:`Лимит ${req.plan.bots} ботов на вашем тарифе`, upgrade:true });
  const { name, niche='Другое', description='', greeting='Привет! Чем могу помочь?' } = req.body;
  if (!name) return res.status(400).json({ error:'Укажите название' });
  const id = uuid();
  queries.createBot(id, req.user.id, name, niche, description, greeting);
  const bot = queries.getBotById(id);
  res.json({ ...bot, channels:JSON.parse(bot.channels||'[]') });
});

app.get('/api/bots/:id', auth, (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  res.json({ ...bot, channels:JSON.parse(bot.channels||'[]') });
});

app.put('/api/bots/:id', auth, async (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  const { name=bot.name, niche=bot.niche, description=bot.description, greeting=bot.greeting,
    knowledge=bot.knowledge, channels=JSON.parse(bot.channels||'[]'),
    widget_color=bot.widget_color, is_active=bot.is_active, telegram_token=bot.telegram_token||'',
    vk_token=bot.vk_token||'', vk_group_id=bot.vk_group_id||'', vk_confirm_code=bot.vk_confirm_code||'' } = req.body;

  if (telegram_token && telegram_token !== bot.telegram_token) {
    try {
      await fetchFn(`https://api.telegram.org/bot${telegram_token}/setWebhook`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ url:`${BASE_URL}/api/telegram/webhook/${telegram_token}` })
      });
      queries.setTelegramWebhook(req.params.id, 1);
    } catch(e) { console.error('TG webhook:', e.message); }
  }

  queries.updateBot(name,niche,description,greeting,knowledge,JSON.stringify(channels),widget_color,is_active?1:0,telegram_token,vk_token,vk_group_id,vk_confirm_code,req.params.id,req.user.id);
  const updated = queries.getBotById(req.params.id);
  res.json({ ...updated, channels:JSON.parse(updated.channels||'[]') });
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
  const monthlyCount = (queries.getMonthlyConvCount(req.params.id)||{}).count||0;
  if (monthlyCount >= req.plan.dialogs)
    return res.status(403).json({ error:`Лимит ${req.plan.dialogs} диалогов/мес исчерпан`, upgrade:true });
  const { message, conversation_id } = req.body;
  if (!message) return res.status(400).json({ error:'Нет сообщения' });
  let convId = conversation_id;
  if (!convId) { convId = uuid(); queries.createConversation(convId, bot.id, 'preview'); }
  queries.createMessage(uuid(), convId, 'user', message);
  const history = queries.getMessagesByConv(convId).map(m => ({ role:m.role, content:m.content }));
  try {
    const reply = await askAI(bot, history);
    queries.createMessage(uuid(), convId, 'assistant', reply);
    res.json({ reply, conversation_id:convId });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC WIDGET API (no auth — for embedding on client websites)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/widget/:botId/config', async (req, res) => {
  const bot = queries.getBotById(req.params.botId);
  if (!bot || !bot.is_active) return res.status(404).json({ error:'Бот не найден' });
  res.json({ id:bot.id, name:bot.name, greeting:bot.greeting, widget_color:bot.widget_color });
});

app.post('/api/widget/:botId/message', async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error:'AI не настроен' });
  const bot = queries.getBotById(req.params.botId);
  if (!bot || !bot.is_active) return res.status(404).json({ error:'Бот не найден' });

  const owner = queries.getUserById(bot.user_id);
  const plan = queries.getUserPlan(owner);
  const monthlyCount = (queries.getMonthlyConvCount(bot.id)||{}).count||0;
  if (monthlyCount >= plan.dialogs) return res.status(429).json({ error:'Лимит диалогов исчерпан' });

  const { message, session_id } = req.body;
  if (!message) return res.status(400).json({ error:'Нет сообщения' });

  let convId = session_id;
  if (!convId) { convId = uuid(); queries.createConversation(convId, bot.id, 'widget'); }
  queries.createMessage(uuid(), convId, 'user', message);
  const history = queries.getMessagesByConv(convId).slice(-10).map(m => ({ role:m.role, content:m.content }));
  try {
    const reply = await askAI(bot, history);
    queries.createMessage(uuid(), convId, 'assistant', reply);
    res.json({ reply, session_id:convId });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Widget JS script (embed on any website)
app.get('/widget.js', (req, res) => {
  const botId = req.query.bot;
  const apiBase = BASE_URL;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){
var botId="${botId}",api="${apiBase}",sid=null,open=false;
var style=document.createElement('style');
style.textContent='#bm-widget *{box-sizing:border-box;font-family:-apple-system,Arial,sans-serif}#bm-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:var(--bm-color,#7c6cf5);border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;z-index:9999}#bm-box{position:fixed;bottom:90px;right:24px;width:340px;height:480px;border-radius:16px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;z-index:9998}#bm-box.open{display:flex}#bm-head{padding:14px 16px;display:flex;align-items:center;gap:10px;color:#fff}#bm-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8f8fc}#bm-inp-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #eee;background:#fff}.bm-msg{padding:9px 13px;border-radius:10px;font-size:13px;line-height:1.5;max-width:85%;width:fit-content}.bm-bot{background:#fff;border:1px solid #eee;border-radius:4px 10px 10px 10px}.bm-user{background:var(--bm-color,#7c6cf5);color:#fff;align-self:flex-end;border-radius:10px 4px 10px 10px}#bm-input{flex:1;padding:8px 12px;border:1px solid #e0e0e8;border-radius:20px;font-size:13px;outline:none}#bm-send{width:34px;height:34px;border-radius:50%;background:var(--bm-color,#7c6cf5);border:none;cursor:pointer;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center}';
document.head.appendChild(style);
fetch(api+'/api/widget/'+botId+'/config').then(r=>r.json()).then(cfg=>{
  var color=cfg.widget_color||'#7c6cf5';
  var html='<div id="bm-widget"><button id="bm-btn" style="--bm-color:'+color+'"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 4h16a1 1 0 011 1v10a1 1 0 01-1 1H8l-4 4V5a1 1 0 011-1z" fill="white"/></svg></button><div id="bm-box"><div id="bm-head" style="background:'+color+'"><div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:600">'+cfg.name[0]+'</div><div><div style="font-size:13px;font-weight:600">'+cfg.name+'</div><div style="font-size:11px;opacity:.8">онлайн</div></div></div><div id="bm-msgs"><div class="bm-msg bm-bot">'+cfg.greeting+'</div></div><div id="bm-inp-row"><input id="bm-input" placeholder="Написать..."/><button id="bm-send" style="--bm-color:'+color+'">→</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  document.getElementById('bm-btn').onclick=function(){open=!open;document.getElementById('bm-box').classList.toggle('open',open)};
  function sendMsg(){var inp=document.getElementById('bm-input'),text=inp.value.trim();if(!text)return;inp.value='';
    var msgs=document.getElementById('bm-msgs');
    msgs.insertAdjacentHTML('beforeend','<div class="bm-msg bm-user">'+text+'</div>');
    msgs.insertAdjacentHTML('beforeend','<div class="bm-msg bm-bot" id="bm-typing">...</div>');
    msgs.scrollTop=msgs.scrollHeight;
    fetch(api+'/api/widget/'+botId+'/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,session_id:sid})}).then(r=>r.json()).then(d=>{sid=d.session_id;var t=document.getElementById('bm-typing');if(t)t.textContent=d.reply||'Ошибка';msgs.scrollTop=msgs.scrollHeight});
  }
  document.getElementById('bm-send').onclick=sendMsg;
  document.getElementById('bm-input').onkeydown=function(e){if(e.key==='Enter')sendMsg()};
}).catch(function(){console.warn('БотМастер widget: bot not found')});
})();`);
});

// ════════════════════════════════════════════════════════════════════════════
// TELEGRAM
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/telegram/webhook/:token', async (req, res) => {
  res.json({ ok:true });
  if (!ANTHROPIC_KEY) return;
  const token = req.params.token;
  const msg = req.body?.message || req.body?.edited_message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const bot = queries.getBotByToken(token);
  if (!bot) return;
  try {
    const owner = queries.getUserById(bot.user_id);
    const plan = queries.getUserPlan(owner);
    const count = (queries.getMonthlyConvCount(bot.id)||{}).count||0;
    if (count >= plan.dialogs) { await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:'Бот временно недоступен.'}) }); return; }
    let conv = queries.getConversationsByBot(bot.id).find(c => c.channel===`tg_${chatId}`);
    if (!conv) { const cid=uuid(); queries.createConversation(cid,bot.id,`tg_${chatId}`); conv={id:cid}; }
    queries.createMessage(uuid(),conv.id,'user',msg.text);
    const history = queries.getMessagesByConv(conv.id).slice(-10).map(m=>({role:m.role,content:m.content}));
    const reply = await askAI(bot, history);
    queries.createMessage(uuid(),conv.id,'assistant',reply);
    await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:reply})});
  } catch(e) { console.error('TG error:',e.message); }
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS & DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/bots/:id/analytics', auth, checkPlan('analytics'), (req, res) => {
  const bot = queries.getBotById(req.params.id);
  if (!bot || bot.user_id !== req.user.id) return res.status(404).json({ error:'Не найден' });
  const totalConvs=(queries.getConvCountByBot(req.params.id)||{}).count||0;
  const totalMsgs=(queries.getMsgCountByBot(req.params.id)||{}).count||0;
  const byHour=queries.getConvByHour(req.params.id);
  const hourly=Array.from({length:24},(_,h)=>{const f=byHour.find(r=>parseInt(r.hour)===h);return{hour:h,count:f?f.count:0}});
  res.json({total_conversations:totalConvs,total_messages:totalMsgs,avg_messages_per_conv:totalConvs>0?+(totalMsgs/totalConvs).toFixed(1):0,hourly,top_questions:queries.getTopQuestions(req.params.id),by_status:queries.getConvByStatus(req.params.id)});
});

app.get('/api/dashboard', auth, (req, res) => {
  const user=queries.getUserById(req.user.id);
  const plan=queries.getUserPlan(user);
  const bots=queries.getBotsByUser(req.user.id);
  let totalConvs=0,totalMsgs=0;
  const enriched=bots.map(b=>{const convs=(queries.getConvCountByBot(b.id)||{}).count||0;const msgs=(queries.getMsgCountByBot(b.id)||{}).count||0;totalConvs+=convs;totalMsgs+=msgs;return{...b,channels:JSON.parse(b.channels||'[]'),conv_count:convs,msg_count:msgs}});
  res.json({bots:enriched,total_bots:bots.length,total_conversations:totalConvs,total_messages:totalMsgs,mrr:bots.filter(b=>b.is_active).length*1590,plan_info:plan,user:{...user,password:undefined}});
});

app.get('/api/health', (_,res)=>res.json({status:'ok'}));

// Serve frontend
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*',(req,res)=>{ if(!req.path.startsWith('/api')&&req.path!=='/widget.js') res.sendFile(path.join(publicDir,'index.html')); });
}

init().then(()=>{
  app.listen(PORT,()=>{
    console.log(`\n✅ БотМастер запущен: http://localhost:${PORT}`);
    console.log(`   ANTHROPIC_KEY: ${ANTHROPIC_KEY?'✓':'✗ не задан'}`);
    console.log(`   Email: ${process.env.SMTP_USER?'✓ '+process.env.SMTP_USER:'✗ не настроен'}`);
    console.log(`   YUKASSA: ${YUKASSA_SHOP?'✓':'✗ демо-режим'}\n`);
  });
}).catch(e=>{console.error('Ошибка:',e);process.exit(1)});
