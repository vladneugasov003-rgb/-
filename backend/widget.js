// БотМастер — встраиваемый виджет чата
// Вставьте этот тег на ваш сайт:
// <script src="https://botmaster.ru/widget.js" data-bot="BOT_ID"></script>

(function() {
  const script = document.currentScript || document.querySelector('script[data-bot]');
  if (!script) return;

  const BOT_ID = script.getAttribute('data-bot');
  const COLOR = script.getAttribute('data-color') || '#7c6cf5';
  const API = script.getAttribute('data-api') || 'https://fearless-possibility-production-d961.up.railway.app';

  if (!BOT_ID) return;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #bm-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
    #bm-btn {
      position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; background: ${COLOR}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 999998; transition: transform .2s;
    }
    #bm-btn:hover { transform: scale(1.08); }
    #bm-btn svg { width: 24px; height: 24px; fill: #fff; }
    #bm-chat {
      position: fixed; bottom: 92px; right: 24px; width: 340px; height: 480px;
      border-radius: 16px; background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      z-index: 999999; display: none; flex-direction: column; overflow: hidden;
      transition: opacity .2s, transform .2s; opacity: 0; transform: translateY(12px);
    }
    #bm-chat.open { display: flex; opacity: 1; transform: translateY(0); }
    #bm-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      background: ${COLOR}; color: #fff; flex-shrink: 0;
    }
    #bm-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;
    }
    #bm-title { font-size: 14px; font-weight: 600; }
    #bm-status { font-size: 11px; opacity: 0.85; }
    #bm-close { margin-left: auto; background: none; border: none; cursor: pointer; color: #fff; font-size: 20px; line-height: 1; opacity: 0.8; }
    #bm-close:hover { opacity: 1; }
    #bm-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #f8f8fc; }
    .bm-msg { display: flex; gap: 8px; max-width: 85%; }
    .bm-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .bm-bubble {
      padding: 9px 13px; border-radius: 12px; font-size: 13px; line-height: 1.5;
    }
    .bm-msg.bot .bm-bubble { background: #fff; border-radius: 4px 12px 12px 12px; color: #1a1a1a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .bm-msg.user .bm-bubble { background: ${COLOR}; color: #fff; border-radius: 12px 4px 12px 12px; }
    .bm-typing span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ccc; animation: bm-blink 1.2s infinite; }
    .bm-typing span:nth-child(2) { animation-delay: .2s; }
    .bm-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes bm-blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
    #bm-suggestions { padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap; background: #f8f8fc; border-top: 1px solid #eee; }
    .bm-sug { font-size: 11px; padding: 4px 10px; border: 1px solid #ddd; border-radius: 12px; cursor: pointer; background: #fff; color: #555; white-space: nowrap; }
    .bm-sug:hover { background: #f0effe; border-color: ${COLOR}; color: ${COLOR}; }
    #bm-input-row { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid #eee; flex-shrink: 0; background: #fff; }
    #bm-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 13px; outline: none; color: #1a1a1a; }
    #bm-input:focus { border-color: ${COLOR}; }
    #bm-send { width: 34px; height: 34px; border-radius: 50%; background: ${COLOR}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    #bm-send svg { width: 14px; height: 14px; fill: #fff; }
    #bm-powered { text-align: center; padding: 4px; font-size: 10px; color: #bbb; background: #fff; }
    #bm-powered a { color: #bbb; text-decoration: none; }
    #bm-powered a:hover { color: ${COLOR}; }
    #bm-transfer { padding: 0 12px 8px; }
    .bm-transfer-btn { font-size: 11px; color: #888; background: none; border: none; cursor: pointer; padding: 4px 0; text-decoration: underline; }
    .bm-transfer-form { background: #f8f8fc; border-radius: 10px; padding: 12px; margin-top: 6px; }
    .bm-transfer-form input { width: 100%; margin-bottom: 6px; padding: 7px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; }
    .bm-transfer-form-btns { display: flex; gap: 6px; }
    .bm-transfer-submit { flex: 1; padding: 7px; background: ${COLOR}; color: #fff; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; }
    .bm-transfer-cancel { padding: 7px 12px; background: #eee; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; }
    @media (max-width: 400px) { #bm-chat { right: 8px; left: 8px; width: auto; } #bm-btn { bottom: 16px; right: 16px; } }
  `;
  document.head.appendChild(style);

  // Widget HTML
  const widget = document.createElement('div');
  widget.id = 'bm-widget';
  widget.innerHTML = `
    <button id="bm-btn" aria-label="Открыть чат">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
    </button>
    <div id="bm-chat">
      <div id="bm-header">
        <div id="bm-avatar">Б</div>
        <div>
          <div id="bm-title">Помощник</div>
          <div id="bm-status">онлайн</div>
        </div>
        <button id="bm-close">×</button>
      </div>
      <div id="bm-msgs"></div>
      <div id="bm-suggestions"></div>
    <div id="bm-transfer"></div>
      <div id="bm-input-row">
        <input id="bm-input" placeholder="Напишите вопрос..." />
        <button id="bm-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="bm-powered">Работает на <a href="https://botmaster.ru" target="_blank">БотМастере</a></div>
    </div>
  `;
  document.body.appendChild(widget);

  // State
  let convId = null;
  let botInfo = null;
  let isOpen = false;
  let suggestions = ['Какие у вас цены?', 'Как записаться?', 'Режим работы', 'Где вы находитесь?'];

  const chat = document.getElementById('bm-chat');
  const msgs = document.getElementById('bm-msgs');
  const input = document.getElementById('bm-input');
  const sugsEl = document.getElementById('bm-suggestions');

  // Load bot info
  fetch(`${API}/api/widget/${BOT_ID}`)
    .then(r => r.json())
    .then(bot => {
      botInfo = bot;
      document.getElementById('bm-avatar').textContent = bot.name?.[0] || 'Б';
      document.getElementById('bm-title').textContent = bot.name || 'Помощник';
      if (bot.widget_color) {
        document.getElementById('bm-btn').style.background = bot.widget_color;
        document.getElementById('bm-header').style.background = bot.widget_color;
        document.getElementById('bm-send').style.background = bot.widget_color;
      }
      // Show greeting
      addMsg('bot', bot.greeting || 'Привет! Чем могу помочь?');
      renderSuggestions();
    })
    .catch(() => addMsg('bot', 'Привет! Чем могу помочь?'));

  function renderSuggestions() {
    sugsEl.innerHTML = suggestions.map(s =>
      `<button class="bm-sug" onclick="document.getElementById('bm-input').value='${s}';document.getElementById('bm-input').focus()">${s}</button>`
    ).join('');
  }

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = `bm-msg ${role}`;
    div.innerHTML = `<div class="bm-bubble">${text.replace(/\n/g,'<br>')}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'bm-msg bot';
    div.id = 'bm-typing';
    div.innerHTML = `<div class="bm-bubble bm-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('bm-typing');
    if (t) t.remove();
  }


  let transferShown = false;

  function showTransferBtn() {
    const el = document.getElementById('bm-transfer');
    if (!convId || transferShown) return;
    el.innerHTML = '<button class="bm-transfer-btn" onclick="showTransferForm()">🙋 Соединить с менеджером</button>';
  }

  window.showTransferForm = function() {
    const el = document.getElementById('bm-transfer');
    el.innerHTML = `<div class="bm-transfer-form">
      <div style="font-size:12px;font-weight:600;margin-bottom:8px">Оставьте контакт:</div>
      <input id="bm-t-name" type="text" placeholder="Ваше имя" />
      <input id="bm-t-contact" type="text" placeholder="Телефон или email" />
      <div class="bm-transfer-form-btns">
        <button class="bm-transfer-submit" onclick="submitTransfer()">Отправить</button>
        <button class="bm-transfer-cancel" onclick="cancelTransfer()">Отмена</button>
      </div>
    </div>`;
  };

  window.submitTransfer = async function() {
    const name = document.getElementById('bm-t-name')?.value;
    const contact = document.getElementById('bm-t-contact')?.value;
    try {
      await fetch(`${API}/api/widget/${BOT_ID}/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, client_name: name, client_contact: contact })
      });
      document.getElementById('bm-transfer').innerHTML = '';
      transferShown = true;
      addMsg('bot', '✅ Запрос передан менеджеру. Ожидайте — с вами свяжутся!');
    } catch(e) {}
  };

  window.cancelTransfer = function() {
    document.getElementById('bm-transfer').innerHTML = '<button class="bm-transfer-btn" onclick="showTransferForm()">🙋 Соединить с менеджером</button>';
  };

  async function sendMsg() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sugsEl.innerHTML = '';
    addMsg('user', text);
    showTyping();

    try {
      const res = await fetch(`${API}/api/widget/${BOT_ID}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: convId })
      });
      const data = await res.json();
      removeTyping();
      if (data.reply) {
        convId = data.conversation_id;
        addMsg('bot', data.reply);
        setTimeout(showTransferBtn, 2000);
      }
    } catch(e) {
      removeTyping();
      addMsg('bot', 'Извините, произошла ошибка. Попробуйте позже.');
    }
  }

  // Toggle
  document.getElementById('bm-btn').onclick = () => {
    isOpen = !isOpen;
    chat.classList.toggle('open', isOpen);
    if (isOpen) setTimeout(() => input.focus(), 100);
  };
  document.getElementById('bm-close').onclick = () => {
    isOpen = false;
    chat.classList.remove('open');
  };
  document.getElementById('bm-send').onclick = sendMsg;
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
})();
