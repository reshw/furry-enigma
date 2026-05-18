// Vercel API Route: /api/juso-proxy
// 주소검색 API 프록시 — 키는 JUSO_API_KEY 환경변수에서 읽음

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' });

  const apiKey = process.env.JUSO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'JUSO_API_KEY not configured' });

  try {
    const url = `https://www.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${apiKey}&currentPage=1&countPerPage=10&keyword=${encodeURIComponent(keyword)}&resultType=json`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: true, message: String(err) });
  }
}
