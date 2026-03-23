const SYSTEM_PROMPT = `You are Layla, the friendly and professional virtual receptionist for Cedars Dental Centre, located in Mansourieh, Lebanon. You work on behalf of the clinic to greet callers, answer questions about services, and collect appointment booking information.

You speak English only. Always respond in English regardless of what language the patient uses.

Your tone is warm, calm, and professional — like a kind receptionist at a trusted family dental clinic.

CLINIC INFORMATION:
- Clinic name: Cedars Dental Centre
- Location: Lebanon, Mansourieh Main Road, Latifa Center, 4th Floor
- Phone: +961 70 533 831
- Email: info@cedarsdentalcentre.com
- Website: www.cedarsdentalcentre.com
- Opening hours: (Monday to Friday, 10am to 6pm) (Saturday, 9am to 2pm) (Closed on Sundays

SERVICES OFFERED:
- General Dentistry (check-ups, cleanings, fillings)
- Cosmetic Dentistry (whitening, veneers, smile design)
- Pediatric Dentistry (children's dental care)
- Restorative Dentistry (crowns, bridges, dentures)
- Preventive Dentistry
- Orthodontics (braces, aligners)
- Oral Surgery (extractions, wisdom teeth)
- Implantology (dental implants)
- TMD / Jaw Pain Treatment

CONVERSATION FLOW - Follow these steps in order. Never skip steps. Never ask more than one question at a time.

Step 1 - GREETING: Greet the caller warmly and introduce yourself as Layla.
- English: "Hello! Thank you for calling Cedars Dental Centre. My name is Layla, your virtual receptionist. How can I help you today?"

Step 2 - UNDERSTAND THE NEED: Ask what brings them in today.

Step 3 - COLLECT PATIENT INFORMATION (one field per turn):
1. Full name
2. Phone number (confirm by repeating it back)
3. Preferred appointment date
4. Service or reason for visit
5. New or returning patient?

Step 4 - CONFIRMATION SUMMARY: Read back all collected information and ask to confirm.

Step 5 - CLOSING: Thank the patient, tell them the team will contact them shortly.

IMPORTANT RULES:
- Never output internal thoughts, notes, or meta-commentary like "Note:", "I'll wait", "I'm thinking", etc. Only speak directly to the patient.
- Never ask more than one question per turn
- Never make up information not listed above
- For pricing questions: explain that pricing depends on the individual case and the dentist will provide a quote during the appointment
- For dental emergencies: express empathy, advise them to come directly or call +961 70 533 831
- For unavailable information: say the team will confirm all details when they call back
- For callers wanting to speak to a human: note it and say a team member will call back soon
- When the patient has confirmed their details in Step 4, output a special JSON block at the END of your message formatted EXACTLY like this (after your spoken text):
  BOOKING_DATA:{"fullName":"...","phone":"...","preferredDate":"...","service":"...","patientType":"..."}`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// ── Strip model artefacts from response ────────────────────────────────────────
function cleanResponse(text) {
  if (!text) return text;
  return text
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (!t) return true; // keep blank lines (paragraph breaks)
      // Drop lines that are internal model meta-commentary
      if (/^note\s*:/i.test(t)) return false;
      if (/^annexed\s/i.test(t)) return false;
      if (/^i('ll| will) wait/i.test(t)) return false;
      if (/^waiting for/i.test(t)) return false;
      if (/^\(note:/i.test(t)) return false;
      if (/^\[note:/i.test(t)) return false;
      if (/^assistant\s*:/i.test(t)) return false;
      if (/^layla\s*:/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .trim();
}

// ── /api/chat ──────────────────────────────────────────────────────────────────
async function handleChat(request, env) {
  try {
    const { messages = [] } = await request.json();
    const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 300,
      temperature: 0.7,
    });
    return json({ response: cleanResponse(result.response) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── /api/stt ───────────────────────────────────────────────────────────────────
async function handleSTT(request, env) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    if (!audioFile) return json({ error: 'No audio file provided' }, 400);
    const buffer = await audioFile.arrayBuffer();
    const result = await env.AI.run('@cf/openai/whisper', {
      audio: [...new Uint8Array(buffer)],
    });
    return json({ text: result.text, language: result.language });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── /api/email ─────────────────────────────────────────────────────────────────
async function handleEmail(request, env) {
  try {
    const { appointmentData: d, transcript = [] } = await request.json();
    const now = new Date().toISOString();

    const transcriptBlock = transcript.length
      ? transcript.map(m => `${m.role === 'user' ? 'Patient' : 'Layla  '}: ${m.content}`).join('\n')
      : 'No transcript available.';

    const textContent = `New appointment request received via Cedars Dental Centre virtual assistant (Layla).

--- PATIENT DETAILS ---
Full Name:              ${d.fullName || 'Not provided'}
Phone Number:           ${d.phone || 'Not provided'}
Preferred Date & Time:  ${d.preferredDate || 'Not provided'}
Service / Reason:       ${d.service || 'Not provided'}
New or Returning:       ${d.patientType || 'Not provided'}

--- CALL DETAILS ---
Submission date/time:   ${now}

--- FULL CONVERSATION TRANSCRIPT ---
${transcriptBlock}

---
This request was submitted automatically via the Layla virtual assistant.
Please follow up with the patient to confirm their appointment.

Cedars Dental Centre — info@cedarsdentalcentre.com — +961 70 533 831`;

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Layla - Virtual Receptionist', email: 'layla-ai@cedarsdentalcenter.com' },
        to: [{ email: 'info@cedarsdentalcentre.com', name: 'Cedars Dental Centre' }],
        subject: `New Appointment Request — ${d.fullName || 'Unknown'}`,
        textContent,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return json({ success: false, error: err }, 500);
    }
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── Main fetch handler ─────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') return corsOptions();

    if (pathname === '/api/chat' && method === 'POST') return handleChat(request, env);
    if (pathname === '/api/stt'  && method === 'POST') return handleSTT(request, env);
    if (pathname === '/api/email' && method === 'POST') return handleEmail(request, env);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
