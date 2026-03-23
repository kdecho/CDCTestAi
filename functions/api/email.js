export async function onRequestPost(context) {
  try {
    const { request } = context;
    const { appointmentData } = await request.json();
    const now = new Date().toISOString();
    const emailBody = `New appointment request received via Cedars Dental Centre virtual assistant (Layla).

---
PATIENT DETAILS
---
Full Name: ${appointmentData.fullName || 'Not provided'}
Phone Number: ${appointmentData.phone || 'Not provided'}
Email Address: ${appointmentData.email || 'Not provided'}
Preferred Date (1st choice): ${appointmentData.preferredDate1 || 'Not provided'}
Preferred Date (2nd choice): ${appointmentData.preferredDate2 || 'Not provided'}
Preferred Time: ${appointmentData.preferredTime || 'Not provided'}
Service / Reason for Visit: ${appointmentData.service || 'Not provided'}
New or Returning Patient: ${appointmentData.patientType || 'Not provided'}
Special Notes: ${appointmentData.notes || 'None'}

---
CALL DETAILS
---
Language used: ${appointmentData.language || 'Not detected'}
Submission date/time: ${now}

---
This request was submitted automatically. Please follow up with the patient to confirm their appointment.
Cedars Dental Centre — info@cedarsdentalcentre.com — +961 70 533 831`;

    const mailchannelsReq = new Request('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'info@cedarsdentalcentre.com', name: 'Cedars Dental Centre' }] }],
        from: { email: 'noreply@cedarsdentalcentre.com', name: 'Layla - Virtual Receptionist' },
        subject: `New Appointment Request — ${appointmentData.fullName || 'Unknown'}`,
        content: [{ type: 'text/plain', value: emailBody }],
      }),
    });
    const resp = await fetch(mailchannelsReq);
    return Response.json({ success: resp.ok, status: resp.status }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
