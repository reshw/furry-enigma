// Vercel API Route: /api/ai-ask
// Google Gemini API 게이트웨이 — GEMINI_API_KEY 환경변수 필요

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('JSON 파싱 실패');
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: true, code: 'GEMINI_KEY_MISSING', message: 'GEMINI_API_KEY is not configured' });

  try {
    const body = req.body || {};
    const question = String(body.question || '').trim();
    const purposeSummary = Array.isArray(body.purposeSummary) ? body.purposeSummary : [];

    if (!question) return res.status(400).json({ error: true, code: 'QUESTION_MISSING', message: 'Missing question' });
    if (purposeSummary.length === 0) return res.status(400).json({ error: true, code: 'PURPOSE_SUMMARY_MISSING', message: 'Missing purpose summary' });

    const prompt = [
      '너는 건축물대장 해석 보조 AI다.',
      '사용자 질문을 보고, 아래 용도 요약표 중 어떤 용도들이 질문과 가장 관련 있는지 골라라.',
      '숫자를 새로 계산하지 말고, 제공된 요약만 바탕으로 추정하라.',
      '반드시 JSON으로만 답하라.',
      'matchedPurposes에는 purposeSummary에 존재하는 exact purpose name만 넣어라.',
      '질문이 용도별 요약을 원하면 mode를 "summary"로 두고 matchedPurposes는 빈 배열로 둬라.',
      '',
      `질문: ${question}`,
      '',
      `용도 요약표: ${JSON.stringify(purposeSummary)}`
    ].join('\n');

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: 'Return only valid JSON. Be conservative and practical.' }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              mode: { type: 'STRING' },
              answer: { type: 'STRING' },
              caution: { type: 'STRING' },
              reasoning: { type: 'STRING' },
              matchedPurposes: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['mode', 'answer', 'caution', 'reasoning', 'matchedPurposes']
          }
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return res.status(geminiResponse.status).json({ error: true, code: 'GEMINI_UPSTREAM_ERROR', message: errorText.slice(0, 1000) });
    }

    const result = await geminiResponse.json();
    const text = result?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    if (!text) return res.status(502).json({ error: true, code: 'GEMINI_EMPTY_RESPONSE', message: 'Empty Gemini response' });

    const parsed = safeJsonParse(text);
    res.status(200).json({ ok: true, result: parsed });
  } catch (error) {
    res.status(500).json({ error: true, code: 'AI_ASK_INTERNAL_ERROR', message: String(error) });
  }
}
