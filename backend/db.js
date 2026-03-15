const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'botmaster.db');

let db;

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

setInterval(persist, 10000);
process.on('exit', persist);
process.on('SIGINT', () => { persist(); process.exit(); });

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      name TEXT NOT NULL, plan TEXT DEFAULT 'startup', created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, niche TEXT DEFAULT 'Другое',
      description TEXT DEFAULT '', greeting TEXT DEFAULT 'Привет!', knowledge TEXT DEFAULT '',
      channels TEXT DEFAULT '["site"]', widget_color TEXT DEFAULT '#7c6cf5',
      is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
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
  `);
  persist();
  console.log('✅ База данных готова');
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) { return all(sql, params)[0] || null; }

function run(sql, params = []) { db.run(sql, params); persist(); }

const queries = {
  createUser: (id, email, password, name) => run(`INSERT INTO users (id,email,password,name) VALUES (?,?,?,?)`, [id,email,password,name]),
  getUserByEmail: (email) => get(`SELECT * FROM users WHERE email=?`, [email]),
  getUserById: (id) => get(`SELECT id,email,name,plan,created_at FROM users WHERE id=?`, [id]),

  createBot: (id, uid, name, niche, desc, greeting) => run(`INSERT INTO bots (id,user_id,name,niche,description,greeting) VALUES (?,?,?,?,?,?)`, [id,uid,name,niche,desc,greeting]),
  getBotsByUser: (uid) => all(`SELECT * FROM bots WHERE user_id=? ORDER BY created_at DESC`, [uid]),
  getBotById: (id) => get(`SELECT * FROM bots WHERE id=?`, [id]),
  updateBot: (name,niche,desc,greeting,knowledge,channels,color,active,id,uid) =>
    run(`UPDATE bots SET name=?,niche=?,description=?,greeting=?,knowledge=?,channels=?,widget_color=?,is_active=?,updated_at=datetime('now') WHERE id=? AND user_id=?`,
      [name,niche,desc,greeting,knowledge,channels,color,active,id,uid]),
  deleteBot: (id, uid) => run(`DELETE FROM bots WHERE id=? AND user_id=?`, [id,uid]),

  createConversation: (id, bot_id, channel) => run(`INSERT INTO conversations (id,bot_id,channel) VALUES (?,?,?)`, [id,bot_id,channel]),
  getConversationsByBot: (bot_id) => all(`SELECT * FROM conversations WHERE bot_id=? ORDER BY created_at DESC LIMIT 100`, [bot_id]),

  createMessage: (id, cid, role, content) => run(`INSERT INTO messages (id,conversation_id,role,content) VALUES (?,?,?,?)`, [id,cid,role,content]),
  getMessagesByConv: (cid) => all(`SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC`, [cid]),

  logEvent: (id, bot_id, type, payload) => run(`INSERT INTO analytics_events (id,bot_id,event_type,payload) VALUES (?,?,?,?)`, [id,bot_id,type,payload]),

  getConvCountByBot: (bot_id) => get(`SELECT COUNT(*) as count FROM conversations WHERE bot_id=?`, [bot_id]),
  getMsgCountByBot: (bot_id) => get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.bot_id=?`, [bot_id]),
  getConvByHour: (bot_id) => all(`SELECT strftime('%H',created_at) as hour, COUNT(*) as count FROM conversations WHERE bot_id=? GROUP BY hour ORDER BY hour`, [bot_id]),
  getTopQuestions: (bot_id) => all(`SELECT content, COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.bot_id=? AND m.role='user' GROUP BY content ORDER BY count DESC LIMIT 5`, [bot_id]),
  getConvByStatus: (bot_id) => all(`SELECT status, COUNT(*) as count FROM conversations WHERE bot_id=? GROUP BY status`, [bot_id]),
};

module.exports = { init, queries };
