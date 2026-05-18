const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function errorResponse(statusCode, code, message, extra = {}) {
  return jsonResponse(statusCode, {
    error: true,
    code,
    message,
    ...extra
  });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw error;
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(500, 'GEMINI_KEY_MISSING', 'GEMINI_API_KEY is not configured');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const question = String(body.question || '').trim();
    const purposeSummary = Array.isArray(body.purposeSummary) ? body.purposeSummary : [];

    if (!question) {
      return errorResponse(400, 'QUESTION_MISSING', 'Missing question');
    }

    if (purposeSummary.length === 0) {
      return errorResponse(400, 'PURPOSE_SUMMARY_MISSING', 'Missing purpose summary');
    }

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
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: 'Return only valid JSON. Be conservative and practical.'
            }
          ]
        },
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
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
              matchedPurposes: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              }
            },
            required: ['mode', 'answer', 'caution', 'reasoning', 'matchedPurposes']
          }
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return errorResponse(geminiResponse.status, 'GEMINI_UPSTREAM_ERROR', errorText.slice(0, 1000));
    }

    const result = await geminiResponse.json();
    const text = result?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    if (!text) {
      return errorResponse(502, 'GEMINI_EMPTY_RESPONSE', 'Empty Gemini response');
    }

    const parsed = safeJsonParse(text);
    return jsonResponse(200, {
      ok: true,
      result: parsed
    });
  } catch (error) {
    return errorResponse(500, 'AI_ASK_INTERNAL_ERROR', String(error));
  }
}
