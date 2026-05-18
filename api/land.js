// Vercel API Route: /api/land
// vworld 토지임야목록조회 프록시
// https://api.vworld.kr/ned/data/ladfrlList

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
  if (!apiKey) return res.status(500).json({ error: 'VWORLD_API_KEY not configured' });

  const gb     = platGbCd || '1';
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
    const landUrl  = `https://api.vworld.kr/ned/data/ladfrlList?${params}`;
    const priceUrl = `https://api.vworld.kr/ned/data/getIndvdLandPrice?${params}`;

    const [landRes, priceRes] = await Promise.all([fetch(landUrl), fetch(priceUrl)]);
    const [landData, priceData] = await Promise.all([landRes.json(), priceRes.json()]);

    // 토지임야 파싱
    const wrapper = landData?.ladfrlVOList ?? landData?.ladfrlList;
    if (!wrapper) {
      return res.status(200).json({ response: { body: { items: null, totalCount: 0 } }, _debug: landData });
    }
    const inner = wrapper.ladfrlVOList ?? wrapper.ladfrlList ?? wrapper.field ?? wrapper.item;
    let items = Array.isArray(inner) ? inner : (inner ? [inner] : []);

    // 최신 공시지가 파싱 후 파셀에 병합
    const priceWrapper = priceData?.indvdLandPriceList ?? priceData?.indvdLandPrice ?? priceData?.IndvdLandPriceList;
    if (priceWrapper) {
      const pi = priceWrapper.indvdLandPriceList ?? priceWrapper.indvdLandPrice ?? priceWrapper.field ?? priceWrapper.item;
      const priceItems = Array.isArray(pi) ? pi : (pi ? [pi] : []);
      if (priceItems.length > 0) {
        const latest = priceItems.sort((a, b) => (b.stdrYear ?? b.pblntfDe ?? '').localeCompare(a.stdrYear ?? a.pblntfDe ?? ''))[0];
        items = items.map(it => ({ ...it, pblntfPclnd: latest.pblntfPclnd, pblntfDe: latest.pblntfDe, stdrYear: latest.stdrYear }));
      }
    }

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
      _priceDebug: priceWrapper ?? priceData
    });
  } catch (err) {
    res.status(500).json({ error: true, message: String(err) });
  }
}
