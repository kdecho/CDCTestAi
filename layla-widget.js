(function () {
  'use strict';

  const API = { chat: '/api/chat', stt: '/api/stt', email: '/api/email' };

  // ─── State ────────────────────────────────────────────────────────────────────
  let messages        = [];
  let mode            = null;       // null | 'chat' | 'voice'
  let isOpen          = false;
  let isLoading       = false;
  let loadingMsgEl    = null;
  let currentLang     = 'en';

  // voice-only state
  let voiceState      = 'idle';     // 'idle' | 'speaking' | 'listening' | 'thinking'
  let mediaRecorder   = null;
  let audioChunks     = [];
  let isRecording     = false;
  let currentUtterance = null;

  // ─── CSS ──────────────────────────────────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.id = 'layla-widget-styles';
    s.textContent = `
      :root {
        --lc-teal:       #0d9488;
        --lc-teal-dark:  #0f766e;
        --lc-teal-light: #ccfbf1;
        --lc-dark:       #1e293b;
        --lc-gray:       #f1f5f9;
        --lc-gray-mid:   #e2e8f0;
        --lc-text:       #334155;
        --lc-white:      #ffffff;
        --lc-red:        #ef4444;
        --lc-shadow:     0 8px 32px rgba(13,148,136,.18), 0 2px 8px rgba(0,0,0,.10);
        --lc-radius:     16px;
      }

      /* ── Bubble ── */
      #layla-bubble {
        position: fixed; bottom: 90px; left: 24px; z-index: 9998;
        width: 60px; height: 60px; border-radius: 50%;
        background: var(--lc-teal); display: flex; align-items: center;
        justify-content: center; cursor: pointer;
        box-shadow: var(--lc-shadow);
        transition: transform .2s ease, box-shadow .2s ease;
        border: none; outline: none; user-select: none;
      }
      #layla-bubble:hover  { transform: scale(1.08); box-shadow: 0 12px 36px rgba(13,148,136,.28),0 4px 12px rgba(0,0,0,.14); }
      #layla-bubble:active { transform: scale(.96); }
      #layla-bubble svg    { width: 28px; height: 28px; fill: var(--lc-white); pointer-events: none; }

      /* ── Panel ── */
      #layla-panel {
        position: fixed; bottom: 170px; left: 24px;
        width: 360px; height: 540px;
        background: var(--lc-white); border-radius: var(--lc-radius);
        box-shadow: var(--lc-shadow);
        display: none; flex-direction: column; z-index: 9997;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translateY(16px); opacity: 0;
        transition: transform .28s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;
      }
      #layla-panel.open { display: flex; }
      #layla-panel.animate-in { transform: translateY(0); opacity: 1; }

      /* ── Header ── */
      #layla-header {
        background: linear-gradient(135deg, var(--lc-teal) 0%, var(--lc-teal-dark) 100%);
        color: var(--lc-white); padding: 14px 16px;
        display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      }
      #layla-header-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      #layla-header-info { flex: 1; min-width: 0; }
      #layla-header-name {
        font-size: 15px; font-weight: 700; letter-spacing: .01em;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #layla-header-status {
        font-size: 12px; opacity: .88; display: flex;
        align-items: center; gap: 5px; margin-top: 1px;
      }
      #layla-status-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #4ade80;
        display: inline-block; box-shadow: 0 0 0 2px rgba(74,222,128,.3);
        animation: lc-pulse-dot 2s infinite;
      }
      @keyframes lc-pulse-dot {
        0%,100% { box-shadow: 0 0 0 2px rgba(74,222,128,.3); }
        50%      { box-shadow: 0 0 0 4px rgba(74,222,128,.15); }
      }
      #layla-close-btn {
        background: rgba(255,255,255,.15); border: none; border-radius: 50%;
        width: 30px; height: 30px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 18px; line-height: 1;
        transition: background .15s; flex-shrink: 0;
      }
      #layla-close-btn:hover { background: rgba(255,255,255,.28); }

      /* ── Mode selection screen ── */
      #layla-mode-screen {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 28px 24px; gap: 20px; background: #f8fafc;
      }
      #layla-mode-screen h3 {
        font-size: 16px; font-weight: 700; color: var(--lc-dark);
        text-align: center; margin: 0; line-height: 1.4;
      }
      #layla-mode-screen p {
        font-size: 13px; color: #64748b; text-align: center;
        margin: 0; line-height: 1.5;
      }
      .layla-mode-btns {
        display: flex; gap: 14px; width: 100%;
      }
      .layla-mode-btn {
        flex: 1; padding: 18px 12px;
        border: 2px solid var(--lc-gray-mid);
        border-radius: 14px; background: var(--lc-white);
        cursor: pointer; display: flex; flex-direction: column;
        align-items: center; gap: 10px;
        transition: border-color .18s, box-shadow .18s, transform .15s;
        font-family: inherit;
      }
      .layla-mode-btn:hover {
        border-color: var(--lc-teal);
        box-shadow: 0 4px 18px rgba(13,148,136,.14);
        transform: translateY(-2px);
      }
      .layla-mode-btn .lc-mode-icon {
        width: 52px; height: 52px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 24px;
      }
      .layla-mode-btn.chat-btn .lc-mode-icon  { background: #e0f2fe; }
      .layla-mode-btn.voice-btn .lc-mode-icon { background: var(--lc-teal-light); }
      .layla-mode-btn .lc-mode-label {
        font-size: 14px; font-weight: 700; color: var(--lc-dark);
      }
      .layla-mode-btn .lc-mode-desc {
        font-size: 11px; color: #64748b; text-align: center; line-height: 1.4;
      }

      /* ── Chat screen ── */
      #layla-chat-screen {
        flex: 1; display: none; flex-direction: column; overflow: hidden;
      }
      #layla-chat-screen.active { display: flex; }

      #layla-messages {
        flex: 1; overflow-y: auto; padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
        background: #f8fafc; scroll-behavior: smooth;
      }
      #layla-messages::-webkit-scrollbar { width: 4px; }
      #layla-messages::-webkit-scrollbar-track { background: transparent; }
      #layla-messages::-webkit-scrollbar-thumb { background: var(--lc-gray-mid); border-radius: 4px; }

      .layla-msg-row { display: flex; align-items: flex-end; gap: 6px; animation: lc-msg-in .22s ease; }
      @keyframes lc-msg-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .layla-msg-row.user { flex-direction: row-reverse; }
      .layla-msg-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; flex-shrink: 0; background: var(--lc-teal-light);
      }
      .layla-msg-row.user .layla-msg-avatar { background: var(--lc-gray-mid); }
      .layla-bubble-text {
        max-width: 78%; padding: 10px 14px; border-radius: 18px;
        font-size: 14px; line-height: 1.55; word-break: break-word; white-space: pre-wrap;
      }
      .layla-msg-row.assistant .layla-bubble-text {
        background: var(--lc-white); color: var(--lc-text);
        border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.07);
      }
      .layla-msg-row.user .layla-bubble-text {
        background: var(--lc-teal); color: var(--lc-white);
        border-bottom-right-radius: 4px;
      }
      .layla-msg-row[dir="rtl"].user      .layla-bubble-text { border-bottom-right-radius:18px; border-bottom-left-radius:4px; }
      .layla-msg-row[dir="rtl"].assistant .layla-bubble-text { border-bottom-left-radius:18px; border-bottom-right-radius:4px; }

      /* loading dots */
      #layla-loading-row { display: flex; align-items: flex-end; gap: 6px; }
      .layla-loading-dots {
        display: flex; align-items: center; gap: 4px;
        background: var(--lc-white); padding: 12px 16px;
        border-radius: 18px; border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,.07);
      }
      .layla-dot { width:7px; height:7px; border-radius:50%; background:var(--lc-teal); animation:lc-bounce 1.2s infinite; }
      .layla-dot:nth-child(2) { animation-delay:.18s; }
      .layla-dot:nth-child(3) { animation-delay:.36s; }
      @keyframes lc-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4;} 40%{transform:translateY(-6px);opacity:1;} }

      /* input area */
      #layla-input-area {
        padding: 10px 12px; border-top: 1px solid var(--lc-gray-mid);
        background: var(--lc-white); display: flex;
        align-items: flex-end; gap: 8px; flex-shrink: 0;
      }
      #layla-textarea {
        flex: 1; border: 1.5px solid var(--lc-gray-mid); border-radius: 22px;
        padding: 9px 14px; font-size: 14px; font-family: inherit;
        resize: none; outline: none; line-height: 1.45;
        max-height: 100px; overflow-y: auto;
        transition: border-color .15s; color: var(--lc-text); background: var(--lc-gray);
      }
      #layla-textarea:focus { border-color: var(--lc-teal); background: white; }
      #layla-textarea::placeholder { color: #94a3b8; }
      #layla-send-btn {
        width:38px; height:38px; border-radius:50%; background:var(--lc-teal);
        border:none; cursor:pointer; display:flex; align-items:center;
        justify-content:center; flex-shrink:0;
        transition:background .15s,transform .12s;
        box-shadow:0 2px 8px rgba(13,148,136,.25);
      }
      #layla-send-btn:hover:not(:disabled) { background:var(--lc-teal-dark); transform:scale(1.07); }
      #layla-send-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
      #layla-send-btn svg { width:18px; height:18px; fill:white; }

      /* booking banner */
      .layla-booking-banner {
        background: linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%);
        border:1px solid #6ee7b7; border-radius:10px;
        padding:10px 14px; font-size:13px; color:#065f46;
        display:flex; align-items:center; gap:8px; animation:lc-msg-in .22s ease;
      }

      /* ── Voice screen ── */
      #layla-voice-screen {
        flex: 1; display: none; flex-direction: column;
        align-items: center; justify-content: space-between;
        padding: 28px 24px 24px; background: #f0fdfa; overflow: hidden;
      }
      #layla-voice-screen.active { display: flex; }

      #layla-voice-transcript {
        width: 100%; max-height: 120px; overflow-y: auto;
        font-size: 13px; color: #475569; line-height: 1.5;
        text-align: center; padding: 0 8px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .lc-vc-line { opacity: .6; font-style: italic; }
      .lc-vc-line.latest { opacity: 1; font-style: normal; font-weight: 500; color: var(--lc-dark); }

      #layla-voice-orb-wrap {
        display: flex; flex-direction: column; align-items: center; gap: 16px;
      }
      #layla-voice-orb {
        width: 120px; height: 120px; border-radius: 50%;
        background: var(--lc-teal);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; position: relative;
        box-shadow: 0 0 0 0 rgba(13,148,136,.4);
        transition: background .3s, transform .15s;
      }
      #layla-voice-orb:hover { transform: scale(1.04); }
      #layla-voice-orb svg { width: 48px; height: 48px; fill: white; pointer-events: none; }

      /* state: speaking */
      #layla-voice-orb.speaking {
        background: var(--lc-teal-dark);
        animation: lc-orb-speak 1.4s ease-in-out infinite;
      }
      @keyframes lc-orb-speak {
        0%,100% { box-shadow: 0 0 0 0 rgba(13,148,136,.4),   0 0 0 0 rgba(13,148,136,.2); }
        50%      { box-shadow: 0 0 0 20px rgba(13,148,136,0), 0 0 0 40px rgba(13,148,136,0); }
      }
      /* state: listening */
      #layla-voice-orb.listening {
        background: #0ea5e9;
        animation: lc-orb-listen 1s ease-in-out infinite;
      }
      @keyframes lc-orb-listen {
        0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,.5); transform: scale(1); }
        50%      { box-shadow: 0 0 0 16px rgba(14,165,233,0); transform: scale(1.06); }
      }
      /* state: thinking */
      #layla-voice-orb.thinking {
        background: #7c3aed;
        animation: lc-orb-think .8s ease-in-out infinite alternate;
      }
      @keyframes lc-orb-think {
        from { transform: scale(.97); opacity: .85; }
        to   { transform: scale(1.03); opacity: 1; }
      }

      #layla-voice-status {
        font-size: 14px; font-weight: 600; color: var(--lc-dark);
        letter-spacing: .01em; text-align: center;
      }
      #layla-voice-hint {
        font-size: 12px; color: #64748b; text-align: center; margin-top: 2px;
      }

      #layla-voice-end-btn {
        padding: 11px 32px; border-radius: 24px;
        background: #fee2e2; border: 1.5px solid #fca5a5;
        color: #b91c1c; font-size: 14px; font-weight: 600;
        cursor: pointer; transition: background .15s, transform .12s;
        font-family: inherit;
      }
      #layla-voice-end-btn:hover { background: #fecaca; transform: scale(1.03); }

      /* ── Mobile ── */
      @media (max-width: 480px) {
        #layla-panel {
          left:0!important; right:0!important; bottom:0!important;
          width:100vw!important; height:90vh!important;
          border-radius:20px 20px 0 0!important;
        }
        #layla-bubble { bottom:80px; left:16px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ─── Build HTML ───────────────────────────────────────────────────────────────
  function buildHTML() {
    // Floating bubble
    const bubble = document.createElement('button');
    bubble.id = 'layla-bubble';
    bubble.setAttribute('aria-label', 'Open Layla assistant');
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;

    // Panel
    const panel = document.createElement('div');
    panel.id = 'layla-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Layla assistant');
    panel.innerHTML = `
      <!-- Header (always visible) -->
      <div id="layla-header">
        <div id="layla-header-avatar">🦷</div>
        <div id="layla-header-info">
          <div id="layla-header-name">Layla — Cedars Dental Centre</div>
          <div id="layla-header-status">
            <span id="layla-status-dot"></span>
            <span id="layla-status-text">Online</span>
          </div>
        </div>
        <button id="layla-close-btn" aria-label="Close">✕</button>
      </div>

      <!-- Screen 1: Mode Selection -->
      <div id="layla-mode-screen">
        <div id="layla-header-avatar" style="width:56px;height:56px;border-radius:50%;background:var(--lc-teal-light);display:flex;align-items:center;justify-content:center;font-size:28px;">🦷</div>
        <h3>Hi! How would you like to talk to Layla?</h3>
        <p>Your virtual receptionist at Cedars Dental Centre</p>
        <div class="layla-mode-btns">
          <button class="layla-mode-btn chat-btn" id="layla-pick-chat">
            <div class="lc-mode-icon">💬</div>
            <span class="lc-mode-label">Chat</span>
            <span class="lc-mode-desc">Type your questions or book an appointment</span>
          </button>
          <button class="layla-mode-btn voice-btn" id="layla-pick-voice">
            <div class="lc-mode-icon">🎤</div>
            <span class="lc-mode-label">Voice</span>
            <span class="lc-mode-desc">Talk hands-free like a real phone call</span>
          </button>
        </div>
      </div>

      <!-- Screen 2: Chat -->
      <div id="layla-chat-screen">
        <div id="layla-messages" role="log" aria-live="polite"></div>
        <div id="layla-input-area">
          <textarea id="layla-textarea" rows="1" placeholder="Type a message..." aria-label="Message input"></textarea>
          <button id="layla-send-btn" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>

      <!-- Screen 3: Voice -->
      <div id="layla-voice-screen">
        <div id="layla-voice-transcript"></div>
        <div id="layla-voice-orb-wrap">
          <div id="layla-voice-orb">
            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
          </div>
          <div>
            <div id="layla-voice-status">Starting…</div>
            <div id="layla-voice-hint">Tap the orb to interrupt</div>
          </div>
        </div>
        <button id="layla-voice-end-btn">✕ &nbsp;End conversation</button>
      </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
  }

  // ─── Events ───────────────────────────────────────────────────────────────────
  function initEvents() {
    document.getElementById('layla-bubble').addEventListener('click', togglePanel);
    document.getElementById('layla-close-btn').addEventListener('click', closePanel);

    document.getElementById('layla-pick-chat').addEventListener('click', () => startMode('chat'));
    document.getElementById('layla-pick-voice').addEventListener('click', () => startMode('voice'));

    // Chat send
    document.getElementById('layla-send-btn').addEventListener('click', () => {
      const ta = document.getElementById('layla-textarea');
      const text = ta.value.trim();
      if (text && !isLoading) { ta.value = ''; autoResize(ta); sendChatMessage(text); }
    });
    document.getElementById('layla-textarea').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const ta = e.target;
        const text = ta.value.trim();
        if (text && !isLoading) { ta.value = ''; autoResize(ta); sendChatMessage(text); }
      }
    });
    document.getElementById('layla-textarea').addEventListener('input', (e) => autoResize(e.target));

    // Voice orb: tap to interrupt
    document.getElementById('layla-voice-orb').addEventListener('click', handleOrbTap);

    // End voice call
    document.getElementById('layla-voice-end-btn').addEventListener('click', endVoiceCall);

    // Preload voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
    }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  // ─── Panel open / close ───────────────────────────────────────────────────────
  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    const panel = document.getElementById('layla-panel');
    isOpen = true;
    panel.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('animate-in')));
  }

  function closePanel() {
    const panel = document.getElementById('layla-panel');
    isOpen = false;
    panel.classList.remove('animate-in');
    // If voice is active, stop it
    if (mode === 'voice') stopVoiceAll();
    setTimeout(() => { if (!isOpen) { panel.style.display = 'none'; } }, 300);
  }

  // ─── Mode selection ───────────────────────────────────────────────────────────
  function startMode(chosen) {
    mode = chosen;
    document.getElementById('layla-mode-screen').style.display = 'none';

    if (chosen === 'chat') {
      document.getElementById('layla-chat-screen').classList.add('active');
      // Get greeting (no TTS in chat mode)
      fetchAI([]).then(({ displayText, bookingData }) => {
        if (displayText) { messages.push({ role: 'assistant', content: displayText }); addMessage('assistant', displayText); }
        if (bookingData) handleBooking(bookingData);
      });
    } else {
      document.getElementById('layla-voice-screen').classList.add('active');
      setVoiceState('thinking');
      // Get greeting then speak it
      fetchAI([]).then(({ displayText, bookingData }) => {
        if (displayText) {
          messages.push({ role: 'assistant', content: displayText });
          appendVoiceTranscript('Layla', displayText);
          speakAndThenListen(displayText);
        }
        if (bookingData) handleBooking(bookingData);
      });
    }
  }

  // ─── Language detection ───────────────────────────────────────────────────────
  function detectLang(text) {
    if (!text) return 'en';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/\b(je|tu|nous|vous|bonjour|merci|oui|non|rendez-vous|dentiste|est-ce|pour|avec|dans|avez|êtes)\b/i.test(text)) return 'fr';
    return 'en';
  }

  // ─── Core AI fetch ────────────────────────────────────────────────────────────
  async function fetchAI(msgs) {
    const res = await fetch(API.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseAIResponse(data.response || '');
  }

  function parseAIResponse(text) {
    const marker = 'BOOKING_DATA:';
    const idx = text.indexOf(marker);
    if (idx === -1) return { displayText: text.trim(), bookingData: null };
    const displayText = text.substring(0, idx).trim();
    let bookingData = null;
    try {
      const raw = text.substring(idx + marker.length).trim();
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s !== -1 && e !== -1) bookingData = JSON.parse(raw.substring(s, e + 1));
    } catch (_) {}
    return { displayText, bookingData };
  }

  // ─── CHAT MODE helpers ────────────────────────────────────────────────────────
  async function sendChatMessage(text) {
    if (isLoading) return;
    messages.push({ role: 'user', content: text });
    addMessage('user', text);
    setChatLoading(true);
    showLoading();
    try {
      const { displayText, bookingData } = await fetchAI(messages);
      hideLoading();
      if (displayText) { messages.push({ role: 'assistant', content: displayText }); addMessage('assistant', displayText); }
      if (bookingData) handleBooking(bookingData);
    } catch (e) {
      hideLoading();
      addMessage('assistant', 'Sorry, I had a connection issue. Please try again or call +961 70 533 831.');
    } finally {
      setChatLoading(false);
    }
  }

  function addMessage(role, text) {
    const container = document.getElementById('layla-messages');
    const lang = detectLang(text);
    if (role === 'assistant') currentLang = lang;
    const row = document.createElement('div');
    row.className = `layla-msg-row ${role}`;
    if (lang === 'ar') row.setAttribute('dir', 'rtl');
    row.innerHTML = `
      <div class="layla-msg-avatar">${role === 'assistant' ? '🦷' : '👤'}</div>
      <div class="layla-bubble-text">${escHtml(text)}</div>
    `;
    container.appendChild(row);
    scrollChat();
  }

  function escHtml(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  function scrollChat() {
    const el = document.getElementById('layla-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function showLoading() {
    const container = document.getElementById('layla-messages');
    const row = document.createElement('div');
    row.id = 'layla-loading-row';
    row.className = 'layla-msg-row assistant';
    row.innerHTML = `<div class="layla-msg-avatar">🦷</div><div class="layla-loading-dots"><div class="layla-dot"></div><div class="layla-dot"></div><div class="layla-dot"></div></div>`;
    container.appendChild(row);
    loadingMsgEl = row;
    scrollChat();
  }

  function hideLoading() {
    if (loadingMsgEl) { loadingMsgEl.remove(); loadingMsgEl = null; }
  }

  function setChatLoading(val) {
    isLoading = val;
    const send = document.getElementById('layla-send-btn');
    const ta   = document.getElementById('layla-textarea');
    if (send) send.disabled = val;
    if (ta)   ta.disabled   = val;
  }

  function handleBooking(data) {
    if (mode === 'chat') {
      const container = document.getElementById('layla-messages');
      const banner = document.createElement('div');
      banner.className = 'layla-booking-banner';
      banner.textContent = '✅ Your appointment request has been sent! Our team will contact you shortly.';
      container.appendChild(banner);
      scrollChat();
    }
    sendBookingEmail(data);
  }

  async function sendBookingEmail(data) {
    try {
      await fetch(API.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentData: data }),
      });
    } catch (e) { console.error('[Layla] Email error:', e); }
  }

  // ─── VOICE MODE helpers ───────────────────────────────────────────────────────

  // Orb states: idle / speaking / listening / thinking
  function setVoiceState(state) {
    voiceState = state;
    const orb    = document.getElementById('layla-voice-orb');
    const status = document.getElementById('layla-voice-status');
    const hint   = document.getElementById('layla-voice-hint');
    if (!orb) return;

    orb.className = '';
    const labels = {
      idle:      ['Idle', 'Tap to start'],
      speaking:  ['Layla is speaking…', 'Tap to interrupt'],
      listening: ['Listening…', 'Tap to send when done'],
      thinking:  ['Thinking…', 'Please wait'],
    };
    const [s, h] = labels[state] || labels.idle;
    status.textContent = s;
    hint.textContent   = h;
    if (state !== 'idle') orb.classList.add(state);
  }

  // Speak text then automatically start listening
  function speakAndThenListen(text) {
    if (!window.speechSynthesis) {
      // No TTS support — go straight to listening
      setVoiceState('listening');
      startRecording();
      return;
    }
    stopSpeaking();
    setVoiceState('speaking');

    const lang  = detectLang(text);
    const langMap = { ar: 'ar-LB', fr: 'fr-FR', en: 'en-US' };
    const u = new SpeechSynthesisUtterance(text);
    u.lang  = langMap[lang] || 'en-US';
    u.rate  = 0.93;
    u.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const tgt    = u.lang.split('-')[0];
    const voice  = voices.find(v => v.lang.startsWith(tgt) && /female|woman|féminin/i.test(v.name))
                || voices.find(v => v.lang.startsWith(tgt));
    if (voice) u.voice = voice;

    u.onend = () => {
      currentUtterance = null;
      if (mode === 'voice' && voiceState === 'speaking') {
        // Layla finished speaking → start listening
        setVoiceState('listening');
        startRecording();
      }
    };
    u.onerror = () => {
      currentUtterance = null;
      if (mode === 'voice') { setVoiceState('listening'); startRecording(); }
    };

    currentUtterance = u;
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  function stopVoiceAll() {
    stopSpeaking();
    if (isRecording && mediaRecorder) {
      // Stop without processing
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
      isRecording = false;
    }
    setVoiceState('idle');
  }

  // User taps the orb
  function handleOrbTap() {
    if (voiceState === 'speaking') {
      // Interrupt Layla → start listening
      stopSpeaking();
      setVoiceState('listening');
      startRecording();
    } else if (voiceState === 'listening') {
      // User says "I'm done" → stop recording and send
      stopRecordingAndSend();
    } else if (voiceState === 'idle') {
      // Resume conversation
      setVoiceState('listening');
      startRecording();
    }
    // 'thinking' → do nothing, wait for response
  }

  function endVoiceCall() {
    stopVoiceAll();
    mode = null;
    messages = [];
    document.getElementById('layla-voice-screen').classList.remove('active');
    document.getElementById('layla-voice-transcript').innerHTML = '';
    document.getElementById('layla-mode-screen').style.display = 'flex';
  }

  function appendVoiceTranscript(speaker, text) {
    const box = document.getElementById('layla-voice-transcript');
    if (!box) return;
    // Dim all previous lines
    box.querySelectorAll('.lc-vc-line').forEach(el => el.classList.remove('latest'));
    const line = document.createElement('div');
    line.className = 'lc-vc-line latest';
    line.textContent = speaker === 'Layla' ? `🦷 ${text}` : `👤 ${text}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    // Keep last 4 lines visible
    while (box.children.length > 4) box.removeChild(box.firstChild);
  }

  // ─── Recording ────────────────────────────────────────────────────────────────
  async function startRecording() {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : {};

      mediaRecorder = new MediaRecorder(stream, opts);
      mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        processVoiceInput(blob);
      };
      mediaRecorder.start(250);
      isRecording = true;

    } catch (e) {
      console.error('[Layla] Mic error:', e);
      setVoiceState('idle');
      appendVoiceTranscript('Layla', 'Microphone access was denied. Please allow mic access to use voice mode.');
    }
  }

  function stopRecordingAndSend() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    mediaRecorder.stop();
  }

  // Auto-stop after silence — simple timeout-based approach
  // We use a 6-second max recording window; user can also tap orb to stop early
  let recordingTimer = null;
  const _origStartRecording = startRecording;
  async function startRecordingWithTimer() {
    await _origStartRecording();
    clearTimeout(recordingTimer);
    recordingTimer = setTimeout(() => {
      if (isRecording) stopRecordingAndSend();
    }, 10000); // 10s max per turn
  }
  // Override startRecording to include timer
  // (reassign after definition)

  async function processVoiceInput(blob) {
    isRecording = false;
    clearTimeout(recordingTimer);
    setVoiceState('thinking');

    try {
      // Step 1: STT
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      const sttRes = await fetch(API.stt, { method: 'POST', body: fd });
      if (!sttRes.ok) throw new Error('STT failed');
      const { text: userText } = await sttRes.json();

      if (!userText || !userText.trim()) {
        // Nothing heard — go back to listening
        appendVoiceTranscript('Layla', "I didn't catch that. Please speak again.");
        speakAndThenListen("I didn't catch that. Could you please repeat?");
        return;
      }

      appendVoiceTranscript('You', userText.trim());
      messages.push({ role: 'user', content: userText.trim() });

      // Step 2: AI response
      const { displayText, bookingData } = await fetchAI(messages);

      if (displayText) {
        messages.push({ role: 'assistant', content: displayText });
        appendVoiceTranscript('Layla', displayText);
        speakAndThenListen(displayText);
      }
      if (bookingData) {
        handleBooking(bookingData);
        // After booking confirmed, end voice call gracefully after speech
        const origOnEnd = currentUtterance && currentUtterance.onend;
        if (currentUtterance) {
          currentUtterance.onend = () => { if (origOnEnd) origOnEnd(); setVoiceState('idle'); };
        }
      }
    } catch (e) {
      console.error('[Layla] Voice processing error:', e);
      const errMsg = 'Sorry, I had a connection issue. Please try again.';
      appendVoiceTranscript('Layla', errMsg);
      speakAndThenListen(errMsg);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('layla-bubble')) return;
    injectStyles();
    buildHTML();
    initEvents();

    // Patch startRecording to include auto-stop timer
    const voiceOrb = document.getElementById('layla-voice-orb');
    if (voiceOrb) {
      voiceOrb.removeEventListener('click', handleOrbTap);
      voiceOrb.addEventListener('click', () => {
        if (voiceState === 'speaking') {
          stopSpeaking();
          setVoiceState('listening');
          startRecordingWithTimer();
        } else if (voiceState === 'listening') {
          stopRecordingAndSend();
        } else if (voiceState === 'idle') {
          setVoiceState('listening');
          startRecordingWithTimer();
        }
      });
    }

    // Override startRecording calls in speakAndThenListen
    const _orig = window.__laylaStartRecording;
  }

  // Patch speakAndThenListen to use timed version
  const _speakAndThenListen = speakAndThenListen;
  function speakAndThenListenPatched(text) {
    if (!window.speechSynthesis) {
      setVoiceState('listening');
      startRecordingWithTimer();
      return;
    }
    stopSpeaking();
    setVoiceState('speaking');
    const lang = detectLang(text);
    const langMap = { ar: 'ar-LB', fr: 'fr-FR', en: 'en-US' };
    const u = new SpeechSynthesisUtterance(text);
    u.lang  = langMap[lang] || 'en-US';
    u.rate  = 0.93;
    u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const tgt    = u.lang.split('-')[0];
    const voice  = voices.find(v => v.lang.startsWith(tgt) && /female|woman/i.test(v.name))
                || voices.find(v => v.lang.startsWith(tgt));
    if (voice) u.voice = voice;
    u.onend = () => {
      currentUtterance = null;
      if (mode === 'voice' && voiceState === 'speaking') {
        setVoiceState('listening');
        startRecordingWithTimer();
      }
    };
    u.onerror = () => {
      currentUtterance = null;
      if (mode === 'voice') { setVoiceState('listening'); startRecordingWithTimer(); }
    };
    currentUtterance = u;
    window.speechSynthesis.speak(u);
  }

  // Use patched version everywhere
  function startMode_final(chosen) {
    mode = chosen;
    document.getElementById('layla-mode-screen').style.display = 'none';
    if (chosen === 'chat') {
      document.getElementById('layla-chat-screen').classList.add('active');
      fetchAI([]).then(({ displayText, bookingData }) => {
        if (displayText) { messages.push({ role: 'assistant', content: displayText }); addMessage('assistant', displayText); }
        if (bookingData) handleBooking(bookingData);
      }).catch(() => addMessage('assistant', 'Hello! I had trouble connecting. Please refresh or call +961 70 533 831.'));
    } else {
      document.getElementById('layla-voice-screen').classList.add('active');
      setVoiceState('thinking');
      fetchAI([]).then(({ displayText, bookingData }) => {
        if (displayText) {
          messages.push({ role: 'assistant', content: displayText });
          appendVoiceTranscript('Layla', displayText);
          speakAndThenListenPatched(displayText);
        }
        if (bookingData) handleBooking(bookingData);
      }).catch(() => {
        const err = 'Hello! I had a connection issue. Please try again.';
        appendVoiceTranscript('Layla', err);
        speakAndThenListenPatched(err);
      });
    }
  }

  // Wire up final startMode
  function initEventsFinal() {
    document.getElementById('layla-pick-chat').addEventListener('click',  () => startMode_final('chat'));
    document.getElementById('layla-pick-voice').addEventListener('click', () => startMode_final('voice'));
  }

  function processVoiceInput_final(blob) {
    isRecording = false;
    clearTimeout(recordingTimer);
    setVoiceState('thinking');
    const fd = new FormData();
    fd.append('audio', blob, 'voice.webm');
    fetch(API.stt, { method: 'POST', body: fd })
      .then(r => r.ok ? r.json() : Promise.reject('STT ' + r.status))
      .then(({ text: userText }) => {
        if (!userText || !userText.trim()) {
          const retry = "I didn't catch that. Could you please repeat?";
          appendVoiceTranscript('Layla', retry);
          speakAndThenListenPatched(retry);
          return;
        }
        appendVoiceTranscript('You', userText.trim());
        messages.push({ role: 'user', content: userText.trim() });
        return fetchAI(messages);
      })
      .then(result => {
        if (!result) return;
        const { displayText, bookingData } = result;
        if (displayText) {
          messages.push({ role: 'assistant', content: displayText });
          appendVoiceTranscript('Layla', displayText);
          speakAndThenListenPatched(displayText);
        }
        if (bookingData) {
          handleBooking(bookingData);
          if (currentUtterance) {
            const prev = currentUtterance.onend;
            currentUtterance.onend = () => { prev && prev(); setVoiceState('idle'); };
          }
        }
      })
      .catch(e => {
        console.error('[Layla] Voice error:', e);
        const err = 'Sorry, I had a connection issue. Please try again.';
        appendVoiceTranscript('Layla', err);
        speakAndThenListenPatched(err);
      });
  }

  function init_final() {
    if (document.getElementById('layla-bubble')) return;
    injectStyles();
    buildHTML();

    // Core events
    document.getElementById('layla-bubble').addEventListener('click', togglePanel);
    document.getElementById('layla-close-btn').addEventListener('click', closePanel);
    initEventsFinal();

    // Chat
    document.getElementById('layla-send-btn').addEventListener('click', () => {
      const ta = document.getElementById('layla-textarea');
      const text = ta.value.trim();
      if (text && !isLoading) { ta.value = ''; autoResize(ta); sendChatMessage(text); }
    });
    document.getElementById('layla-textarea').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = e.target.value.trim();
        if (text && !isLoading) { e.target.value = ''; autoResize(e.target); sendChatMessage(text); }
      }
    });
    document.getElementById('layla-textarea').addEventListener('input', e => autoResize(e.target));

    // Voice orb
    document.getElementById('layla-voice-orb').addEventListener('click', () => {
      if (voiceState === 'speaking') {
        stopSpeaking();
        setVoiceState('listening');
        mediaRecorder = null; audioChunks = []; isRecording = false;
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          audioChunks = [];
          const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {};
          mediaRecorder = new MediaRecorder(stream, opts);
          mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());
            processVoiceInput_final(blob);
          };
          mediaRecorder.start(250);
          isRecording = true;
          clearTimeout(recordingTimer);
          recordingTimer = setTimeout(() => { if (isRecording) { isRecording = false; mediaRecorder.stop(); } }, 10000);
        }).catch(() => { setVoiceState('idle'); });
      } else if (voiceState === 'listening') {
        if (isRecording && mediaRecorder) { isRecording = false; clearTimeout(recordingTimer); mediaRecorder.stop(); }
      } else if (voiceState === 'idle') {
        setVoiceState('listening');
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          audioChunks = [];
          const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {};
          mediaRecorder = new MediaRecorder(stream, opts);
          mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());
            processVoiceInput_final(blob);
          };
          mediaRecorder.start(250);
          isRecording = true;
          clearTimeout(recordingTimer);
          recordingTimer = setTimeout(() => { if (isRecording) { isRecording = false; mediaRecorder.stop(); } }, 10000);
        }).catch(() => { setVoiceState('idle'); });
      }
    });

    // End call
    document.getElementById('layla-voice-end-btn').addEventListener('click', endVoiceCall);

    // Voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_final);
  } else {
    init_final();
  }

})();
