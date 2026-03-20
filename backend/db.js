// Database layer — supports both PostgreSQL (production) and SQLite (local dev)
// Uses DATABASE_URL env var for PostgreSQL, falls back to SQLite

const USE_PG = !!process.env.DATABASE_URL;

let pgPool = null;
let sqliteDb = null;

// ── PostgreSQL setup ──────────────────────────────────────────────────────────
async function initPg() {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      name TEXT NOT NULL, plan TEXT DEFAULT 'trial',
      trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
      referral TEXT DEFAULT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      niche TEXT DEFAULT 'Другое', description TEXT DEFAULT '',
      greeting TEXT DEFAULT 'Привет! Чем могу помочь?', knowledge TEXT DEFAULT '',
      channels TEXT DEFAULT '["site"]', widget_color TEXT DEFAULT '#7c6cf5',
      is_active INTEGER DEFAULT 1, telegram_token TEXT DEFAULT '',
      telegram_webhook_set INTEGER DEFAULT 0, vk_token TEXT DEFAULT '',
      vk_group_id TEXT DEFAULT '', vk_confirm_code TEXT DEFAULT '',
      amocrm_domain TEXT DEFAULT '', amocrm_token TEXT DEFAULT '',
      amocrm_pipeline_id TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, channel TEXT DEFAULT 'preview',
      status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, event_type TEXT NOT NULL,
      payload TEXT DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL,
      amount INTEGER NOT NULL, status TEXT DEFAULT 'pending',
      yukassa_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migrations — add columns if they don't exist
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_code TEXT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_expires TIMESTAMPTZ DEFAULT NULL`,
  ];
  for (const sql of migrations) {
    try { await pgPool.query(sql); } catch(e) {}
  }

  console.log('✅ PostgreSQL готов');
}

// ── SQLite setup (local dev fallback) ────────────────────────────────────────
async function initSqlite() {
  const initSqlJs = require('sql.js');
  const fs = require('fs');
  const path = require('path');
  const DB_PATH = path.join(__dirname, 'botmaster.db');

  const SQL = await initSqlJs();
  sqliteDb = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();

  const persist = () => {
    try { fs.writeFileSync(DB_PATH, Buffer.from(sqliteDb.export())); } catch(e) {}
  };
  setInterval(persist, 5000);
  process.on('exit', persist);
  process.on('SIGINT', () => { persist(); process.exit(); });

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      name TEXT NOT NULL, plan TEXT DEFAULT 'trial',
      trial_ends_at DATETIME DEFAULT (datetime('now', '+14 days')),
      referral TEXT DEFAULT NULL, created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      niche TEXT DEFAULT 'Другое', description TEXT DEFAULT '',
      greeting TEXT DEFAULT 'Привет!', knowledge TEXT DEFAULT '',
      channels TEXT DEFAULT '["site"]', widget_color TEXT DEFAULT '#7c6cf5',
      is_active INTEGER DEFAULT 1, telegram_token TEXT DEFAULT '',
      telegram_webhook_set INTEGER DEFAULT 0, vk_token TEXT DEFAULT '',
      vk_group_id TEXT DEFAULT '', vk_confirm_code TEXT DEFAULT '',
      amocrm_domain TEXT DEFAULT '', amocrm_token TEXT DEFAULT '',
      amocrm_pipeline_id TEXT DEFAULT '',
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
  console.log('✅ SQLite готов (локальная разработка)');
}

// ── Query executor ────────────────────────────────────────────────────────────
// PG uses $1,$2... SQLite uses ?,?...
async function query(sql, params = []) {
  if (USE_PG) {
    const res = await pgPool.query(sql, params);
    return res.rows;
  } else {
    // Convert $1,$2 to ?,? for SQLite
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    const stmt = sqliteDb.prepare(sqliteSql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

async function run(sql, params = []) {
  if (USE_PG) {
    await pgPool.query(sql, params);
  } else {
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    sqliteDb.run(sqliteSql, params);
  }
}

async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// ── Plans ─────────────────────────────────────────────────────────────────────
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

// ── Queries ───────────────────────────────────────────────────────────────────
const queries = {
  PLANS, getUserPlan,

  createUser: (id,e,p,n,ref) => run(
    `INSERT INTO users (id,email,password,name,referral) VALUES ($1,$2,$3,$4,$5)`,
    [id,e,p,n,ref||null]),
  getUserByEmail: (e) => getOne(`SELECT * FROM users WHERE email=$1`,[e]),
  getUserById: (id) => getOne(`SELECT * FROM users WHERE id=$1`,[id]),
  updateUserPlan: (plan,id) => run(`UPDATE users SET plan=$1 WHERE id=$2`,[plan,id]),
  updateProfile: (name,email,id) => run(`UPDATE users SET name=$1,email=$2 WHERE id=$3`,[name,email,id]),
  updatePassword: (hash,id) => run(`UPDATE users SET password=$1 WHERE id=$2`,[hash,id]),
  setVerifyCode: (code,expires,id) => run(`UPDATE users SET verify_code=$1,verify_expires=$2 WHERE id=$3`,[code,expires,id]),
  verifyEmail: (id) => run(`UPDATE users SET email_verified=TRUE,verify_code=NULL WHERE id=$1`,[id]),

  createBot: (id,uid,name,niche,desc,greeting) => run(
    `INSERT INTO bots (id,user_id,name,niche,description,greeting) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id,uid,name,niche,desc,greeting]),
  getBotsByUser: (uid) => query(`SELECT * FROM bots WHERE user_id=$1 ORDER BY created_at DESC`,[uid]),
  getBotById: (id) => getOne(`SELECT * FROM bots WHERE id=$1`,[id]),
  getBotByToken: (token) => getOne(`SELECT * FROM bots WHERE telegram_token=$1`,[token]),
  updateBot: (name,niche,desc,greeting,knowledge,channels,color,active,tg,vk,vkgid,vkcode,amo,amotok,amopipe,id,uid) =>
    run(`UPDATE bots SET name=$1,niche=$2,description=$3,greeting=$4,knowledge=$5,channels=$6,
         widget_color=$7,is_active=$8,telegram_token=$9,vk_token=$10,vk_group_id=$11,
         vk_confirm_code=$12,amocrm_domain=$13,amocrm_token=$14,amocrm_pipeline_id=$15,
         updated_at=NOW() WHERE id=$16 AND user_id=$17`,
    [name,niche,desc,greeting,knowledge,channels,color,active,tg,vk,vkgid,vkcode,amo,amotok,amopipe,id,uid]),
  deleteBot: (id,uid) => run(`DELETE FROM bots WHERE id=$1 AND user_id=$2`,[id,uid]),
  setTelegramWebhook: (id,val) => run(`UPDATE bots SET telegram_webhook_set=$1 WHERE id=$2`,[val,id]),

  createConversation: (id,bot_id,channel) => run(
    `INSERT INTO conversations (id,bot_id,channel) VALUES ($1,$2,$3)`,[id,bot_id,channel]),
  getConversationsByBot: (bot_id) => query(
    `SELECT * FROM conversations WHERE bot_id=$1 ORDER BY created_at DESC LIMIT 200`,[bot_id]),
  updateConvStatus: (id,status) => run(`UPDATE conversations SET status=$1 WHERE id=$2`,[status,id]),
  getMonthlyConvCount: (bot_id) => getOne(
    `SELECT COUNT(*) as count FROM conversations WHERE bot_id=$1 AND created_at >= date_trunc('month', NOW())`,[bot_id]),

  createMessage: (id,cid,role,content) => run(
    `INSERT INTO messages (id,conversation_id,role,content) VALUES ($1,$2,$3,$4)`,[id,cid,role,content]),
  getMessagesByConv: (cid) => query(
    `SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC`,[cid]),

  logEvent: (id,bot_id,type,payload) => run(
    `INSERT INTO analytics_events (id,bot_id,event_type,payload) VALUES ($1,$2,$3,$4)`,[id,bot_id,type,payload]),
  getConvCountByBot: (bot_id) => getOne(`SELECT COUNT(*) as count FROM conversations WHERE bot_id=$1`,[bot_id]),
  getMsgCountByBot: (bot_id) => getOne(
    `SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.bot_id=$1`,[bot_id]),
  getConvByHour: (bot_id) => query(
    `SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count FROM conversations WHERE bot_id=$1 GROUP BY hour ORDER BY hour`,[bot_id]),
  getTopQuestions: (bot_id) => query(
    `SELECT content, COUNT(*)::int as count FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.bot_id=$1 AND m.role='user' GROUP BY content ORDER BY count DESC LIMIT 5`,[bot_id]),
  getConvByStatus: (bot_id) => query(
    `SELECT status, COUNT(*)::int as count FROM conversations WHERE bot_id=$1 GROUP BY status`,[bot_id]),

  createPayment: (id,uid,plan,amount) => run(
    `INSERT INTO payments (id,user_id,plan,amount) VALUES ($1,$2,$3,$4)`,[id,uid,plan,amount]),
  updatePayment: (status,yukassa_id,id) => run(
    `UPDATE payments SET status=$1,yukassa_id=$2 WHERE id=$3`,[status,yukassa_id,id]),
  getPayment: (id) => getOne(`SELECT * FROM payments WHERE id=$1`,[id]),
  getUserPayments: (uid) => query(`SELECT * FROM payments WHERE user_id=$1 ORDER BY created_at DESC`,[uid]),

  getAllUsers: () => query(`SELECT id,email,name,plan,trial_ends_at,created_at FROM users ORDER BY created_at DESC`),
  getAllPayments: () => query(
    `SELECT p.*,u.email,u.name FROM payments p LEFT JOIN users u ON p.user_id=u.id ORDER BY p.created_at DESC LIMIT 200`),
  getAdminStats: async () => {
    const [users, paying, revenue, bots, convs, today] = await Promise.all([
      getOne(`SELECT COUNT(*) as c FROM users`),
      getOne(`SELECT COUNT(*) as c FROM users WHERE plan NOT IN ('free','trial')`),
      getOne(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='succeeded'`),
      getOne(`SELECT COUNT(*) as c FROM bots`),
      getOne(`SELECT COUNT(*) as c FROM conversations`),
      getOne(`SELECT COUNT(*) as c FROM users WHERE created_at >= CURRENT_DATE`),
    ]);
    return {
      total_users: parseInt(users?.c||0), paying_users: parseInt(paying?.c||0),
      total_revenue: parseInt(revenue?.s||0), total_bots: parseInt(bots?.c||0),
      total_conversations: parseInt(convs?.c||0), today_registrations: parseInt(today?.c||0),
    };
  },
};

// SQLite compat for getAdminStats (sync version)
if (!USE_PG) {
  const origGetAdminStats = queries.getAdminStats;
  queries.getAdminStats = async () => {
    const r = (sql) => { const rows = []; const s=sqliteDb.prepare(sql); while(s.step()) rows.push(s.getAsObject()); s.free(); return rows[0]||{}; };
    return {
      total_users: parseInt(r(`SELECT COUNT(*) as c FROM users`)?.c||0),
      paying_users: parseInt(r(`SELECT COUNT(*) as c FROM users WHERE plan NOT IN ('free','trial')`)?.c||0),
      total_revenue: parseInt(r(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='succeeded'`)?.s||0),
      total_bots: parseInt(r(`SELECT COUNT(*) as c FROM bots`)?.c||0),
      total_conversations: parseInt(r(`SELECT COUNT(*) as c FROM conversations`)?.c||0),
      today_registrations: parseInt(r(`SELECT COUNT(*) as c FROM users WHERE created_at >= date('now')`)?.c||0),
    };
  };
}

async function init() {
  if (USE_PG) await initPg();
  else await initSqlite();
}

module.exports = { init, queries };
