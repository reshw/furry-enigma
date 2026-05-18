/**
 * LandPriceService.js
 * vworld 개별공시지가 속성조회 (시계열) 서비스
 * API: https://api.vworld.kr/ned/data/getIndvdLandPriceAttr
 */

const LandPriceService = {
    id: 'land-price',
    title: '📊 공시지가',
    description: '필지의 연도별 개별공시지가 시계열을 조회합니다',
    endpoint: null,

    searchFields: [],
    advancedFields: [],

    tableHeaders: {
        ldCodeNm:    '법정동명',
        mnnmSlno:    '지번',
        stdrYear:    '기준년도',
        pblntfDe:    '공시일자',
        pblntfPclnd: '공시지가(원/㎡)',
        totPrice:    '총공시가(원)',
        lastUpdtDt:  '수정일자',
    },

    requiredParams: ['sigunguCd', 'bjdongCd', 'bun'],
    optionalParams: ['ji', 'platGbCd', 'numOfRows', 'pageNo'],

    init() {
        console.log(`📊 ${this.title} 서비스가 초기화되었습니다.`);
    },

    processData(items) {
        return items.map(item => {
            const price = parseInt(item.pblntfPclnd, 10);
            if (!isNaN(price)) {
                item.pblntfPclnd = price;
                const ar = parseFloat(item.lndpclAr);
                if (!isNaN(ar)) {
                    item.totPrice = Math.round(price * ar);
                }
            }
            return item;
        });
    },

    validateParams(params) {
        const errors = [];
        if (!params.sigunguCd) errors.push('시군구코드가 필요합니다. 행정구역을 먼저 검색하고 선택해주세요.');
        if (!params.bjdongCd)  errors.push('법정동코드가 필요합니다. 행정구역을 먼저 검색하고 선택해주세요.');
        if (!params.bun)       errors.push('번지가 필요합니다. 지번을 입력해주세요.');
        return errors;
    },

    getProxyUrl(params) {
        const qs = new URLSearchParams({
            sigunguCd: params.sigunguCd || '',
            bjdongCd:  params.bjdongCd  || '',
            bun:       params.bun       || '',
            ji:        params.ji        || '0',
            platGbCd:  params.platGbCd  || '1',
            numOfRows: params.numOfRows || '100',
            pageNo:    params.pageNo    || '1',
        });
        return `/api/land-price?${qs}`;
    },
};

document.addEventListener('DOMContentLoaded', function() {
    if (window.serviceManager) {
        window.serviceManager.registerService(LandPriceService.id, LandPriceService);
        LandPriceService.init();
    }
});

window.LandPriceService = LandPriceService;
