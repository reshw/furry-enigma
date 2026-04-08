/**
 * Netlify Function: region-proxy
 * 행정구역 API 프록시 (CORS 우회)
 */

exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/xml; charset=utf-8'
  };

  // OPTIONS 요청 처리 (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // 쿼리 파라미터 추출
    const params = event.queryStringParameters || {};
    
    // 필수 파라미터 체크
    if (!params.ServiceKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ServiceKey is required' })
      };
    }

    // API URL 구성
    const baseUrl = 'https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList';
    const queryParams = new URLSearchParams({
      ServiceKey: params.ServiceKey,
      type: params.type || 'xml',
      pageNo: params.pageNo || '1',
      numOfRows: params.numOfRows || '300',
      flag: params.flag || 'Y',
      locatadd_nm: params.locatadd_nm || ''
    });

    const apiUrl = `${baseUrl}?${queryParams.toString()}`;

    // 공공데이터 API 호출
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.text();

    return {
      statusCode: 200,
      headers,
      body: data
    };

  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Proxy request failed',
        message: error.message 
      })
    };
  }
};
