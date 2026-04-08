/**
 * ExclusiveAreaService.js
 * 전유공유면적 조회 서비스 설정
 */

const ExclusiveAreaService = {
    id: 'exclusive-area',
    title: '📐 전유공유면적 조회',
    description: '건축물의 전유공유면적 정보를 조회합니다',
    endpoint: 'getBrExposPubuseAreaInfo', // 올바른 엔드포인트로 수정!
    
    // 서비스별 검색 필드 (전유공유면적 전용)
    searchFields: [
        {
            id: 'dongNm',
            label: '🏢 동명칭',
            type: 'text',
            placeholder: '예: 101동, A동 (선택사항)',
            gridClass: 'grid-2-item'
        },
        {
            id: 'hoNm',
            label: '🏠 호명칭',
            type: 'text',
            placeholder: '예: 101호, 1001호 (선택사항)',
            gridClass: 'grid-2-item'
        }
    ],
    
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
                { value: '1', text: '1: 임야' },
                { value: '2', text: '2: 잡종지' }
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
    
    // 테이블 헤더 설정 (원래 설정대로 복구)
    tableHeaders: {
        platPlc: '대지위치',
        bldNm: '건물명',
        dongNm: '동명칭',
        hoNm: '호명칭',
        mainPurpsCdNm: '주용도',
        area: '면적(㎡)',
        flrNoNm: '층',
        exposPubuseGbCdNm: '전유공용구분',
        etcPurps: '기타용도'
    },
    
    // API 파라미터 설정
    requiredParams: ['sigunguCd', 'bjdongCd', 'bun'],
    optionalParams: ['ji', 'dongNm', 'hoNm', 'platGbCd', 'startDate', 'endDate', 'numOfRows', 'pageNo'],
    
    // 서비스 초기화
    init() {
        console.log(`📐 ${this.title} 서비스가 초기화되었습니다.`);
    },
    
    // 데이터 후처리 (필요시)
    processData(items) {
        return items.map(item => {
            // 면적 데이터 가공
            if (item.area) {
                const areaNum = parseFloat(item.area);
                if (!isNaN(areaNum)) {
                    item.area = areaNum.toFixed(2);
                }
            }
            
            // 전유공용구분 텍스트 개선
            if (item.exposPubuseGbCdNm) {
                // 이미 텍스트인 경우 그대로 사용
                if (item.exposPubuseGbCdNm === '1') {
                    item.exposPubuseGbCdNm = '전유';
                } else if (item.exposPubuseGbCdNm === '2') {
                    item.exposPubuseGbCdNm = '공용';
                }
            }
            
            // 빈 값 처리
            item.hoNm = item.hoNm || '-';
            item.etcPurps = item.etcPurps || '-';
            item.dongNm = item.dongNm || '-';
            item.flrNoNm = item.flrNoNm || '-';
            
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
    },
    
    // 엑셀 다운로드용 파일명 생성
    getExcelFileName(type = 'current') {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[:.-]/g, '_');
        const prefix = type === 'all' ? '전체_전유공유면적' : '전유공유면적';
        return `${prefix}_${dateStr}.xlsx`;
    }
};

// 서비스 자동 등록
document.addEventListener('DOMContentLoaded', function() {
    if (window.serviceManager) {
        window.serviceManager.registerService(ExclusiveAreaService.id, ExclusiveAreaService);
        ExclusiveAreaService.init();
    }
});

// 전역에서 사용할 수 있도록 등록
window.ExclusiveAreaService = ExclusiveAreaService;