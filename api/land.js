// Vercel API Route: /api/land
// vworld 토지임야목록조회 + 개별공시지가기본현황 병합 프록시

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

  const gb     = (platGbCd && platGbCd !== '0') ? platGbCd : '1';
  const bunPad = String(bun).padStart(4, '0');
  const jiPad  = String(ji  || '0').padStart(4, '0');
  const pnu    = `${sigunguCd}${bjdongCd}${gb}${bunPad}${jiPad}`;
  const domain = process.env.VWORLD_DOMAIN || '';

  // ladfrlList: pnu 기반
  const landParams = new URLSearchParams({
    key:       apiKey,
    pnu,
    format:    'json',
    numOfRows: numOfRows || '100',
    pageNo:    pageNo    || '1',
    ...(domain && { domain }),
  });

  // getIndvdLandPrice: reqLvl(법정동코드) 기반
  const priceParams = new URLSearchParams({
    key:       apiKey,
    reqLvl:    `${sigunguCd}${bjdongCd}`,
    format:    'json',
    numOfRows: '1000',
    pageNo:    '1',
    ...(domain && { domain }),
  });

  try {
    const landUrl  = `https://api.vworld.kr/ned/data/ladfrlList?${landParams}`;
    const priceUrl = `https://api.vworld.kr/ned/data/getIndvdLandPrice?${priceParams}`;

    const [landRes, priceRes] = await Promise.all([fetch(landUrl), fetch(priceUrl)]);
    const [landData, priceData] = await Promise.all([landRes.json(), priceRes.json()]);

    // 토지임야 파싱
    const wrapper = landData?.ladfrlVOList ?? landData?.ladfrlList;
    if (!wrapper) {
      return res.status(200).json({ response: { body: { items: null, totalCount: 0 } }, _debug: landData });
    }
    const inner = wrapper.ladfrlVOList ?? wrapper.ladfrlList ?? wrapper.field ?? wrapper.item;
    let items = Array.isArray(inner) ? inner : (inner ? [inner] : []);

    // getIndvdLandPrice 파싱 및 해당 지번 병합
    const priceWrapper = priceData?.statelndvdLandPrices
                      ?? priceData?.indvdLandPrices
                      ?? priceData?.IndvdLandPrices;

    if (priceWrapper && !['INVALID_TYPE', 'ERROR', 'PARAM_REQUIRED'].includes(priceWrapper.resultCode)) {
      const pi = priceWrapper.field ?? priceWrapper.item;
      const priceItems = Array.isArray(pi) ? pi : (pi ? [pi] : []);

      if (priceItems.length > 0) {
        const jiNum = parseInt(ji || '0', 10);
        const expectedMnnmSlno = jiNum > 0
          ? `${parseInt(bun, 10)}-${jiNum}`
          : String(parseInt(bun, 10));

        const sorted = [...priceItems].sort((a, b) =>
          (b.stdrYear ?? '').localeCompare(a.stdrYear ?? '')
        );
        const matched = sorted.find(p => p.mnnmSlno === expectedMnnmSlno) ?? sorted[0];

        if (matched) {
          items = items.map(it => ({
            ...it,
            prposAreaNm:    matched.prposAreaNm    ?? '',
            prposDstrcNm:   matched.prposDstrcNm   ?? '',
            ladPblntfPclnd: matched.ladPblntfPclnd ?? '',
            stdrYear:       matched.stdrYear       ?? '',
          }));
        }
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
      _priceDebug: priceWrapper ?? priceData,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: String(err) });
  }
}
