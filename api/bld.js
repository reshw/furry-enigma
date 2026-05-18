// Vercel API Route: /api/bld
// 건축물대장 API 프록시

const ALLOWED_ENDPOINTS = new Set([
  'getBrFlrOulnInfo',
  'getBrExposPubuseAreaInfo',
  'getBrTitleInfo',  // 표제부 - 반경 조회 플로우에서 사용
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const qsObj = req.query || {};
  const endpoint = (qsObj.endpoint || '').trim();

  if (!endpoint) return res.status(400).send('Missing endpoint');
  if (!ALLOWED_ENDPOINTS.has(endpoint)) return res.status(400).send(`Unsupported endpoint: ${endpoint}`);

  const serviceKey = process.env.BUILDING_SERVICE_KEY;
  if (!serviceKey) return res.status(500).send('BUILDING_SERVICE_KEY not configured');

  const qs = new URLSearchParams(qsObj);
  qs.delete('endpoint');
  qs.delete('serviceKey'); // 클라이언트 값 무시, 서버 env로 덮어씀
  qs.set('serviceKey', serviceKey);
  if (!qs.has('_type')) qs.set('_type', 'json');

  try {
    const upstreamURL = `https://apis.data.go.kr/1613000/BldRgstHubService/${endpoint}?${qs.toString()}`;
    const resp = await fetch(upstreamURL);
    const body = await resp.arrayBuffer();

    res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(resp.status).send(Buffer.from(body));
  } catch (err) {
    res.status(500).json({ error: true, message: String(err) });
  }
}
