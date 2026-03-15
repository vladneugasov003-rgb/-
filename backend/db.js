const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'botmaster.db');
let db;

function persist() {
  try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); } catch(e) {}
}

setInterval(persist, 5000);
process.on('exit', persist);
process.on('SIGINT', () => { persist(); process.exit(); });

async function init() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      name TEXT NOT NULL, plan TEXT DEFAULT 'trial',
      trial_ends_at DATETIME DEFAULT (datetime('now', '+14 days')),
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      started_at DATETIME DEFAULT (datetime('now')),
      ends_at DATETIME,
      payment_id TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      niche TEXT DEFAULT 'Другое', description TEXT DEFAULT '',
      greeting TEXT DEFAULT 'Привет! Чем могу помочь?',
      knowledge TEXT DEFAULT '', channels TEXT DEFAULT '["site"]',
      widget_color TEXT DEFAULT '#7c6cf5', is_active INTEGER DEFAULT 1,
      telegram_token TEXT DEFAULT '', telegram_webhook_set INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, channel TEXT DEFAULT 'preview',
      status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, event_type TEXT NOT NULL,
      payload TEXT DEFAULT '{}', created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL,
      amount INTEGER NOT NULL, status TEXT DEFAULT 'pending',
      yukassa_id TEXT, created_at DATETIME DEFAULT (datetime('now'))
    );
  `);
  persist();
  console.log('✅ База данных готова');
}

function all(sql, p=[]) { const s=db.prepare(sql); s.bind(p); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r; }
function get(sql, p=[]) { return all(sql,p)[0]||null; }
function run(sql, p=[]) { db.run(sql,p); persist(); }

const PLANS = {
  trial:    { name:'Пробный',    price:0,    bots:3,   dialogs:100,  telegram:true,  analytics:true  },
  free:     { name:'Бесплатный', price:0,    bots:1,   dialogs:30,   telegram:false, analytics:false },
  starter:  { name:'Старт',      price:790,  bots:3,   dialogs:500,  telegram:true,  analytics:false },
  business: { name:'Бизнес',     price:1990, bots:10,  dialogs:2000, telegram:true,  analytics:true  },
  pro:      { name:'Про',        price:3990, bots:999, dialogs:9999, telegram:true,  analytics:true  },
};

function getUserPlan(user) {
  if (!user) return PLANS.free;
  if (user.plan === 'trial') {
    const trialEnd = new Date(user.trial_ends_at);
    if (new Date() < trialEnd) return { ...PLANS.trial, trial_ends_at: user.trial_ends_at };
    return PLANS.free;
  }
  return PLANS[user.plan] || PLANS.free;
}

const queries = {
  PLANS, getUserPlan,
  createUser: (id,e,p,n) => run(`INSERT INTO users (id,email,password,name) VALUES (?,?,?,?)`,[id,e,p,n]),
  getUserByEmail: (e) => get(`SELECT * FROM users WHERE email=?`,[e]),
  getUserById: (id) => get(`SELECT * FROM users WHERE id=?`,[id]),
  updateUserPlan: (plan, id) => run(`UPDATE users SET plan=? WHERE id=?`,[plan,id]),

  createBot: (id,uid,name,niche,desc,greeting) => run(`INSERT INTO bots (id,user_id,name,niche,description,greeting) VALUES (?,?,?,?,?,?)`,[id,uid,name,niche,desc,greeting]),
  getBotsByUser: (uid) => all(`SELECT * FROM bots WHERE user_id=? ORDER BY created_at DESC`,[uid]),
  getBotById: (id) => get(`SELECT * FROM bots WHERE id=?`,[id]),
  getBotByToken: (token) => get(`SELECT * FROM bots WHERE telegram_token=?`,[token]),
  updateBot: (name,niche,desc,greeting,knowledge,channels,color,active,token,id,uid) =>
    run(`UPDATE bots SET name=?,niche=?,description=?,greeting=?,knowledge=?,channels=?,widget_color=?,is_active=?,telegram_token=?,updated_at=datetime('now') WHERE id=? AND user_id=?`,
      [name,niche,desc,greeting,knowledge,channels,color,active,token,id,uid]),
  deleteBot: (id,uid) => run(`DELETE FROM bots WHERE id=? AND user_id=?`,[id,uid]),
  setTelegramWebhook: (id, val) => run(`UPDATE bots SET telegram_webhook_set=? WHERE id=?`,[val,id]),

  createConversation: (id,bot_id,channel) => run(`INSERT INTO conversations (id,bot_id,channel) VALUES (?,?,?)`,[id,bot_id,channel]),
  getConversationsByBot: (bot_id) => all(`SELECT * FROM conversations WHERE bot_id=? ORDER BY created_at DESC LIMIT 100`,[bot_id]),
  getMonthlyConvCount: (bot_id) => get(`SELECT COUNT(*) as count FROM conversations WHERE bot_id=? AND created_at >= datetime('now','start of month')`,[bot_id]),

  createMessage: (id,cid,role,content) => run(`INSERT INTO messages (id,conversation_id,role,content) VALUES (?,?,?,?)`,[id,cid,role,content]),
  getMessagesByConv: (cid) => all(`SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC`,[cid]),

  logEvent: (id,bot_id,type,payload) => run(`INSERT INTO analytics_events (id,bot_id,event_type,payload) VALUES (?,?,?,?)`,[id,bot_id,type,payload]),
  getConvCountByBot: (bot_id) => get(`SELECT COUNT(*) as count FROM conversations WHERE bot_id=?`,[bot_id]),
  getMsgCountByBot: (bot_id) => get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.bot_id=?`,[bot_id]),
  getConvByHour: (bot_id) => all(`SELECT strftime('%H',created_at) as hour, COUNT(*) as count FROM conversations WHERE bot_id=? GROUP BY hour ORDER BY hour`,[bot_id]),
  getTopQuestions: (bot_id) => all(`SELECT content, COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.bot_id=? AND m.role='user' GROUP BY content ORDER BY count DESC LIMIT 5`,[bot_id]),
  getConvByStatus: (bot_id) => all(`SELECT status, COUNT(*) as count FROM conversations WHERE bot_id=? GROUP BY status`,[bot_id]),

  createPayment: (id,uid,plan,amount) => run(`INSERT INTO payments (id,user_id,plan,amount) VALUES (?,?,?,?)`,[id,uid,plan,amount]),
  updatePayment: (status,yukassa_id,id) => run(`UPDATE payments SET status=?,yukassa_id=? WHERE id=?`,[status,yukassa_id,id]),
  getPayment: (id) => get(`SELECT * FROM payments WHERE id=?`,[id]),
  getUserPayments: (uid) => all(`SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC`,[uid]),
};

module.exports = { init, queries };
