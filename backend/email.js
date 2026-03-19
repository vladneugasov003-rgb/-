const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const FROM_NAME = 'БотМастер';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || SMTP_USER;

let transporter = null;
function getT() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return transporter;
}

async function send(to, subject, html) {
  const t = getT();
  if (!t) { console.log(`[Email skip] ${subject} -> ${to}`); return false; }
  try {
    await t.sendMail({ from: `"${FROM_NAME}" <${SMTP_USER}>`, to, subject, html });
    console.log(`✉️  ${subject} -> ${to}`);
    return true;
  } catch(e) { console.error('Email error:', e.message); return false; }
}

const S = 'font-family:-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a2e';
const B = 'display:inline-block;padding:12px 28px;background:#7c6cf5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin-top:20px';
const logo = '<div style="font-size:24px;font-weight:700;color:#7c6cf5;margin-bottom:24px">Б БотМастер</div>';
const foot = '<hr style="margin:32px 0;border:none;border-top:1px solid #eee"><p style="font-size:12px;color:#888">БотМастер · Орёл · ФСИ 2026</p>';

function wrap(inner) {
  return `<div style="${S}">${logo}${inner}${foot}</div>`;
}

const emails = {
  welcome: (to, name, days = 14) => send(to,
    `Добро пожаловать в БотМастер, ${name}! 🎉`,
    wrap(`
      <h2>Привет, ${name}! 👋</h2>
      <p>У вас активирован <b>пробный период на ${days} дней</b> с возможностями тарифа «Бизнес».</p>
      <ul style="margin:12px 0;padding-left:20px;line-height:2"><li>До 10 ботов</li><li>Telegram + сайт</li><li>2000 диалогов/мес</li><li>Аналитика</li></ul>
      <a href="${BASE_URL}/dashboard" style="${B}">Открыть платформу →</a>
    `)
  ),

  trialEnding: (to, name, days) => send(to,
    `⚠️ Пробный период заканчивается через ${days} дня`,
    wrap(`
      <h2>Осталось ${days} дня, ${name}</h2>
      <p>После окончания аккаунт перейдёт на бесплатный тариф (1 бот, 30 диалогов/мес).</p>
      <a href="${BASE_URL}/pricing" style="${B}">Выбрать тариф →</a>
    `)
  ),

  paymentSuccess: (to, name, plan, amount) => send(to,
    `✅ Оплата подтверждена — тариф «${plan}»`,
    wrap(`
      <h2>Спасибо за оплату! 🎉</h2>
      <p>Платёж <b>${amount}₽</b> прошёл. Тариф <b>«${plan}»</b> активирован.</p>
      <a href="${BASE_URL}/dashboard" style="${B}">Личный кабинет →</a>
    `)
  ),

  adminNewUser: (to, name, email) => send(to,
    `🆕 Новый пользователь: ${name}`,
    wrap(`
      <h2>Новая регистрация</h2>
      <p><b>Имя:</b> ${name}<br><b>Email:</b> ${email}<br><b>Время:</b> ${new Date().toLocaleString('ru')}</p>
      <a href="${BASE_URL}/admin" style="${B}">Панель администратора →</a>
    `)
  ),

  transferAlert: (to, ownerName, botName, clientName, clientContact, convId) => send(to,
    `🙋 Клиент хочет поговорить с менеджером — ${botName}`,
    wrap(`
      <h2 style="color:#1a1a2e;margin-bottom:12px">Запрос на связь с менеджером</h2>
      <p style="color:#444;margin-bottom:20px">Клиент бота <strong>${botName}</strong> просит соединить с живым менеджером.</p>
      <div style="background:#f0effe;border-radius:12px;padding:20px;margin-bottom:20px">
        <div style="font-weight:600;margin-bottom:8px">Данные клиента:</div>
        <div style="color:#666">Имя: <strong>${clientName || 'не указано'}</strong></div>
        <div style="color:#666;margin-top:4px">Контакт: <strong>${clientContact || 'не указан'}</strong></div>
      </div>
      <a href="${BASE_URL}/bots/${convId ? `?conv=${convId}` : ''}" style="display:inline-block;background:#7c6cf5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Посмотреть диалог →
      </a>
      <p style="color:#888;font-size:13px;margin-top:20px">Ответьте клиенту как можно быстрее!</p>
    `)
  ),
};

module.exports = emails;
