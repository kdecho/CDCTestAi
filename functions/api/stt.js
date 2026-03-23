export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    if (!audioFile) return Response.json({ error: 'No audio' }, { status: 400 });
    const audioBuffer = await audioFile.arrayBuffer();
    const result = await env.AI.run('@cf/openai/whisper', {
      audio: [...new Uint8Array(audioBuffer)],
    });
    return Response.json({ text: result.text, language: result.language }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
