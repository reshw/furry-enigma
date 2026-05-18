/**
 * 일괄 조회 스크립트 (수동 매핑 버전)
 * 31개 주소를 수동으로 법정동+지번으로 변환
 */

// 주소 매핑 데이터 (웹 검색으로 수집)
const addressMappings = [
  { road: "서울특별시 중구 을지로 30", sigunguCd: "11140", bjdongCd: "10400", bun: "0188", ji: "0003", jibun: "소공동 188-3" },
  { road: "서울특별시 강남구 봉은사로 524", sigunguCd: "11680", bjdongCd: "10500", bun: "0159", ji: "0000", jibun: "삼성동 159" },
  { road: "서울특별시 용산구 청파로20길 95", sigunguCd: "11170", bjdongCd: "12800", bun: "0040", ji: "0969", jibun: "한강로3가 40-969" },
  { road: "서울특별시 용산구 소월로 322", sigunguCd: "11170", bjdongCd: "13100", bun: "0747", ji: "0007", jibun: "한남동 747-7" },
  { road: "서울특별시 강남구 테헤란로 521", sigunguCd: "11680", bjdongCd: "10500", bun: "0159", ji: "0008", jibun: "삼성동 159-8" },
  { road: "서울특별시 광진구 워커힐로 177", sigunguCd: "11215", bjdongCd: "10400", bun: "0022", ji: "0001", jibun: "광장동 22-1" },
  { road: "서울특별시 송파구 올림픽로 240", sigunguCd: "11710", bjdongCd: "10100", bun: "0040", ji: "0001", jibun: "잠실동 40-1" },
  { road: "서울특별시 중구 동호로 249", sigunguCd: "11140", bjdongCd: "13600", bun: "0018", ji: "0029", jibun: "장충동2가 18-29" },
  { road: "서울특별시 중구 소공로 106", sigunguCd: "11140", bjdongCd: "11100", bun: "0087", ji: "0001", jibun: "소공동 87-1" },
  { road: "서울특별시 영등포구 국제금융로 10", sigunguCd: "11560", bjdongCd: "11000", bun: "0023", ji: "0000", jibun: "여의도동 23" },
  { road: "서울특별시 송파구 잠실로 209", sigunguCd: "11710", bjdongCd: "10200", bun: "0029", ji: "0001", jibun: "신천동 29-1" },
  { road: "서울특별시 서초구 신반포로 176", sigunguCd: "11650", bjdongCd: "10700", bun: "0019", ji: "0003", jibun: "반포동 19-3" },
  { road: "서울특별시 강남구 봉은사로 130", sigunguCd: "11680", bjdongCd: "10500", bun: "0143", ji: "0035", jibun: "삼성동 143-35" },
  { road: "서울특별시 중구 을지로 238", sigunguCd: "11140", bjdongCd: "14800", bun: "0058", ji: "0005", jibun: "을지로6가 58-5" },
  { road: "서울특별시 종로구 새문안로 97", sigunguCd: "11110", bjdongCd: "12000", bun: "0024", ji: "0000", jibun: "신문로1가 24" },
  { road: "서울특별시 영등포구 여의대로 108", sigunguCd: "11560", bjdongCd: "11000", bun: "0022", ji: "0000", jibun: "여의도동 22" },
  { road: "서울특별시 중구 소공로 119", sigunguCd: "11140", bjdongCd: "11400", bun: "0023", ji: "0000", jibun: "태평로2가 23" },
  { road: "서울특별시 용산구 장문로 23", sigunguCd: "11170", bjdongCd: "13200", bun: "0309", ji: "0014", jibun: "동빙고동 309-14" },
  { road: "서울특별시 강남구 테헤란로87길 46", sigunguCd: "11680", bjdongCd: "10500", bun: "0159", ji: "0009", jibun: "삼성동 159-9" },
  { road: "서울특별시 중구 동호로 287", sigunguCd: "11140", bjdongCd: "14400", bun: "0186", ji: "0054", jibun: "장충동2가 186-54" },
  { road: "서울특별시 강남구 테헤란로 231", sigunguCd: "11680", bjdongCd: "10100", bun: "0676", ji: "0000", jibun: "역삼동 676" },
  { road: "서울특별시 강서구 방화대로 94", sigunguCd: "11500", bjdongCd: "10100", bun: "0839", ji: "0001", jibun: "방화동 839-1" },
  { road: "서울특별시 송파구 올림픽로 300", sigunguCd: "11710", bjdongCd: "10200", bun: "0029", ji: "0000", jibun: "신천동 29" },
  { road: "서울특별시 중구 명동8나길 38", sigunguCd: "11140", bjdongCd: "12400", bun: "0024", ji: "0006", jibun: "충무로1가 24-6" },
  { road: "서울특별시 마포구 마포대로 8", sigunguCd: "11440", bjdongCd: "10700", bun: "0309", ji: "0001", jibun: "마포동 309-1" },
  { road: "서울특별시 강남구 테헤란로 606", sigunguCd: "11680", bjdongCd: "10600", bun: "0995", ji: "0014", jibun: "대치동 995-14" },
  { road: "서울특별시 종로구 청계천로 279", sigunguCd: "11110", bjdongCd: "16400", bun: "0289", ji: "0003", jibun: "종로6가 289-3" },
  { road: "서울특별시 영등포구 여의대로 8", sigunguCd: "11560", bjdongCd: "11000", bun: "0028", ji: "0003", jibun: "여의도동 28-3" },
  { road: "서울특별시 중구 장충단로 60", sigunguCd: "11140", bjdongCd: "13600", bun: "0018", ji: "0003", jibun: "장충동2가 18-3" }
];

