// Vercel API Route: /api/region-proxy
// 행정구역 API 프록시 (CORS 우회)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = req.query || {};

  const serviceKey = process.env.REGION_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'REGION_SERVICE_KEY not configured' });

  const queryParams = new URLSearchParams({
    ServiceKey: serviceKey,
    type: params.type || 'xml',
    pageNo: params.pageNo || '1',
    numOfRows: params.numOfRows || '300',
    flag: params.flag || 'Y',
    locatadd_nm: params.locatadd_nm || ''
  });

  try {
    const apiUrl = `https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList?${queryParams.toString()}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    const data = await response.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
