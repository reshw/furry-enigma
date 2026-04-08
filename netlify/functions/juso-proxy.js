// netlify/functions/juso-proxy.js
// 주소검색 API 프록시

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
    const keyword = qsObj.keyword || '';

    if (!keyword) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'keyword 파라미터가 필요합니다' }),
      };
    }

    // 주소검색 API 호출
    const apiKey = 'devU01TX0FVVEgyMDI1MDMyNTEzNTgyNjExNTU3NTU=';
    const url = `https://www.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${apiKey}&currentPage=1&countPerPage=10&keyword=${encodeURIComponent(keyword)}&resultType=json`;

    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: true, message: String(err) }),
    };
  }
}
