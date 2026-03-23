(function () {
  'use strict';

  const API = { chat: '/api/chat', stt: '/api/stt', email: '/api/email' };

  // ─── State ────────────────────────────────────────────────────────────────────
  let messages     = [];
  let mode         = null;      // null | 'chat' | 'voice'
  let isOpen       = false;
  let isLoading    = false;
  let loadingEl    = null;

  // voice
  let voiceState   = 'idle';    // idle | thinking | speaking | listening
  let mediaRecorder = null;
  let audioChunks  = [];
  let isRecording  = false;
  let audioCtx     = null;
  let analyser     = null;
  let vadRaf       = null;
  let silenceTimer = null;
  let hasSpeech    = false;
  let currentUtt   = null;

  // ─── CSS ──────────────────────────────────────────────────────────────────────
  function injectStyles() {
    const el = document.createElement('style');
    el.textContent = `
      :root {
        --lc-teal:      #0d9488;
        --lc-teal-dk:   #0f766e;
        --lc-teal-lt:   #ccfbf1;
        --lc-dark:      #1e293b;
        --lc-gray:      #f1f5f9;
        --lc-gray-mid:  #e2e8f0;
        --lc-text:      #334155;
        --lc-white:     #ffffff;
        --lc-red:       #ef4444;
        --lc-shadow:    0 8px 32px rgba(13,148,136,.18),0 2px 8px rgba(0,0,0,.10);
      }

      /* Bubble */
      #lc-bubble {
        position:fixed !important;bottom:90px !important;left:24px !important;
        z-index:99999 !important;
        width:60px !important;height:60px !important;border-radius:50% !important;
        background:var(--lc-teal) !important;border:none !important;outline:none !important;
        cursor:pointer !important;
        display:flex !important;align-items:center !important;justify-content:center !important;
        box-shadow:var(--lc-shadow) !important;user-select:none !important;
        transition:transform .2s,box-shadow .2s;
        text-decoration:none !important;
      }
      #lc-bubble:hover  { transform:scale(1.08) !important; }
      #lc-bubble:active { transform:scale(.95) !important; }
      #lc-bubble svg    { width:28px !important;height:28px !important;fill:#fff !important;pointer-events:none; }

      /* Panel */
      #lc-panel {
        position:fixed;bottom:170px;left:24px;
        width:360px;height:540px;
        background:var(--lc-white);border-radius:16px;
        box-shadow:var(--lc-shadow);
        display:none;flex-direction:column;z-index:9997;overflow:hidden;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        opacity:0;transform:translateY(16px);
        transition:opacity .25s ease,transform .28s cubic-bezier(.34,1.56,.64,1);
      }
      #lc-panel.open   { display:flex; }
      #lc-panel.show   { opacity:1;transform:translateY(0); }

      /* Header */
      #lc-header {
        background:linear-gradient(135deg,var(--lc-teal),var(--lc-teal-dk));
        color:#fff;padding:14px 16px;display:flex;align-items:center;
        gap:10px;flex-shrink:0;
      }
      #lc-avatar {
        width:40px;height:40px;border-radius:50%;
        background:rgba(255,255,255,.2);
        display:flex;align-items:center;justify-content:center;
        font-size:20px;flex-shrink:0;
      }
      #lc-info   { flex:1;min-width:0; }
      #lc-name   { font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      #lc-status { font-size:12px;opacity:.88;display:flex;align-items:center;gap:5px;margin-top:1px; }
      #lc-dot    {
        width:8px;height:8px;border-radius:50%;background:#4ade80;
        box-shadow:0 0 0 2px rgba(74,222,128,.3);
        animation:lc-dot-pulse 2s infinite;
      }
      @keyframes lc-dot-pulse {
        0%,100%{box-shadow:0 0 0 2px rgba(74,222,128,.3);}
        50%    {box-shadow:0 0 0 4px rgba(74,222,128,.1);}
      }
      #lc-close {
        background:rgba(255,255,255,.15);border:none;border-radius:50%;
        width:30px;height:30px;color:#fff;font-size:18px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:background .15s;flex-shrink:0;
      }
      #lc-close:hover { background:rgba(255,255,255,.28); }

      /* ── Mode screen ── */
      #lc-mode {
        flex:1;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        padding:28px 24px;gap:20px;background:#f8fafc;
      }
      #lc-mode h3 { font-size:16px;font-weight:700;color:var(--lc-dark);text-align:center;margin:0;line-height:1.4; }
      #lc-mode p  { font-size:13px;color:#64748b;text-align:center;margin:0;line-height:1.5; }
      .lc-mode-row { display:flex;gap:14px;width:100%; }
      .lc-mode-btn {
        flex:1;padding:18px 10px;border:2px solid var(--lc-gray-mid);
        border-radius:14px;background:var(--lc-white);cursor:pointer;
        display:flex;flex-direction:column;align-items:center;gap:10px;
        transition:border-color .18s,box-shadow .18s,transform .15s;
        font-family:inherit;
      }
      .lc-mode-btn:hover {
        border-color:var(--lc-teal);
        box-shadow:0 4px 18px rgba(13,148,136,.14);
        transform:translateY(-2px);
      }
      .lc-mode-icon  { width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px; }
      .lc-mode-icon.chat  { background:#e0f2fe; }
      .lc-mode-icon.voice { background:var(--lc-teal-lt); }
      .lc-mode-label { font-size:14px;font-weight:700;color:var(--lc-dark); }
      .lc-mode-desc  { font-size:11px;color:#64748b;text-align:center;line-height:1.4; }

      /* ── Chat screen ── */
      #lc-chat { flex:1;display:none;flex-direction:column;overflow:hidden; }
      #lc-chat.active { display:flex; }

      #lc-msgs {
        flex:1;overflow-y:auto;padding:16px;
        display:flex;flex-direction:column;gap:10px;
        background:#f8fafc;scroll-behavior:smooth;
      }
      #lc-msgs::-webkit-scrollbar       { width:4px; }
      #lc-msgs::-webkit-scrollbar-thumb { background:var(--lc-gray-mid);border-radius:4px; }

      .lc-row { display:flex;align-items:flex-end;gap:6px;animation:lc-in .2s ease; }
      @keyframes lc-in { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
      .lc-row.user { flex-direction:row-reverse; }
      .lc-ico {
        width:28px;height:28px;border-radius:50%;font-size:14px;
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0;background:var(--lc-teal-lt);
      }
      .lc-row.user .lc-ico { background:var(--lc-gray-mid); }
      .lc-txt {
        max-width:78%;padding:10px 14px;border-radius:18px;
        font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap;
      }
      .lc-row.bot  .lc-txt { background:var(--lc-white);color:var(--lc-text);border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.07); }
      .lc-row.user .lc-txt { background:var(--lc-teal);color:#fff;border-bottom-right-radius:4px; }
      .lc-row[dir=rtl].bot  .lc-txt { border-bottom-left-radius:18px;border-bottom-right-radius:4px; }
      .lc-row[dir=rtl].user .lc-txt { border-bottom-right-radius:18px;border-bottom-left-radius:4px; }

      /* typing dots */
      .lc-dots {
        background:var(--lc-white);padding:12px 16px;border-radius:18px;
        border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.07);
        display:flex;gap:4px;align-items:center;
      }
      .lc-dot-b {
        width:7px;height:7px;border-radius:50%;background:var(--lc-teal);
        animation:lc-bounce 1.2s infinite;
      }
      .lc-dot-b:nth-child(2){animation-delay:.18s;}
      .lc-dot-b:nth-child(3){animation-delay:.36s;}
      @keyframes lc-bounce{0%,80%,100%{transform:translateY(0);opacity:.4;}40%{transform:translateY(-6px);opacity:1;}}

      /* input */
      #lc-input {
        padding:10px 12px;border-top:1px solid var(--lc-gray-mid);
        background:var(--lc-white);display:flex;align-items:flex-end;gap:8px;flex-shrink:0;
      }
      #lc-ta {
        flex:1;border:1.5px solid var(--lc-gray-mid);border-radius:22px;
        padding:9px 14px;font-size:14px;font-family:inherit;
        resize:none;outline:none;line-height:1.45;max-height:100px;
        overflow-y:auto;transition:border-color .15s;
        color:var(--lc-text);background:var(--lc-gray);
      }
      #lc-ta:focus          { border-color:var(--lc-teal);background:#fff; }
      #lc-ta::placeholder   { color:#94a3b8; }
      #lc-send {
        width:38px;height:38px;border-radius:50%;background:var(--lc-teal);
        border:none;cursor:pointer;display:flex;align-items:center;
        justify-content:center;flex-shrink:0;
        box-shadow:0 2px 8px rgba(13,148,136,.25);
        transition:background .15s,transform .12s;
      }
      #lc-send:hover:not(:disabled) { background:var(--lc-teal-dk);transform:scale(1.07); }
      #lc-send:disabled { opacity:.5;cursor:not-allowed; }
      #lc-send svg { width:18px;height:18px;fill:#fff; }

      /* booking banner */
      .lc-banner {
        background:linear-gradient(135deg,#d1fae5,#a7f3d0);
        border:1px solid #6ee7b7;border-radius:10px;
        padding:10px 14px;font-size:13px;color:#065f46;
        display:flex;align-items:center;gap:8px;animation:lc-in .2s ease;
      }

      /* ── Voice screen ── */
      #lc-voice {
        flex:1;display:none;flex-direction:column;
        align-items:center;justify-content:space-between;
        padding:24px 24px 22px;background:#f0fdfa;
      }
      #lc-voice.active { display:flex; }

      #lc-vt {
        width:100%;max-height:110px;overflow-y:auto;
        display:flex;flex-direction:column;gap:4px;
        font-size:13px;color:#475569;line-height:1.5;text-align:center;
      }
      .lc-vline      { opacity:.55;font-style:italic;transition:opacity .3s; }
      .lc-vline.last { opacity:1;font-style:normal;font-weight:500;color:var(--lc-dark); }

      /* orb */
      #lc-orb-wrap { display:flex;flex-direction:column;align-items:center;gap:16px; }
      #lc-orb {
        width:120px;height:120px;border-radius:50%;
        background:var(--lc-teal);cursor:default;
        display:flex;align-items:center;justify-content:center;
        transition:background .3s,transform .15s;
        position:relative;
      }
      #lc-orb svg { width:50px;height:50px;fill:#fff;pointer-events:none; }

      /* speaking: teal rings */
      #lc-orb.speaking {
        background:var(--lc-teal-dk);
        animation:lc-speak-ring 1.5s ease-in-out infinite;
      }
      @keyframes lc-speak-ring {
        0%,100%{box-shadow:0 0 0 0 rgba(13,148,136,.45),0 0 0 0 rgba(13,148,136,.2);}
        60%    {box-shadow:0 0 0 22px rgba(13,148,136,0),0 0 0 44px rgba(13,148,136,0);}
      }

      /* listening: blue, scales with voice level */
      #lc-orb.listening { background:#0ea5e9; }

      /* thinking: purple breathe */
      #lc-orb.thinking {
        background:#7c3aed;
        animation:lc-think .9s ease-in-out infinite alternate;
      }
      @keyframes lc-think{from{transform:scale(.96);opacity:.8;}to{transform:scale(1.04);opacity:1;}}

      #lc-vstate { font-size:14px;font-weight:600;color:var(--lc-dark);text-align:center; }
      #lc-vhint  { font-size:12px;color:#64748b;text-align:center;margin-top:3px; }

      #lc-end {
        padding:11px 32px;border-radius:24px;
        background:#fee2e2;border:1.5px solid #fca5a5;
        color:#b91c1c;font-size:14px;font-weight:600;
        cursor:pointer;font-family:inherit;
        transition:background .15s,transform .12s;
      }
      #lc-end:hover { background:#fecaca;transform:scale(1.03); }

      /* mobile */
      @media(max-width:480px){
        #lc-panel{left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:90vh!important;border-radius:20px 20px 0 0!important;}
        #lc-bubble{bottom:80px;left:16px;}
      }
    `;
    document.head.appendChild(el);
  }

  // ─── HTML ─────────────────────────────────────────────────────────────────────
  function buildHTML() {
    const bubble = document.createElement('a');
    bubble.id = 'lc-bubble';
    bubble.href = '#';
    bubble.setAttribute('aria-label', 'Open Layla assistant');
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;

    const panel = document.createElement('div');
    panel.id = 'lc-panel';
    panel.setAttribute('role', 'dialog');
    panel.innerHTML = `
      <div id="lc-header">
        <div id="lc-avatar">🦷</div>
        <div id="lc-info">
          <div id="lc-name">Layla — Cedars Dental Centre</div>
          <div id="lc-status"><span id="lc-dot"></span><span>Online</span></div>
        </div>
        <button id="lc-close" aria-label="Close">✕</button>
      </div>

      <!-- Mode picker -->
      <div id="lc-mode">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--lc-teal-lt);display:flex;align-items:center;justify-content:center;font-size:28px;">🦷</div>
        <h3>Hi! How would you like to talk to Layla?</h3>
        <p>Virtual receptionist at Cedars Dental Centre</p>
        <div class="lc-mode-row">
          <button class="lc-mode-btn" id="lc-pick-chat">
            <div class="lc-mode-icon chat">💬</div>
            <span class="lc-mode-label">Chat</span>
            <span class="lc-mode-desc">Type to ask questions or book an appointment</span>
          </button>
          <button class="lc-mode-btn" id="lc-pick-voice">
            <div class="lc-mode-icon voice">🎤</div>
            <span class="lc-mode-label">Voice</span>
            <span class="lc-mode-desc">Speak hands-free like a real phone call</span>
          </button>
        </div>
      </div>

      <!-- Chat -->
      <div id="lc-chat">
        <div id="lc-msgs" role="log" aria-live="polite"></div>
        <div id="lc-input">
          <textarea id="lc-ta" rows="1" placeholder="Type a message…" aria-label="Message"></textarea>
          <button id="lc-send" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>

      <!-- Voice -->
      <div id="lc-voice">
        <div id="lc-vt"></div>
        <div id="lc-orb-wrap">
          <div id="lc-orb">
            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A1 1 0 0 0 10.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
          </div>
          <div>
            <div id="lc-vstate">Starting…</div>
            <div id="lc-vhint"></div>
          </div>
        </div>
        <button id="lc-end">✕ &nbsp;End conversation</button>
      </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
  }

  // ─── Events ───────────────────────────────────────────────────────────────────
  function initEvents() {
    // Panel open/close
    document.getElementById('lc-bubble').addEventListener('click', e => { e.preventDefault(); togglePanel(); });
    document.getElementById('lc-close').addEventListener('click', closePanel);

    // Mode selection
    document.getElementById('lc-pick-chat').addEventListener('click', () => startChat());
    document.getElementById('lc-pick-voice').addEventListener('click', () => startVoice());

    // Chat send
    document.getElementById('lc-send').addEventListener('click', submitChat);
    document.getElementById('lc-ta').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat(); }
    });
    document.getElementById('lc-ta').addEventListener('input', e => {
      const ta = e.target;
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    });

    // End voice call
    document.getElementById('lc-end').addEventListener('click', endVoice);

    // Pre-load TTS voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
    }
  }

  // ─── Panel ────────────────────────────────────────────────────────────────────
  function togglePanel() { isOpen ? closePanel() : openPanel(); }

  function openPanel() {
    const p = document.getElementById('lc-panel');
    isOpen = true;
    p.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('show')));
  }

  function closePanel() {
    isOpen = false;
    const p = document.getElementById('lc-panel');
    p.classList.remove('show');
    if (mode === 'voice') stopVoiceAll(false);
    setTimeout(() => { if (!isOpen) p.style.display = 'none'; }, 280);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function detectLang(t) {
    if (!t) return 'en';
    if (/[\u0600-\u06FF]/.test(t)) return 'ar';
    if (/\b(je|tu|nous|vous|bonjour|merci|oui|non|rendez-vous|dentiste|pour|avez|êtes)\b/i.test(t)) return 'fr';
    return 'en';
  }

  function esc(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  async function callAI(msgs) {
    const r = await fetch(API.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    return parseResponse(d.response || '');
  }

  function parseResponse(raw) {
    const m = 'BOOKING_DATA:';
    const i = raw.indexOf(m);
    if (i === -1) return { text: raw.trim(), booking: null };
    const display = raw.substring(0, i).trim();
    let booking = null;
    try {
      const s = raw.indexOf('{', i), e = raw.lastIndexOf('}');
      if (s !== -1 && e !== -1) booking = JSON.parse(raw.substring(s, e + 1));
    } catch (_) {}
    return { text: display, booking };
  }

  async function sendEmail(data) {
    try {
      await fetch(API.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentData: data }),
      });
    } catch (e) { console.error('[Layla] email:', e); }
  }

  // ─── CHAT ─────────────────────────────────────────────────────────────────────
  function startChat() {
    mode = 'chat';
    document.getElementById('lc-mode').style.display = 'none';
    document.getElementById('lc-chat').classList.add('active');
    // Fetch greeting — NO speech
    callAI([])
      .then(({ text, booking }) => {
        if (text) { messages.push({ role: 'assistant', content: text }); addMsg('bot', text); }
        if (booking) onBooking(booking);
      })
      .catch(() => addMsg('bot', 'Hello! I had a connection issue. Please refresh or call +961 70 533 831.'));
  }

  function submitChat() {
    const ta = document.getElementById('lc-ta');
    const text = ta.value.trim();
    if (!text || isLoading) return;
    ta.value = '';
    ta.style.height = 'auto';
    chatSend(text);
  }

  async function chatSend(text) {
    messages.push({ role: 'user', content: text });
    addMsg('user', text);
    setChatBusy(true);
    showTyping();
    try {
      const { text: reply, booking } = await callAI(messages);
      hideTyping();
      if (reply) { messages.push({ role: 'assistant', content: reply }); addMsg('bot', reply); }
      if (booking) onBooking(booking);
    } catch (_) {
      hideTyping();
      addMsg('bot', 'Sorry, connection issue. Please try again or call +961 70 533 831.');
    } finally {
      setChatBusy(false);
    }
  }

  function addMsg(role, text) {
    const box = document.getElementById('lc-msgs');
    const lang = detectLang(text);
    const row = document.createElement('div');
    row.className = `lc-row ${role}`;
    if (lang === 'ar') row.setAttribute('dir', 'rtl');
    row.innerHTML = `<div class="lc-ico">${role === 'bot' ? '🦷' : '👤'}</div><div class="lc-txt">${esc(text)}</div>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function showTyping() {
    const box = document.getElementById('lc-msgs');
    const row = document.createElement('div');
    row.id = 'lc-typing';
    row.className = 'lc-row bot';
    row.innerHTML = `<div class="lc-ico">🦷</div><div class="lc-dots"><div class="lc-dot-b"></div><div class="lc-dot-b"></div><div class="lc-dot-b"></div></div>`;
    box.appendChild(row);
    loadingEl = row;
    box.scrollTop = box.scrollHeight;
  }

  function hideTyping() {
    if (loadingEl) { loadingEl.remove(); loadingEl = null; }
  }

  function setChatBusy(v) {
    isLoading = v;
    const s = document.getElementById('lc-send');
    const t = document.getElementById('lc-ta');
    if (s) s.disabled = v;
    if (t) t.disabled = v;
  }

  function onBooking(data) {
    if (mode === 'chat') {
      const box = document.getElementById('lc-msgs');
      const b = document.createElement('div');
      b.className = 'lc-banner';
      b.textContent = '✅ Appointment request sent! Our team will contact you shortly.';
      box.appendChild(b);
      box.scrollTop = box.scrollHeight;
    }
    sendEmail(data);
  }

  // ─── VOICE ────────────────────────────────────────────────────────────────────
  const SILENCE_THRESHOLD = 12;   // RMS below this = silence
  const SILENCE_DELAY     = 1500; // ms of silence before auto-send
  const MAX_RECORD_MS     = 15000; // hard cap per turn

  function startVoice() {
    mode = 'voice';
    document.getElementById('lc-mode').style.display = 'none';
    document.getElementById('lc-voice').classList.add('active');
    setVoiceUI('thinking');
    // Fetch greeting then speak it
    callAI([])
      .then(({ text, booking }) => {
        if (text) {
          messages.push({ role: 'assistant', content: text });
          vtAppend('Layla', text);
          laylaSpeak(text);
        }
        if (booking) { sendEmail(booking); }
      })
      .catch(() => laylaSpeak("Hello! I had a connection issue. Please try again."));
  }

  function setVoiceUI(state) {
    voiceState = state;
    const orb = document.getElementById('lc-orb');
    const st  = document.getElementById('lc-vstate');
    const ht  = document.getElementById('lc-vhint');
    if (!orb) return;
    orb.className = '';
    const MAP = {
      idle:      { cls: '',          label: 'Ready',              hint: '' },
      thinking:  { cls: 'thinking',  label: 'Thinking…',          hint: 'Please wait' },
      speaking:  { cls: 'speaking',  label: 'Layla is speaking…', hint: 'Please wait' },
      listening: { cls: 'listening', label: 'Listening…',         hint: 'Speak now — stops automatically' },
    };
    const s = MAP[state] || MAP.idle;
    if (s.cls) orb.classList.add(s.cls);
    st.textContent = s.label;
    ht.textContent = s.hint;
  }

  function vtAppend(who, text) {
    const box = document.getElementById('lc-vt');
    if (!box) return;
    box.querySelectorAll('.lc-vline').forEach(el => el.classList.remove('last'));
    const line = document.createElement('div');
    line.className = 'lc-vline last';
    line.textContent = (who === 'Layla' ? '🦷 ' : '👤 ') + text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    while (box.children.length > 5) box.removeChild(box.firstChild);
  }

  // TTS — speak text, then automatically open mic
  function laylaSpeak(text) {
    stopSpeaking();
    setVoiceUI('speaking');

    if (!window.speechSynthesis) {
      // No TTS — go straight to listening
      startListening();
      return;
    }

    const lang = detectLang(text);
    const langCode = { ar: 'ar-LB', fr: 'fr-FR', en: 'en-US' }[lang] || 'en-US';
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = langCode;
    utt.rate  = 0.92;
    utt.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const lk     = langCode.split('-')[0];
    const best   = voices.find(v => v.lang.startsWith(lk) && /female|woman|féminin/i.test(v.name))
                || voices.find(v => v.lang.startsWith(lk));
    if (best) utt.voice = best;

    utt.onend = () => {
      currentUtt = null;
      if (mode === 'voice') startListening();
    };
    utt.onerror = () => {
      currentUtt = null;
      if (mode === 'voice') startListening();
    };

    currentUtt = utt;
    window.speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    currentUtt = null;
  }

  // Start mic + VAD — fully hands-free
  async function startListening() {
    if (isRecording || mode !== 'voice') return;
    setVoiceUI('listening');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Set up Web Audio VAD
      audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
      analyser  = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const src = audioCtx.createMediaStreamSource(stream);
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      // Set up recorder
      const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : {};

      audioChunks = [];
      hasSpeech   = false;
      mediaRecorder = new MediaRecorder(stream, opts);

      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        closeAudioCtx();
        stopVAD();
        if (hasSpeech && audioChunks.length) {
          const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          processUserSpeech(blob);
        } else {
          // Nothing captured — listen again
          if (mode === 'voice') startListening();
        }
      };

      mediaRecorder.start(100);
      isRecording = true;

      // Max duration safety cap
      const maxTimer = setTimeout(() => {
        if (isRecording) stopMic();
      }, MAX_RECORD_MS);

      // VAD loop
      hasSpeech = false;
      clearTimeout(silenceTimer);
      silenceTimer = null;

      function vadLoop() {
        if (!isRecording) return;
        analyser.getByteFrequencyData(buf);
        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);

        // Scale orb with volume (visual feedback)
        const orb = document.getElementById('lc-orb');
        if (orb && voiceState === 'listening') {
          const scale = 1 + Math.min(rms / 80, 0.35);
          orb.style.transform = `scale(${scale.toFixed(2)})`;
        }

        if (rms > SILENCE_THRESHOLD) {
          // User is speaking
          hasSpeech = true;
          clearTimeout(silenceTimer);
          silenceTimer = null;
        } else if (hasSpeech && !silenceTimer) {
          // Silence detected after speech — start countdown
          silenceTimer = setTimeout(() => {
            if (isRecording) stopMic();
          }, SILENCE_DELAY);
        }

        vadRaf = requestAnimationFrame(vadLoop);
      }
      vadRaf = requestAnimationFrame(vadLoop);

      // Store cleanup ref
      mediaRecorder._maxTimer = maxTimer;

    } catch (e) {
      console.error('[Layla] Mic error:', e);
      setVoiceUI('idle');
      vtAppend('Layla', 'Microphone access was denied. Please allow mic access and try again.');
    }
  }

  function stopMic() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    clearTimeout(silenceTimer);
    clearTimeout(mediaRecorder._maxTimer);
    silenceTimer = null;
    // Reset orb scale
    const orb = document.getElementById('lc-orb');
    if (orb) orb.style.transform = '';
    try { mediaRecorder.stop(); } catch (_) {}
  }

  function stopVAD() {
    if (vadRaf) { cancelAnimationFrame(vadRaf); vadRaf = null; }
  }

  function closeAudioCtx() {
    if (audioCtx) { try { audioCtx.close(); } catch (_) {} audioCtx = null; analyser = null; }
  }

  // Process captured audio: STT → AI → TTS
  async function processUserSpeech(blob) {
    setVoiceUI('thinking');
    try {
      // 1. Transcribe
      const fd = new FormData();
      fd.append('audio', blob, 'speech.webm');
      const sttRes = await fetch(API.stt, { method: 'POST', body: fd });
      if (!sttRes.ok) throw new Error('STT ' + sttRes.status);
      const { text: userText } = await sttRes.json();

      if (!userText || !userText.trim()) {
        // Nothing useful heard — listen again silently
        if (mode === 'voice') startListening();
        return;
      }

      vtAppend('You', userText.trim());
      messages.push({ role: 'user', content: userText.trim() });

      // 2. AI response
      const { text: reply, booking } = await callAI(messages);

      if (booking) {
        onBooking(booking);
        sendEmail(booking);
      }

      if (reply) {
        messages.push({ role: 'assistant', content: reply });
        vtAppend('Layla', reply);
        // After booking confirmation, speak then go idle (don't re-listen forever)
        if (booking) {
          laylaSpeak(reply);
          const utt = currentUtt;
          if (utt) utt.onend = () => { currentUtt = null; setVoiceUI('idle'); };
        } else {
          laylaSpeak(reply);
        }
      } else if (mode === 'voice') {
        startListening();
      }

    } catch (e) {
      console.error('[Layla] Voice error:', e);
      const msg = 'Sorry, I had a connection issue. Let me try again.';
      vtAppend('Layla', msg);
      if (mode === 'voice') laylaSpeak(msg);
    }
  }

  function stopVoiceAll(resetMode) {
    stopSpeaking();
    stopMic();
    stopVAD();
    closeAudioCtx();
    clearTimeout(silenceTimer);
    silenceTimer = null;
    isRecording  = false;
    hasSpeech    = false;
    audioChunks  = [];
    setVoiceUI('idle');
    if (resetMode !== false) {
      mode     = null;
      messages = [];
    }
  }

  function endVoice() {
    stopVoiceAll(true);
    document.getElementById('lc-voice').classList.remove('active');
    document.getElementById('lc-vt').innerHTML = '';
    document.getElementById('lc-mode').style.display = 'flex';
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('lc-bubble')) return;
    injectStyles();
    buildHTML();
    initEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
