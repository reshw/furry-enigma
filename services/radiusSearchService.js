const RadiusSearchService = {
    id: 'radius-search',
    title: '📍 반경 조회',
    hideAdvanced: true,
    hideDownloadAll: true,
    hideLocationModule: true,
    searchButtonText: '🔍 반경 조회',

    tableHeaders: {
        address: '주소',
        pnu: 'PNU',
        bldNm: '건물명',
        mainPurpsCdNm: '주용도',
        platArea: '대지면적(㎡)',
        totArea: '연면적(㎡)',
        grndFlrCnt: '지상층수',
        useAprDay: '사용승인일',
        distance: '거리(m)'
    },

    renderUI(container) {
        container.innerHTML = `
            <div class="form-group">
                <label for="radiusAddress">📍 도로명주소 <span class="required">*</span></label>
                <input type="text" id="radiusAddress" placeholder="예: 서울특별시 강남구 테헤란로 152" />
            </div>
            <div class="form-group">
                <label for="radiusM">반경 (m)</label>
                <input type="number" id="radiusM" value="100" min="10" max="500" />
            </div>
        `;
    },

    async performSearch() {
        const address = document.getElementById('radiusAddress')?.value?.trim();
        if (!address) throw new Error('도로명주소를 입력해 주세요.');

        const radius = parseInt(document.getElementById('radiusM')?.value, 10) || 100;

        window.UIManager.updateProgressBar(10);
        const geoRes = await fetch(`/api/vworld-proxy?address=${encodeURIComponent(address)}`);
        if (!geoRes.ok) throw new Error('주소 변환 API 오류');
        const geoJson = await geoRes.json();
        if (!geoJson.success) throw new Error('주소를 좌표로 변환하지 못했습니다: ' + (geoJson.message || geoJson.error || ''));

        const point = geoJson.data?.response?.result?.point;
        if (!point) throw new Error('주소에 해당하는 좌표를 찾지 못했습니다.');

        const lon = parseFloat(point.x);
        const lat = parseFloat(point.y);

        window.UIManager.updateProgressBar(30);
        const wfsRes = await fetch(`/api/vworld-wfs?lat=${lat}&lon=${lon}&radius=${radius}`);
        if (!wfsRes.ok) throw new Error('반경 필지 조회 API 오류');
        const wfsJson = await wfsRes.json();
        if (!wfsJson.success) throw new Error('반경 필지 조회 실패: ' + (wfsJson.error || ''));

        const parcels = wfsJson.parcels || [];
        if (parcels.length === 0) {
            window.UIManager.updateProgressBar(0);
            return { items: [], totalCount: 0 };
        }

        window.UIManager.updateProgressBar(50);
        const results = await Promise.all(parcels.map(p => this._fetchBuildingInfo(p)));

        const items = [];
        results.forEach((buildings, i) => {
            const parcel = parcels[i];
            if (buildings.length === 0) {
                items.push({
                    address: parcel.jibun || parcel.pnu,
                    pnu: parcel.pnu,
                    bldNm: '(건물 없음)',
                    mainPurpsCdNm: '',
                    platArea: '',
                    totArea: '',
                    grndFlrCnt: '',
                    useAprDay: '',
                    distance: parcel.distance
                });
            } else {
                buildings.forEach(bld => {
                    items.push({
                        address: bld.platPlc || parcel.jibun,
                        pnu: parcel.pnu,
                        bldNm: bld.bldNm || '',
                        mainPurpsCdNm: bld.mainPurpsCdNm || '',
                        platArea: bld.platArea ? parseFloat(bld.platArea).toFixed(1) : '',
                        totArea: bld.totArea ? parseFloat(bld.totArea).toFixed(1) : '',
                        grndFlrCnt: bld.grndFlrCnt || '',
                        useAprDay: bld.useAprDay || '',
                        distance: parcel.distance
                    });
                });
            }
        });

        window.UIManager.updateProgressBar(100);
        setTimeout(() => window.UIManager.updateProgressBar(0), 800);

        return { items, totalCount: items.length };
    },

    async _fetchBuildingInfo(parcel) {
        try {
            const pnu = parcel.pnu;
            if (!pnu || pnu.length < 19) return [];

            const sigunguCd = pnu.slice(0, 5);
            const bjdongCd = pnu.slice(5, 10);
            const platGbCd = pnu.slice(10, 11);
            const bun = pnu.slice(11, 15).replace(/^0+/, '') || '0';
            const ji = pnu.slice(15, 19).replace(/^0+/, '') || '0';

            const params = new URLSearchParams({
                endpoint: 'getBrTitleInfo',
                sigunguCd,
                bjdongCd,
                platGbCd,
                bun,
                ji,
                _type: 'json',
                numOfRows: '10',
                pageNo: '1'
            });

            const res = await fetch(`/api/bld?${params.toString()}`);
            if (!res.ok) return [];
            const json = await res.json();

            const raw = json?.response?.body?.items?.item;
            if (!raw) return [];
            return Array.isArray(raw) ? raw : [raw];
        } catch {
            return [];
        }
    },

    getExcelFileName() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[:.-]/g, '_');
        const addr = document.getElementById('radiusAddress')?.value?.trim() || '반경조회';
        const safeAddr = addr.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
        return `반경조회_${safeAddr}_${dateStr}.xlsx`;
    },

    init() {
        console.log(`📍 ${this.title} 서비스가 초기화되었습니다.`);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    if (window.serviceManager) {
        window.serviceManager.registerService(RadiusSearchService.id, RadiusSearchService);
        RadiusSearchService.init();
    }
});

window.RadiusSearchService = RadiusSearchService;
