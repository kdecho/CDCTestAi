(function () {
  'use strict';

  const API = {
    chat: '/api/chat',
    stt: '/api/stt',
    email: '/api/email',
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  let messages = [];
  let isOpen = false;
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let isSpeaking = false;
  let isLoading = false;
  let conversationStarted = false;
  let loadingMsgEl = null;
  let currentLang = 'en';

  // ─── CSS ─────────────────────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'layla-widget-styles';
    style.textContent = `
      :root {
        --layla-teal: #0d9488;
        --layla-teal-dark: #0f766e;
        --layla-teal-light: #ccfbf1;
        --layla-dark: #1e293b;
        --layla-gray: #f1f5f9;
        --layla-gray-mid: #e2e8f0;
        --layla-text: #334155;
        --layla-white: #ffffff;
        --layla-red: #ef4444;
        --layla-shadow: 0 8px 32px rgba(13,148,136,0.18), 0 2px 8px rgba(0,0,0,0.10);
        --layla-radius: 16px;
      }

      #layla-bubble {
        position: fixed;
        bottom: 90px;
        left: 24px;
        z-index: 9998;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--layla-teal);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--layla-shadow);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: none;
        outline: none;
        user-select: none;
      }
      #layla-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 12px 36px rgba(13,148,136,0.28), 0 4px 12px rgba(0,0,0,0.14);
      }
      #layla-bubble:active {
        transform: scale(0.96);
      }
      #layla-bubble svg {
        width: 28px;
        height: 28px;
        fill: var(--layla-white);
        pointer-events: none;
      }
      #layla-bubble-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 18px;
        height: 18px;
        background: var(--layla-red);
        border-radius: 50%;
        border: 2px solid white;
        font-size: 10px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        display: none;
      }

      #layla-panel {
        position: fixed;
        bottom: 170px;
        left: 24px;
        width: 360px;
        height: 520px;
        background: var(--layla-white);
        border-radius: var(--layla-radius);
        box-shadow: var(--layla-shadow);
        display: none;
        flex-direction: column;
        z-index: 9997;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translateY(16px);
        opacity: 0;
        transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease;
      }
      #layla-panel.open {
        display: flex;
        transform: translateY(0);
        opacity: 1;
      }
      #layla-panel.animate-in {
        transform: translateY(0);
        opacity: 1;
      }

      /* Header */
      #layla-header {
        background: linear-gradient(135deg, var(--layla-teal) 0%, var(--layla-teal-dark) 100%);
        color: var(--layla-white);
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      #layla-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
      #layla-header-info {
        flex: 1;
        min-width: 0;
      }
      #layla-header-name {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #layla-header-status {
        font-size: 12px;
        opacity: 0.88;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 1px;
      }
      #layla-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        display: inline-block;
        box-shadow: 0 0 0 2px rgba(74,222,128,0.3);
        animation: layla-pulse-dot 2s infinite;
      }
      @keyframes layla-pulse-dot {
        0%, 100% { box-shadow: 0 0 0 2px rgba(74,222,128,0.3); }
        50% { box-shadow: 0 0 0 4px rgba(74,222,128,0.15); }
      }
      #layla-close-btn {
        background: rgba(255,255,255,0.15);
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        line-height: 1;
        transition: background 0.15s;
        flex-shrink: 0;
      }
      #layla-close-btn:hover {
        background: rgba(255,255,255,0.28);
      }

      /* Messages area */
      #layla-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #f8fafc;
        scroll-behavior: smooth;
      }
      #layla-messages::-webkit-scrollbar {
        width: 4px;
      }
      #layla-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      #layla-messages::-webkit-scrollbar-thumb {
        background: var(--layla-gray-mid);
        border-radius: 4px;
      }

      .layla-msg-row {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        animation: layla-msg-in 0.22s ease;
      }
      @keyframes layla-msg-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .layla-msg-row.user {
        flex-direction: row-reverse;
      }
      .layla-msg-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        background: var(--layla-teal-light);
      }
      .layla-msg-row.user .layla-msg-avatar {
        background: var(--layla-gray-mid);
      }
      .layla-bubble-text {
        max-width: 78%;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.55;
        word-break: break-word;
        white-space: pre-wrap;
      }
      .layla-msg-row.assistant .layla-bubble-text {
        background: var(--layla-white);
        color: var(--layla-text);
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      }
      .layla-msg-row.user .layla-bubble-text {
        background: var(--layla-teal);
        color: var(--layla-white);
        border-bottom-right-radius: 4px;
      }
      .layla-msg-row[dir="rtl"].user .layla-bubble-text {
        border-bottom-right-radius: 18px;
        border-bottom-left-radius: 4px;
      }
      .layla-msg-row[dir="rtl"].assistant .layla-bubble-text {
        border-bottom-left-radius: 18px;
        border-bottom-right-radius: 4px;
      }

      /* Loading dots */
      #layla-loading-row {
        display: flex;
        align-items: flex-end;
        gap: 6px;
      }
      .layla-loading-dots {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--layla-white);
        padding: 12px 16px;
        border-radius: 18px;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      }
      .layla-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--layla-teal);
        animation: layla-bounce 1.2s infinite;
      }
      .layla-dot:nth-child(2) { animation-delay: 0.18s; }
      .layla-dot:nth-child(3) { animation-delay: 0.36s; }
      @keyframes layla-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-6px); opacity: 1; }
      }

      /* Input area */
      #layla-input-area {
        padding: 10px 12px;
        border-top: 1px solid var(--layla-gray-mid);
        background: var(--layla-white);
        display: flex;
        align-items: flex-end;
        gap: 8px;
        flex-shrink: 0;
      }
      #layla-textarea {
        flex: 1;
        border: 1.5px solid var(--layla-gray-mid);
        border-radius: 22px;
        padding: 9px 14px;
        font-size: 14px;
        font-family: inherit;
        resize: none;
        outline: none;
        line-height: 1.45;
        max-height: 100px;
        overflow-y: auto;
        transition: border-color 0.15s;
        color: var(--layla-text);
        background: var(--layla-gray);
      }
      #layla-textarea:focus {
        border-color: var(--layla-teal);
        background: white;
      }
      #layla-textarea::placeholder {
        color: #94a3b8;
      }
      #layla-send-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--layla-teal);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.15s, transform 0.12s;
        box-shadow: 0 2px 8px rgba(13,148,136,0.25);
      }
      #layla-send-btn:hover:not(:disabled) {
        background: var(--layla-teal-dark);
        transform: scale(1.07);
      }
      #layla-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      #layla-send-btn svg {
        width: 18px;
        height: 18px;
        fill: white;
      }
      #layla-mic-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--layla-dark);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.15s, transform 0.12s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      }
      #layla-mic-btn:hover:not(:disabled) {
        background: #334155;
        transform: scale(1.07);
      }
      #layla-mic-btn.recording {
        background: var(--layla-red);
        animation: layla-rec-pulse 1s infinite;
      }
      @keyframes layla-rec-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }
      #layla-mic-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        animation: none;
      }
      #layla-mic-btn svg {
        width: 18px;
        height: 18px;
        fill: white;
      }

      /* Recording status bar */
      #layla-rec-status {
        display: none;
        align-items: center;
        gap: 6px;
        padding: 5px 14px;
        background: #fee2e2;
        border-top: 1px solid #fecaca;
        font-size: 12px;
        color: var(--layla-red);
        font-weight: 500;
        flex-shrink: 0;
      }
      #layla-rec-status.visible {
        display: flex;
      }
      .layla-rec-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--layla-red);
        animation: layla-blink 1s infinite;
        flex-shrink: 0;
      }
      @keyframes layla-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }

      /* Booking confirmation banner */
      .layla-booking-banner {
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        border: 1px solid #6ee7b7;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        color: #065f46;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: layla-msg-in 0.22s ease;
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        #layla-panel {
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 90vh !important;
          border-radius: 20px 20px 0 0 !important;
        }
        #layla-bubble {
          bottom: 80px;
          left: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Build HTML ───────────────────────────────────────────────────────────────
  function buildHTML() {
    // Floating bubble
    const bubble = document.createElement('button');
    bubble.id = 'layla-bubble';
    bubble.setAttribute('aria-label', 'Open Layla chat');
    bubble.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
      <span id="layla-bubble-badge">1</span>
    `;

    // Panel
    const panel = document.createElement('div');
    panel.id = 'layla-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Layla chat');
    panel.innerHTML = `
      <div id="layla-header">
        <div id="layla-header-avatar">🦷</div>
        <div id="layla-header-info">
          <div id="layla-header-name">Layla — Cedars Dental Centre</div>
          <div id="layla-header-status">
            <span id="layla-status-dot"></span>
            <span id="layla-status-text">Online</span>
          </div>
        </div>
        <button id="layla-close-btn" aria-label="Close chat">✕</button>
      </div>

      <div id="layla-messages" role="log" aria-live="polite"></div>

      <div id="layla-rec-status">
        <span class="layla-rec-dot"></span>
        <span>Recording... tap mic to send</span>
      </div>

      <div id="layla-input-area">
        <textarea
          id="layla-textarea"
          rows="1"
          placeholder="Type a message..."
          aria-label="Message input"
        ></textarea>
        <button id="layla-mic-btn" aria-label="Voice input" title="Voice input">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
        </button>
        <button id="layla-send-btn" aria-label="Send message" title="Send">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────────
  function initEvents() {
    const bubble = document.getElementById('layla-bubble');
    const closeBtn = document.getElementById('layla-close-btn');
    const sendBtn = document.getElementById('layla-send-btn');
    const micBtn = document.getElementById('layla-mic-btn');
    const textarea = document.getElementById('layla-textarea');

    bubble.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    sendBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text && !isLoading) {
        textarea.value = '';
        autoResizeTextarea(textarea);
        sendMessage(text);
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textarea.value.trim();
        if (text && !isLoading) {
          textarea.value = '';
          autoResizeTextarea(textarea);
          sendMessage(text);
        }
      }
    });

    textarea.addEventListener('input', () => autoResizeTextarea(textarea));

    micBtn.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }

  function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  // ─── Toggle Panel ─────────────────────────────────────────────────────────────
  function togglePanel() {
    const panel = document.getElementById('layla-panel');
    const badge = document.getElementById('layla-bubble-badge');
    isOpen = !isOpen;

    if (isOpen) {
      panel.style.display = 'flex';
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.classList.add('open');
        });
      });
      badge.style.display = 'none';
      if (!conversationStarted) {
        conversationStarted = true;
        getGreeting();
      }
    } else {
      panel.classList.remove('open');
      setTimeout(() => {
        if (!isOpen) panel.style.display = 'none';
      }, 300);
    }
  }

  // ─── Language Detection ───────────────────────────────────────────────────────
  function detectLanguage(text) {
    if (!text) return 'en';
    // Arabic unicode range
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) return 'ar';
    // French indicators
    if (/\b(je|tu|il|elle|nous|vous|ils|bonjour|merci|oui|non|est|les|des|une|pour|avec|dans|sur|pas|mais|que|qui|ou|où|comment|quand|quel|quelle|voulez|pouvez|avez|êtes|docteur|rendez-vous|dentiste)\b/i.test(text)) return 'fr';
    return 'en';
  }

  // ─── Add Message Bubble ───────────────────────────────────────────────────────
  function addMessage(role, text) {
    const messagesEl = document.getElementById('layla-messages');
    const lang = detectLanguage(text);
    if (role === 'assistant') currentLang = lang;

    const row = document.createElement('div');
    row.className = `layla-msg-row ${role}`;
    if (lang === 'ar') {
      row.setAttribute('dir', 'rtl');
    }

    const avatar = document.createElement('div');
    avatar.className = 'layla-msg-avatar';
    avatar.textContent = role === 'assistant' ? '🦷' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'layla-bubble-text';
    bubble.textContent = text;

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    return row;
  }

  function scrollToBottom() {
    const el = document.getElementById('layla-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ─── Loading Indicator ────────────────────────────────────────────────────────
  function showLoading() {
    const messagesEl = document.getElementById('layla-messages');
    const row = document.createElement('div');
    row.id = 'layla-loading-row';
    row.className = 'layla-msg-row assistant';
    row.innerHTML = `
      <div class="layla-msg-avatar">🦷</div>
      <div class="layla-loading-dots">
        <div class="layla-dot"></div>
        <div class="layla-dot"></div>
        <div class="layla-dot"></div>
      </div>
    `;
    messagesEl.appendChild(row);
    loadingMsgEl = row;
    scrollToBottom();
  }

  function hideLoading() {
    if (loadingMsgEl) {
      loadingMsgEl.remove();
      loadingMsgEl = null;
    }
  }

  // ─── Set Buttons State ────────────────────────────────────────────────────────
  function setLoading(val) {
    isLoading = val;
    const sendBtn = document.getElementById('layla-send-btn');
    const micBtn = document.getElementById('layla-mic-btn');
    const textarea = document.getElementById('layla-textarea');
    if (sendBtn) sendBtn.disabled = val;
    if (micBtn && !isRecording) micBtn.disabled = val;
    if (textarea) textarea.disabled = val;
  }

  // ─── Parse AI Response ────────────────────────────────────────────────────────
  function parseAIResponse(text) {
    const bookingMarker = 'BOOKING_DATA:';
    const idx = text.indexOf(bookingMarker);
    if (idx === -1) return { displayText: text.trim(), bookingData: null };

    const displayText = text.substring(0, idx).trim();
    const jsonStr = text.substring(idx + bookingMarker.length).trim();
    let bookingData = null;
    try {
      // Find the JSON object boundaries
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        bookingData = JSON.parse(jsonStr.substring(start, end + 1));
      }
    } catch (e) {
      console.warn('[Layla] Failed to parse BOOKING_DATA JSON:', e);
    }
    return { displayText, bookingData };
  }

  // ─── Send Message ─────────────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (isLoading) return;

    // Add user message to state & UI (only if there is text)
    if (text) {
      messages.push({ role: 'user', content: text });
      addMessage('user', text);
    }

    setLoading(true);
    showLoading();

    try {
      const res = await fetch(API.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawResponse = data.response || '';

      hideLoading();

      const { displayText, bookingData } = parseAIResponse(rawResponse);

      if (displayText) {
        messages.push({ role: 'assistant', content: displayText });
        addMessage('assistant', displayText);

        // Text-to-speech if speech synthesis available
        if (window.speechSynthesis) {
          speakText(displayText, detectLanguage(displayText));
        }
      }

      if (bookingData) {
        // Show booking confirmation banner
        showBookingBanner();
        // Send email
        sendBookingEmail(bookingData);
      }
    } catch (e) {
      hideLoading();
      const errMsg = 'Sorry, I encountered a connection issue. Please try again or call us at +961 70 533 831.';
      addMessage('assistant', errMsg);
      console.error('[Layla] Chat error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ─── Get Greeting ─────────────────────────────────────────────────────────────
  async function getGreeting() {
    await sendMessage('');
  }

  // ─── Booking Banner ───────────────────────────────────────────────────────────
  function showBookingBanner() {
    const messagesEl = document.getElementById('layla-messages');
    const banner = document.createElement('div');
    banner.className = 'layla-booking-banner';
    banner.innerHTML = '✅ Your appointment request has been sent! Our team will contact you shortly.';
    messagesEl.appendChild(banner);
    scrollToBottom();
  }

  // ─── Send Booking Email ───────────────────────────────────────────────────────
  async function sendBookingEmail(data) {
    try {
      const res = await fetch(API.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentData: data }),
      });
      const result = await res.json();
      if (!result.success) {
        console.warn('[Layla] Email send status:', result.status);
      }
    } catch (e) {
      console.error('[Layla] Email send error:', e);
    }
  }

  // ─── Speech Synthesis ─────────────────────────────────────────────────────────
  function speakText(text, lang) {
    if (!window.speechSynthesis) return;
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { ar: 'ar-LB', fr: 'fr-FR', en: 'en-US' };
    utterance.lang = langMap[lang] || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const targetLang = utterance.lang.split('-')[0];
    const matchedVoice = voices.find(v => v.lang.startsWith(targetLang) && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith(targetLang));
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; };
    utterance.onerror = () => { isSpeaking = false; };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
    }
  }

  // ─── Voice Recording ──────────────────────────────────────────────────────────
  async function startRecording() {
    if (isLoading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : {};

      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunks, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        transcribeAudio(blob);
      };

      mediaRecorder.start(250);
      isRecording = true;

      const micBtn = document.getElementById('layla-mic-btn');
      const recStatus = document.getElementById('layla-rec-status');
      if (micBtn) micBtn.classList.add('recording');
      if (recStatus) recStatus.classList.add('visible');

    } catch (e) {
      console.error('[Layla] Microphone access error:', e);
      addMessage('assistant', 'Microphone access was denied. Please allow microphone access to use voice input.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;

      const micBtn = document.getElementById('layla-mic-btn');
      const recStatus = document.getElementById('layla-rec-status');
      if (micBtn) micBtn.classList.remove('recording');
      if (recStatus) recStatus.classList.remove('visible');
    }
  }

  async function transcribeAudio(blob) {
    setLoading(true);
    showLoading();
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch(API.stt, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
      const data = await res.json();

      hideLoading();
      setLoading(false);

      if (data.text && data.text.trim()) {
        sendMessage(data.text.trim());
      } else {
        addMessage('assistant', "I couldn't hear that clearly. Could you please try again or type your message?");
      }
    } catch (e) {
      hideLoading();
      setLoading(false);
      console.error('[Layla] STT error:', e);
      addMessage('assistant', 'Voice transcription failed. Please type your message instead.');
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    // Avoid double-init
    if (document.getElementById('layla-bubble')) return;

    injectStyles();
    buildHTML();
    initEvents();

    // Pre-load voices for speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        window.speechSynthesis.getVoices();
      });
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
