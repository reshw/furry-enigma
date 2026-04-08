// netlify/functions/vworld-proxy.js
// vworld Geocoding API 프록시 (도로명주소 → 법정동코드 + 지번 변환)

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
    const address = qsObj.address || '';
    const apiKey = qsObj.key || '';

    if (!address) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'address 파라미터가 필요합니다' }),
      };
    }

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'key 파라미터가 필요합니다 (vworld API 키)' }),
      };
    }

    // vworld Geocoding API 호출 (주소 → 좌표 변환)
    const url = `http://api.vworld.kr/req/address?service=address&request=getCoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&format=json&type=road&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // 응답 검증
    if (data.response?.status !== 'OK') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: data.response?.status || 'API 호출 실패',
          message: data.response?.error?.text || '알 수 없는 오류'
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: data
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: true,
        message: String(err)
      }),
    };
  }
}
