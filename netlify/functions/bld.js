// netlify/functions/bld.js
// 목적: 프런트에서 endpoint를 쿼리로 넘기면 해당 공공API 엔드포인트로 프록시 호출.
//      응답의 CORS 헤더를 단일 값으로 정리해 브라우저 CORS 차단을 해소.

const ALLOWED_ENDPOINTS = new Set([
  'getBrFlrOulnInfo',        // 층별개요
  'getBrExposPubuseAreaInfo' // 전유/공용면적
  // 필요하면 여기에 추가
]);

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  try {
    const qsObj = event.queryStringParameters || {};
    const endpoint = (qsObj.endpoint || '').trim();

    // 1) 엔드포인트 필수 + 화이트리스트 검사
    if (!endpoint) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'Missing endpoint',
      };
    }
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: `Unsupported endpoint: ${endpoint}`,
      };
    }

    // 2) upstream 쿼리 재조립 (endpoint는 제거)
    const qs = new URLSearchParams(qsObj);
    qs.delete('endpoint');
    if (!qs.has('_type')) qs.set('_type', 'json'); // 안전장치

    // 3) upstream 호출
    const upstreamURL = `https://apis.data.go.kr/1613000/BldRgstHubService/${endpoint}?${qs.toString()}`;
    const resp = await fetch(upstreamURL);
    const body = await resp.arrayBuffer();

    // 4) CORS를 단일 값으로 정상화해 반환
    return {
      statusCode: resp.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': resp.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from(body).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: true, message: String(err) }),
    };
  }
}
