/**
 * 일괄 조회 스크립트
 * 브라우저 콘솔에서 실행
 */

// 주소 리스트
const addresses = [
  "서울특별시 중구 을지로 30",
  "서울특별시 강남구 봉은사로 524",
  "서울특별시 용산구 청파로20길 95",
  "서울특별시 용산구 소월로 322",
  "서울특별시 강남구 테헤란로 521",
  "서울특별시 광진구 워커힐로 177",
  "서울특별시 송파구 올림픽로 240",
  "서울특별시 중구 동호로 249",
  "서울특별시 중구 소공로 106",
  "서울특별시 영등포구 국제금융로 10",
  "서울특별시 송파구 잠실로 209",
  "서울특별시 서초구 신반포로 176",
  "서울특별시 강남구 봉은사로 130",
  "서울특별시 중구 을지로 238",
  "서울특별시 종로구 새문안로 97",
  "서울특별시 영등포구 여의대로 108",
  "서울특별시 중구 소공로 119",
  "서울특별시 용산구 장문로 23",
  "서울특별시 강남구 테헤란로87길 46",
  "서울특별시 중구 동호로 287",
  "서울특별시 용산구 청파로20길 95",
  "서울특별시 강남구 테헤란로 231",
  "서울특별시 광진구 워커힐로 177",
  "서울특별시 강서구 방화대로 94",
  "서울특별시 송파구 올림픽로 300",
  "서울특별시 용산구 청파로20길 95",
  "서울특별시 중구 명동8나길 38",
  "서울특별시 마포구 마포대로 8",
  "서울특별시 강남구 테헤란로 606",
  "서울특별시 종로구 청계천로 279",
  "서울특별시 영등포구 여의대로 8",
  "서울특별시 중구 장충단로 60"
];

class BatchSearch {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  // 1단계: 도로명주소 → 법정동코드 + 지번 변환
  async convertAddress(roadAddr) {
    try {
      const url = `/api/vworld-proxy?address=${encodeURIComponent(roadAddr)}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || '주소 변환 실패');
      }

      const data = result.data;
      const item = data?.response?.result?.items?.[0];

      if (!item?.address) {
        throw new Error('주소를 찾을 수 없습니다');
      }

      const addr = item.address;

      // 법정동코드 추출 (10자리)
      const admCd = addr.admCd;
      if (!admCd || admCd.length < 10) {
        throw new Error('법정동코드를 찾을 수 없습니다');
      }

      const sigunguCd = admCd.substring(0, 5); // 시군구코드
      const bjdongCd = admCd.substring(5, 10); // 법정동코드

      // 지번 파싱 (parcel 주소에서 추출)
      const parcel = addr.parcel || ''; // "서울특별시 강남구 삼성동 159-3"
      const jibunMatch = parcel.match(/(\d+)(?:-(\d+))?(?:\s|$)/);

      let bun = '0000';
      let ji = '0000';

      if (jibunMatch) {
        bun = (jibunMatch[1] || '0').padStart(4, '0');
        ji = (jibunMatch[2] || '0').padStart(4, '0');
      }

      return {
        roadAddr,
        sigunguCd,
        bjdongCd,
        bun,
        ji,
        jibunAddr: parcel,
        success: true
      };
    } catch (error) {
      console.error(`주소 변환 실패: ${roadAddr}`, error);
      return {
        roadAddr,
        success: false,
        error: error.message
      };
    }
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

    // UI 업데이트
    if (window.UIManager) {
      window.UIManager.updateProgressBar(percent);
    }
  }

  // 4단계: 일괄 처리 실행
  async execute() {
    console.log('🚀 일괄 조회 시작:', addresses.length, '개 주소');

    this.results = [];
    this.errors = [];

    // 1) 주소 변환
    console.log('\n📍 1단계: 도로명주소 → 법정동+지번 변환 중...');
    const convertedAddresses = [];

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      this.updateProgress(i + 1, addresses.length);

      const converted = await this.convertAddress(addr);
      convertedAddresses.push(converted);

      if (!converted.success) {
        this.errors.push({
          address: addr,
          error: converted.error,
          step: '주소 변환'
        });
      }

      // API 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('✅ 주소 변환 완료:', convertedAddresses.filter(a => a.success).length, '개 성공');

    // 2) 건축물 정보 조회
    console.log('\n🏢 2단계: 건축물 정보 조회 중...');
    const allBuildingData = [];

    for (let i = 0; i < convertedAddresses.length; i++) {
      const addrInfo = convertedAddresses[i];
      if (!addrInfo.success) continue;

      this.updateProgress(i + 1, convertedAddresses.length);

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

      // API 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('✅ 건축물 조회 완료');

    // 3) 결과 통합
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

    // 4) Excel 다운로드
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
      { wch: 30 }, // 원본주소
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
async function runBatchSearch() {
  const batch = new BatchSearch();
  const result = await batch.execute();

  console.log('\n🎉 일괄 조회 완료!');
  console.log('성공:', result.success, '건');
  console.log('오류:', result.errors, '건');

  return result;
}

// 전역에 등록
window.BatchSearch = BatchSearch;
window.runBatchSearch = runBatchSearch;

console.log('✅ 일괄 조회 스크립트 로드 완료');
console.log('👉 실행하려면: runBatchSearch()');
