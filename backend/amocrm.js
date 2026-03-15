// AmoCRM integration — создание контактов и сделок

const fetchFn = (...a) => import('node-fetch').then(m => m.default(...a));

// Ключевые слова которые триггерят создание лида
const LEAD_KEYWORDS = [
  'записаться', 'запись', 'заявка', 'заказать', 'заказ', 'купить', 'цена', 'стоимость',
  'сколько стоит', 'хочу', 'нужна помощь', 'позвоните', 'перезвоните', 'свяжитесь',
  'оставить заявку', 'оставить контакт', 'номер телефона', 'email', 'почта',
];

function isLeadMessage(text) {
  const lower = text.toLowerCase();
  return LEAD_KEYWORDS.some(kw => lower.includes(kw));
}

async function amoRequest(domain, token, method, path, body = null) {
  const url = `https://${domain}.amocrm.ru/api/v4${path}`;
  const res = await fetchFn(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AmoCRM error ${res.status}: ${err}`);
  }
  return res.json();
}

// Создать контакт в AmoCRM
async function createContact(domain, token, name, phone, email) {
  const customFields = [];
  if (phone) customFields.push({ field_code: 'PHONE', values: [{ value: phone, enum_code: 'WORK' }] });
  if (email) customFields.push({ field_code: 'EMAIL', values: [{ value: email, enum_code: 'WORK' }] });

  const data = await amoRequest(domain, token, 'POST', '/contacts', [
    { name: name || 'Клиент из БотМастера', custom_fields_values: customFields }
  ]);
  return data?._embedded?.contacts?.[0]?.id;
}

// Создать сделку в AmoCRM
async function createLead(domain, token, pipelineId, botName, contactId, message) {
  const body = [{
    name: `Заявка из бота «${botName}»`,
    pipeline_id: pipelineId ? parseInt(pipelineId) : undefined,
    _embedded: contactId ? { contacts: [{ id: contactId }] } : undefined,
    custom_fields_values: [{
      field_code: 'DESCRIPTION',
      values: [{ value: `Сообщение клиента: ${message}` }]
    }]
  }];

  const data = await amoRequest(domain, token, 'POST', '/leads', body);
  return data?._embedded?.leads?.[0]?.id;
}

// Получить список воронок
async function getPipelines(domain, token) {
  const data = await amoRequest(domain, token, 'GET', '/leads/pipelines');
  return data?._embedded?.pipelines || [];
}

// Главная функция — создать лид из диалога
async function createLeadFromChat(bot, clientName, clientContact, lastMessage) {
  if (!bot.amocrm_domain || !bot.amocrm_token) return false;

  try {
    let phone = null;
    let email = null;

    // Определяем тип контакта
    if (clientContact) {
      if (clientContact.includes('@')) email = clientContact;
      else phone = clientContact;
    }

    const contactId = await createContact(bot.amocrm_domain, bot.amocrm_token, clientName, phone, email);
    const leadId = await createLead(bot.amocrm_domain, bot.amocrm_token, bot.amocrm_pipeline_id, bot.name, contactId, lastMessage);

    console.log(`✅ AmoCRM: создана сделка #${leadId} для бота ${bot.name}`);
    return leadId;
  } catch(e) {
    console.error(`AmoCRM error for bot ${bot.id}:`, e.message);
    return false;
  }
}

module.exports = { createLeadFromChat, getPipelines, isLeadMessage };
