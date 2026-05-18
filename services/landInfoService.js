/**
 * LandInfoService.js
 * vworld 토지임야목록조회 서비스
 * API: https://api.vworld.kr/ned/data/ladfrlList
 */

const LandInfoService = {
    id: 'land-info',
    title: '🌏 토지정보',
    description: '필지의 토지임야 정보를 조회합니다',
    endpoint: null,

    searchFields: [],

    advancedFields: [
        {
            id: 'platGbCd',
            label: '대지구분',
            type: 'select',
            placeholder: '대지구분 선택',
            options: [
                { value: '1', text: '1: 토지(대지)' },
                { value: '2', text: '2: 산(임야)' },
            ],
            gridClass: 'form-group'
        }
    ],

    tableHeaders: {
        ldCodeNm:       '법정동명',
        mnnmSlno:       '지번',
        lndcgrCodeNm:   '지목',
        lndpclAr:       '면적(㎡)',
        lndpclArPyeong: '면적(평)',
        regstrSeCodeNm: '대장구분',
        posesnSeCodeNm: '소유구분',
        cnrsPsnCo:      '공유인수',
        prposAreaNm:    '용도지역',
        prposDstrcNm:   '용도지구',
        ladPblntfPclnd: '공시지가(원/㎡)',
        stdrYear:       '공시기준년도',
        lastUpdtDt:     '기준일자',
    },

    requiredParams: ['sigunguCd', 'bjdongCd', 'bun'],
    optionalParams: ['ji', 'platGbCd', 'numOfRows', 'pageNo'],

    init() {
        console.log(`🌏 ${this.title} 서비스가 초기화되었습니다.`);
    },

    processData(items) {
        return items.map(item => {
            const arNum = parseFloat(item.lndpclAr);
            if (!isNaN(arNum)) {
                item.lndpclAr       = parseFloat(arNum.toFixed(2));
                item.lndpclArPyeong = parseFloat((arNum * 0.3025).toFixed(2));
            }
            item.cnrsPsnCo    = item.cnrsPsnCo    || '-';
            item.prposAreaNm  = item.prposAreaNm  || '-';
            item.prposDstrcNm = item.prposDstrcNm || '-';
            if (item.ladPblntfPclnd) {
                item.ladPblntfPclnd = parseInt(item.ladPblntfPclnd, 10);
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
};

// LandInfoService는 /api/land 프록시를 직접 호출하므로
// apiManager의 buildProxyBaseWithEndpoint 대신 커스텀 URL 사용
LandInfoService.getProxyUrl = function(params) {
    const qs = new URLSearchParams({
        sigunguCd: params.sigunguCd || '',
        bjdongCd:  params.bjdongCd  || '',
        bun:       params.bun       || '',
        ji:        params.ji        || '0',
        platGbCd:  params.platGbCd  || '1',
        numOfRows: params.numOfRows || '100',
        pageNo:    params.pageNo    || '1',
        _type:     'json',
    });
    return `/api/land?${qs}`;
};

document.addEventListener('DOMContentLoaded', function() {
    if (window.serviceManager) {
        window.serviceManager.registerService(LandInfoService.id, LandInfoService);
        LandInfoService.init();
    }
});

window.LandInfoService = LandInfoService;
