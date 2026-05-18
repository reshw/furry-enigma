// Vercel API Route: /api/vworld-proxy
// Vworld Geocoding API 프록시 (도로명주소 → WGS84 좌표)
// 키는 VWORLD_API_KEY 환경변수에서 읽음 (클라이언트에 노출 안 됨)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address 파라미터가 필요합니다' });

  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'VWORLD_API_KEY not configured' });

  try {
    const url = `http://api.vworld.kr/req/address?service=address&request=getCoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&format=json&type=road&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.response?.status !== 'OK') {
      return res.status(200).json({
        success: false,
        error: data.response?.status || 'API 호출 실패',
        message: data.response?.error?.text || '알 수 없는 오류'
      });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: String(err) });
  }
}