class BatchSearchManual {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  // 1단계: 주소 매핑 데이터 사용
  getAddressMapping(roadAddr) {
    const mapping = addressMappings.find(m => m.road === roadAddr);
    if (!mapping) {
      return {
        roadAddr,
        success: false,
        error: '주소 매핑 정보를 찾을 수 없습니다'
      };
    }

    return {
      roadAddr: mapping.road,
      sigunguCd: mapping.sigunguCd,
      bjdongCd: mapping.bjdongCd,
      bun: mapping.bun,
      ji: mapping.ji,
      jibunAddr: mapping.jibun,
      success: true
    };
  }

  // 2단계: 건축물대장 층별개요 조회
  async fetchBuildingInfo(addressInfo) {
    if (!addressInfo.success) {
      return null;
    }

    try {
      const endpoint = 'getBrFlrOulnInfo';

      const params = new URLSearchParams({
        _type: 'json',
        sigunguCd: addressInfo.sigunguCd,
        bjdongCd: addressInfo.bjdongCd,
        bun: addressInfo.bun,
        platGbCd: '0',
        numOfRows: '100',
        pageNo: '1'
      });

      // ji가 0000이 아니면 추가
      if (addressInfo.ji !== '0000') {
        params.append('ji', addressInfo.ji);
      }

      const url = `/api/bld?endpoint=${endpoint}&${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      const body = data?.response?.body;
      if (!body?.items) {
        return {
          ...addressInfo,
          buildingData: [],
          totalCount: 0
        };
      }

      let items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];

      return {
        ...addressInfo,
        buildingData: items,
        totalCount: body.totalCount || items.length
      };
    } catch (error) {
      console.error(`건축물 조회 실패: ${addressInfo.roadAddr}`, error);
      return {
        ...addressInfo,
        buildingData: [],
        totalCount: 0,
        error: error.message
      };
    }
  }

  // 3단계: 진행률 표시
  updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    console.log(`[${current}/${total}] 진행중... ${percent}%`);

    if (window.UIManager) {
      window.UIManager.updateProgressBar(percent);
    }
  }

  // 4단계: 일괄 처리 실행
  async execute() {
    console.log('🚀 일괄 조회 시작 (수동 매핑):', addressMappings.length, '개 주소');

    this.results = [];
    this.errors = [];

    // 중복 제거
    const uniqueAddresses = [...new Set(addressMappings.map(m => m.road))];
    console.log('중복 제거 후:', uniqueAddresses.length, '개 주소');

    // 건축물 정보 조회
    console.log('\n🏢 건축물 정보 조회 중...');
    const allBuildingData = [];

    for (let i = 0; i < uniqueAddresses.length; i++) {
      const roadAddr = uniqueAddresses[i];
      this.updateProgress(i + 1, uniqueAddresses.length);

      const addrInfo = this.getAddressMapping(roadAddr);
      if (!addrInfo.success) {
        this.errors.push({
          address: roadAddr,
          error: addrInfo.error,
          step: '주소 매핑'
        });
        continue;
      }

      const buildingInfo = await this.fetchBuildingInfo(addrInfo);
      if (buildingInfo) {
        allBuildingData.push(buildingInfo);

        if (buildingInfo.buildingData.length === 0) {
          this.errors.push({
            address: addrInfo.roadAddr,
            jibunAddr: addrInfo.jibunAddr,
            error: '건축물 정보 없음',
            step: '건축물 조회'
          });
        }
      }

      // API 제한 방지 딜레이
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('✅ 건축물 조회 완료');

    // 결과 통합
    const flatResults = [];
    allBuildingData.forEach(item => {
      if (item.buildingData && item.buildingData.length > 0) {
        item.buildingData.forEach(building => {
          flatResults.push({
            원본주소: item.roadAddr,
            지번주소: item.jibunAddr,
            대지위치: building.platPlc,
            건물명: building.bldNm,
            동명칭: building.dongNm || '-',
            층: building.flrNoNm,
            면적: building.area,
            주용도: building.mainPurpsCdNm,
            기타용도: building.etcPurps || '-'
          });
        });
      }
    });

    this.results = flatResults;

    console.log('\n📊 최종 결과:', flatResults.length, '건');
    console.log('❌ 오류:', this.errors.length, '건');

    if (this.errors.length > 0) {
      console.log('\n⚠️ 오류 목록:');
      console.table(this.errors);
    }

    // Excel 다운로드
    this.downloadExcel();

    return {
      success: flatResults.length,
      errors: this.errors.length,
      data: flatResults
    };
  }

  // 5단계: Excel 다운로드
  downloadExcel() {
    if (this.results.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(this.results);

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 35 }, // 원본주소
      { wch: 30 }, // 지번주소
      { wch: 30 }, // 대지위치
      { wch: 20 }, // 건물명
      { wch: 10 }, // 동명칭
      { wch: 10 }, // 층
      { wch: 12 }, // 면적
      { wch: 15 }, // 주용도
      { wch: 15 }  // 기타용도
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '층별개요');

    // 오류 시트 추가
    if (this.errors.length > 0) {
      const errorWs = XLSX.utils.json_to_sheet(this.errors);
      XLSX.utils.book_append_sheet(wb, errorWs, '오류목록');
    }

    // 파일 다운로드
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[:.-]/g, '_');
    const fileName = `일괄조회_층별개요_${this.results.length}건_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);

    console.log('✅ Excel 다운로드 완료:', fileName);

    if (window.UIManager) {
      window.UIManager.showToast(`📊 ${this.results.length}건의 데이터가 다운로드되었습니다.`, 'success');
    }
  }
}

// 실행 함수
async function runBatchSearchManual() {
  const batch = new BatchSearchManual();
  const result = await batch.execute();

  console.log('\n🎉 일괄 조회 완료!');
  console.log('성공:', result.success, '건');
  console.log('오류:', result.errors, '건');

  return result;
}

// 전역에 등록
window.BatchSearchManual = BatchSearchManual;
window.runBatchSearchManual = runBatchSearchManual;

console.log('✅ 일괄 조회 스크립트 (수동 매핑) 로드 완료');
console.log('👉 실행하려면: runBatchSearchManual()');
