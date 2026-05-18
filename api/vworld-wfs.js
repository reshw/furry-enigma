// Vercel API Route: /api/vworld-wfs
// Vworld WFS API 프록시: 좌표 기준 반경 내 필지(PNU) 목록 조회
// 입력: lat, lon (WGS84), radius (미터, 기본 100)
// 출력: 반경 내 필지 배열 { pnu, jibun, distance, centroidLat, centroidLon }

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function polygonCentroid(coordinates) {
  const ring = coordinates[0];
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of ring) {
    sumLon += lon;
    sumLat += lat;
  }
  return [sumLon / ring.length, sumLat / ring.length];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { lat, lon, radius = '100' } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat, lon 파라미터가 필요합니다' });

  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'VWORLD_API_KEY not configured' });

  const cLat = parseFloat(lat);
  const cLon = parseFloat(lon);
  const r = parseFloat(radius);

  if (isNaN(cLat) || isNaN(cLon) || isNaN(r)) {
    return res.status(400).json({ error: 'lat, lon, radius는 숫자여야 합니다' });
  }

  // 반경의 1.5배 버퍼로 bbox 계산 (WGS84 근사값)
  const latDelta = (r * 1.5) / 111000;
  const lonDelta = (r * 1.5) / (111000 * Math.cos(cLat * Math.PI / 180));
  const bbox = `${cLon - lonDelta},${cLat - latDelta},${cLon + lonDelta},${cLat + latDelta}`;

  try {
    const wfsUrl = [
      'https://api.vworld.kr/req/wfs',
      '?SERVICE=WFS&REQUEST=GetFeature',
      '&TYPENAME=LP_PA_CBND_BUBUN',
      `&BBOX=${bbox},EPSG:4326`,
      '&SRSNAME=EPSG:4326',
      '&OUTPUT=application/json',
      '&MAXFEATURES=300',
      `&KEY=${apiKey}`
    ].join('');

    const response = await fetch(wfsUrl);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Vworld WFS ${response.status}: ${text.slice(0, 200)}`);
    }

    const geojson = await response.json();
    const features = geojson?.features || [];

    const parcels = features
      .map((f) => {
        const geom = f.geometry;
        if (!geom?.coordinates) return null;

        const coords = geom.type === 'MultiPolygon'
          ? geom.coordinates[0]
          : geom.coordinates;

        const [cLon2, cLat2] = polygonCentroid(coords);
        const dist = haversineMeters(cLat, cLon, cLat2, cLon2);
        if (dist > r) return null;

        const p = f.properties || {};
        return {
          pnu: p.PNU || p.PNUCODE || '',
          jibun: p.JIBUN || '',
          landType: p.BCHK_TYPE_NM || p.LNDCGRNM || '',
          distance: Math.round(dist),
          centroidLat: cLat2,
          centroidLon: cLon2,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({ success: true, count: parcels.length, parcels });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}
