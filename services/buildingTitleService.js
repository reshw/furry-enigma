/**
 * BuildingTitleService.js
 * 건축물 표제부 조회 서비스
 */

const BuildingTitleService = {
    id: 'building-title',
    title: '📋 표제부',
    description: '건축물의 표제부 정보를 조회합니다',
    endpoint: 'getBrTitleInfo',

    searchFields: [],

    advancedFields: [
        {
            id: 'platGbCd',
            label: '대지구분코드',
            type: 'select',
            placeholder: '대지구분 선택',
            options: [
                { value: '', text: '전체' },
                { value: '0', text: '0: 대지' },
                { value: '1', text: '1: 산(임야)' },
                { value: '2', text: '2: 잡종지' }
            ],
            gridClass: 'form-group'
        }
    ],

    tableHeaders: {
        platPlc:          '대지위치',
        bldNm:            '건물명',
        dongNm:           '동명칭',
        mainAtchGbCdNm:   '주부속구분',
        mainPurpsCdNm:    '주용도',
        etcPurps:         '기타용도',
        platArea:         '대지면적(㎡)',
        platAreaPyeong:   '대지면적(평)',
        archArea:         '건축면적(㎡)',
        bcRat:            '건폐율(%)',
        totArea:          '연면적(㎡)',
        totAreaPyeong:    '연면적(평)',
        vlRat:            '용적률(%)',
        gndFlrCnt:        '지상층수',
        ugrndFlrCnt:      '지하층수',
        heit:             '높이(m)',
        strctCdNm:        '구조',
        roofCdNm:         '지붕',
        rideUseElvtCnt:   '승용승강기',
        emgenUseElvtCnt:  '비상승강기',
        useAprDay:        '사용승인일',
        pmsDay:           '허가일',
        stcnsDay:         '착공일',
    },

    requiredParams: ['sigunguCd', 'bjdongCd', 'bun'],
    optionalParams: ['ji', 'platGbCd', 'numOfRows', 'pageNo'],

    init() {
        console.log(`📋 ${this.title} 서비스가 초기화되었습니다.`);
    },

    processData(items) {
        return items.map(item => {
            const platNum = parseFloat(item.platArea);
            if (!isNaN(platNum)) {
                item.platArea       = parseFloat(platNum.toFixed(2));
                item.platAreaPyeong = parseFloat((platNum * 0.3025).toFixed(2));
            }
            const archNum = parseFloat(item.archArea);
            if (!isNaN(archNum)) {
                item.archArea = parseFloat(archNum.toFixed(2));
            }
            const totNum = parseFloat(item.totArea);
            if (!isNaN(totNum)) {
                item.totArea       = parseFloat(totNum.toFixed(2));
                item.totAreaPyeong = parseFloat((totNum * 0.3025).toFixed(2));
            }
            item.dongNm          = item.dongNm          || '-';
            item.bldNm           = item.bldNm           || '-';
            item.etcPurps        = item.etcPurps        || '-';
            item.mainAtchGbCdNm  = item.mainAtchGbCdNm  || '-';
            item.roofCdNm        = item.roofCdNm        || '-';
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

document.addEventListener('DOMContentLoaded', function() {
    if (window.serviceManager) {
        window.serviceManager.registerService(BuildingTitleService.id, BuildingTitleService);
        BuildingTitleService.init();
    }
});

window.BuildingTitleService = BuildingTitleService;
