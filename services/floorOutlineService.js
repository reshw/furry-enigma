/**
 * FloorOutlineService.js
 * 층별개요 조회 서비스 설정
 */

const FloorOutlineService = {
    id: 'floor-outline',
    title: '🏢 층별개요 조회',
    description: '건축물의 층별 개요 정보를 조회합니다',
    endpoint: 'getBrFlrOulnInfo',
    
    // 서비스별 검색 필드 (현재는 공통 필드만 사용)
    searchFields: [],
    
    // 상세 검색 필드
    advancedFields: [
        {
            id: 'platGbCd',
            label: '대지구분코드',
            type: 'select',
            placeholder: '대지구분 선택',
            options: [
                { value: '', text: '전체' },
                { value: '0', text: '0: 대지' },
                { value: '1', text: '1: 임야' }
            ],
            gridClass: 'form-group'
        },
        {
            id: 'startDate',
            label: '검색시작일',
            type: 'text',
            placeholder: 'yyyymmdd (예: 20240101)',
            gridClass: 'grid-2-item'
        },
        {
            id: 'endDate',
            label: '검색종료일',
            type: 'text',
            placeholder: 'yyyymmdd (예: 20241231)',
            gridClass: 'grid-2-item'
        }
    ],
    
    // 테이블 헤더 설정
    tableHeaders: {
        platPlc: '대지위치',
        bldNm: '건물명',
        dongNm: '동명칭',
        flrNoNm: '층',
        area: '면적(㎡)',
        areaPyeong: '면적(평)',
        mainPurpsCdNm: '주용도',
        etcPurps: '기타용도'
    },
    
    // API 파라미터 설정
    requiredParams: ['sigunguCd', 'bjdongCd', 'bun'],
    optionalParams: ['ji', 'platGbCd', 'startDate', 'endDate', 'numOfRows', 'pageNo'],
    
    // 서비스 초기화
    init() {
        console.log(`🏢 ${this.title} 서비스가 초기화되었습니다.`);
    },
    
    // 데이터 후처리 (필요시)
    processData(items) {
        return items.map(item => {
            const areaNum = parseFloat(item.area);
            if (!isNaN(areaNum)) {
                item.area = parseFloat(areaNum.toFixed(2));
                item.areaPyeong = parseFloat((areaNum * 0.3025).toFixed(2));
            }
            return item;
        });
    },
    
    // 유효성 검사
    validateParams(params) {
        const errors = [];
        
        if (!params.sigunguCd) {
            errors.push('시군구코드가 필요합니다. 행정구역을 먼저 검색하고 선택해주세요.');
        }
        if (!params.bjdongCd) {
            errors.push('법정동코드가 필요합니다. 행정구역을 먼저 검색하고 선택해주세요.');
        }
        if (!params.bun) {
            errors.push('번지가 필요합니다. 지번을 입력해주세요.');
        }
        
        // 날짜 형식 검증
        if (params.startDate && !/^\d{8}$/.test(params.startDate)) {
            errors.push('검색시작일은 yyyymmdd 형식이어야 합니다.');
        }
        if (params.endDate && !/^\d{8}$/.test(params.endDate)) {
            errors.push('검색종료일은 yyyymmdd 형식이어야 합니다.');
        }
        
        return errors;
    }
};

// 서비스 자동 등록
document.addEventListener('DOMContentLoaded', function() {
    if (window.serviceManager) {
        window.serviceManager.registerService(FloorOutlineService.id, FloorOutlineService);
        FloorOutlineService.init();
    }
});

// 전역에서 사용할 수 있도록 등록
window.FloorOutlineService = FloorOutlineService;