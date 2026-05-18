// Vercel API Route: /api/land-price
// vworld 개별공시지가 속성조회 (시계열) 프록시
// https://api.vworld.kr/ned/data/getIndvdLandPriceAttr

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { sigunguCd, bjdongCd, bun, ji, platGbCd, numOfRows, pageNo } = req.query;

  if (!sigunguCd || !bjdongCd || !bun) {
    return res.status(400).json({ error: 'sigunguCd, bjdongCd, bun 파라미터가 필요합니다' });
  }

  const apiKey = process.env.VWORLD_API_KEY2;
  if (!apiKey) return res.status(500).json({ error: 'VWORLD_API_KEY2 not configured' });

  const gb     = (platGbCd && platGbCd !== '0') ? platGbCd : '1';
  const bunPad = String(bun).padStart(4, '0');
  const jiPad  = String(ji  || '0').padStart(4, '0');
  const pnu    = `${sigunguCd}${bjdongCd}${gb}${bunPad}${jiPad}`;
  const domain = process.env.VWORLD_DOMAIN || '';

  const params = new URLSearchParams({
    key:       apiKey,
    pnu,
    format:    'json',
    numOfRows: numOfRows || '100',
    pageNo:    pageNo    || '1',
    ...(domain && { domain }),
  });

  try {
    const url      = `https://api.vworld.kr/ned/data/getIndvdLandPriceAttr?${params}`;
    const upstream = await fetch(url);
    const data     = await upstream.json();

    // 응답 래퍼 탐색 (vworld NED 중첩 패턴)
    const wrapper = data?.indvdLandPrices
                 ?? data?.indvdLandPriceAttr
                 ?? data?.IndvdLandPriceAttr
                 ?? data?.indvdLandPriceList
                 ?? data?.indvdLandPrice;

    if (!wrapper) {
      return res.status(200).json({
        response: { body: { items: null, totalCount: 0 } },
        _debug: data
      });
    }

    const inner = wrapper.field
               ?? wrapper.indvdLandPriceAttr
               ?? wrapper.IndvdLandPriceAttr
               ?? wrapper.indvdLandPriceList
               ?? wrapper.indvdLandPrice
               ?? wrapper.item;

    let items = Array.isArray(inner) ? inner : (inner ? [inner] : []);

    // 최신순 정렬
    items = items.sort((a, b) =>
      (b.stdrYear ?? b.pblntfDe ?? '').localeCompare(a.stdrYear ?? a.pblntfDe ?? '')
    );

    const total = parseInt(wrapper.totalCount ?? items.length, 10);

    res.status(200).json({
      response: {
        body: {
          items:      items.length ? { item: items } : null,
          totalCount: total,
          pageNo:     parseInt(wrapper.pageNo    ?? pageNo    ?? 1,   10),
          numOfRows:  parseInt(wrapper.numOfRows ?? numOfRows ?? 100, 10),
        }
      },
      _sampleItem: items[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: String(err) });
  }
}
