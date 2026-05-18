# TODO

## 완료
- [x] Netlify → Vercel 마이그레이션 (`api/` 디렉터리)
- [x] API 키 전부 서버 env로 이전 (config.js 비움)
- [x] AI 묻기 탭 숨김 (Gemini 키 없음)
- [x] `api/vworld-proxy.js` — 주소 → WGS84 좌표 (Geocoding)
- [x] `api/vworld-wfs.js` — 좌표 기준 반경 100m 필지(PNU) 조회 (WFS)
- [x] `api/bld.js` — `getBrTitleInfo` 엔드포인트 추가

---

## 남은 것: 반경 조회 UI 연결

백엔드는 다 있음. 프론트에서 파이프라인만 이으면 됨.

### Step 1 — 주소 입력 UI
- [ ] 새 탭 또는 섹션: 도로명주소 입력 → `/api/vworld-proxy` 호출 → 좌표 반환

### Step 2 — 반경 필지 조회
- [ ] 좌표 → `/api/vworld-wfs?lat=&lon=&radius=100` 호출 → PNU 목록

### Step 3 — 건축물대장 일괄 조회
- [ ] PNU 목록 → `/api/bld?endpoint=getBrTitleInfo&...` 병렬 호출 (Promise.all)
- [ ] 나대지(건축물 없음) 처리: 빈 행으로 포함

### Step 4 — 결과 테이블 + 엑셀
- [ ] 컬럼: 주소 / PNU / 건물명 / 주용도 / 대지면적 / 연면적 / 층수 / 준공연도 / 거리(m)
- [ ] 기존 `downloadManager.js` 재활용해서 엑셀 다운로드

---

## 참고: 현재 앱 구조

```
api/
  bld.js           건축물대장 프록시 (층별개요·전유면적·표제부)
  region-proxy.js  행정구역 검색
  vworld-proxy.js  주소 → 좌표 (Geocoding)
  vworld-wfs.js    좌표 → 반경 필지 목록 (NEW)
  juso-proxy.js    주소 자동완성
  ai-ask.js        Gemini (현재 숨김)

common/
  apiManager.js    건축물대장 API 오케스트레이터
  locationModule.js 행정구역 선택 UI
  downloadManager.js 엑셀 다운로드
  tableManager.js  결과 테이블 렌더링
```
