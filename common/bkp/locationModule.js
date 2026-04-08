/**
 * LocationModule.js (MVP Flat List)
 * - 검색어 포함 결과를 "플랫 리스트"로 모두 보여줌
 * - 항목에 타입 배지(동/읍/면/리), 코드, 브레드크럼(원문명) 표시
 * - 선택 버튼은 항상 보임 (opacity 트릭 제거)
 * - 라이트 필터(전체/동/리), 간단 정렬(정확/접두/부분)
 */
class LocationModule {
  constructor() {
    this.CONFIG = {
      REGION_SERVICE_KEY: window.APP_CONFIG?.REGION_SERVICE_KEY || 'YOUR_REGION_SERVICE_KEY',
      PAGE_SIZE: 100 // API numOfRows=300이라도 렌더는 적당히 나눠도 됨(여기선 한 번에 표시)
    };

    this.state = {
      rawRows: [],
      items: [],
      filtered: [],
      selection: null,
      typeFilter: 'all', // 'all' | 'dong' | 'ri'
      query: ''
    };

    this.initEventListeners();
  }

  validateLocationSelection() {
    const sigungu = document.getElementById('sigunguCd')?.value.trim() || '';
    const bjdong  = document.getElementById('bjdongCd')?.value.trim() || '';
  
    if (!sigungu || !bjdong) {
      this.showToast('❗ 행정구역을 먼저 선택해주세요!', 'error');
      const statusDiv  = document.getElementById('regionSearchStatus');
      const resultsDiv = document.getElementById('regionResults');
      if (statusDiv) {
        statusDiv.innerHTML = '⚠️ <strong>지역을 선택해주세요.</strong> 검색 후 리스트에서 하나를 선택하세요.';
        statusDiv.style.display = 'block';
      }
      if (resultsDiv) resultsDiv.style.display = 'block';
      return false;
    }
    return true;
  }
  

  initEventListeners() {
    const $ = (id) => document.getElementById(id);

    // 검색 버튼 / Enter
    $('searchRegionBtn')?.addEventListener('click', () => this.searchRegion());
    $('regionSearch')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.searchRegion();
      }
    });

    // 지번 입력 관련 기존 로직 유지
    $('jibun')?.addEventListener('input', (e) => this.handleJibunInput(e));
    $('jibun')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const searchBtn = $('searchButton') || $('searchRegionBtn');
        if (searchBtn && !searchBtn.disabled) searchBtn.click();
      }
    });

    // 도움말 토글
    $('jibunHelpToggle')?.addEventListener('click', (e) => this.toggleHelp(e));
    document.addEventListener('click', (e) => this.handleOutsideClick(e));

    // 타입 필터 칩 (전체/동/리)
    $('chipAll')?.addEventListener('click', () => this.applyTypeFilter('all'));
    $('chipDong')?.addEventListener('click', () => this.applyTypeFilter('dong'));
    $('chipRi')?.addEventListener('click', () => this.applyTypeFilter('ri'));

    // 수동 법정동코드 입력 모드
    const manualSigungu = document.getElementById('sigunguCdManual');
    const manualBjdong = document.getElementById('bjdongCdManual');
    const applyManualBtn = document.getElementById('applyManualCodes');

    if (applyManualBtn) {
      applyManualBtn.addEventListener('click', () => {
        const sigunguCd = manualSigungu?.value.trim();
        const bjdongCd = manualBjdong?.value.trim();

        if (!sigunguCd || !bjdongCd) {
          this.showToast('❗ 코드 두 개 모두 입력해주세요.', 'error');
          return;
        }

        // hidden input에 반영 (기존 호환)
        document.getElementById('sigunguCd').value = sigunguCd;
        document.getElementById('bjdongCd').value = bjdongCd;

        // 선택 배지 표시
        const selectedDiv = document.getElementById('selectedRegion');
        selectedDiv.innerHTML = `
          <span class="check-icon">✅</span>
          <div>
            <strong>수동입력 완료:</strong><br>
            시군구코드: ${sigunguCd} | 법정동코드: ${bjdongCd}
          </div>`;
        selectedDiv.style.display = 'flex';

        this.showToast('✅ 수동 코드가 적용되었습니다!', 'success');
      });
    }

  }

  /* ---------- 검색 ---------- */
  async searchRegion() {
    const input = document.getElementById('regionSearch');
    const term = (input?.value || '').trim();
    if (!term) return this.showToast('동/리/지명을 입력해주세요.', 'error');

    const btn = document.getElementById('searchRegionBtn');
    const statusDiv = document.getElementById('regionSearchStatus');
    const resultsDiv = document.getElementById('regionResults');
    const selectedDiv = document.getElementById('selectedRegion');
    const summaryBar = document.getElementById('summaryBar');

    this.state.query = term;
    btn.disabled = true; btn.textContent = '검색중...'; btn.classList.add('loading');
    statusDiv.style.display = 'none';
    selectedDiv.style.display = 'none';
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
    summaryBar.style.display = 'none';

    try {
      const regurl = `https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList?ServiceKey=${encodeURIComponent(this.CONFIG.REGION_SERVICE_KEY)}&type=xml&pageNo=1&numOfRows=300&flag=Y&locatadd_nm=${encodeURIComponent(term)}`;
      const res = await fetch(regurl);
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, 'text/xml');
      const rows = Array.from(xml.querySelectorAll('row'));

      if (rows.length === 0) {
        this.renderEmpty('🔍 검색 결과가 없습니다. 예) 도곡동 / 도곡리');
        return;
      }

      // 1) 평면 아이템으로 변환
      const items = rows.map((r) => this.rowToItem(r));

      // 2) 중복 제거(코드 기준)
      const uniq = new Map();
      for (const it of items) uniq.set(it.fullCode, it);
      const deduped = Array.from(uniq.values());

      // 3) 간단 랭킹 점수 계산(정확>접두>부분)
      const scored = deduped.map((it) => ({ ...it, score: this.scoreItem(term, it) }))
                            .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, 'ko'));

      this.state.rawRows = rows;
      this.state.items = scored;
      this.applyTypeFilter(this.state.typeFilter, { silent: true }); // 현재 선택된 필터 유지 적용

      // 요약바
      const total = scored.length;
      const countDong = scored.filter(x => x.kindGroup === 'dong').length;
      const countRi = scored.filter(x => x.kindGroup === 'ri').length;
      document.getElementById('summaryText').textContent =
        `${term} 검색 결과 ${total}건 (동 ${countDong} · 리 ${countRi})`;
      document.getElementById('summaryBar').style.display = 'flex';

      statusDiv.style.display = 'block';
      statusDiv.textContent = '🔍 결과가 로드되었습니다.';
    } catch (err) {
      this.renderEmpty('검색 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      this.showToast('검색 오류: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = '검색'; btn.classList.remove('loading');
    }
  }

  rowToItem(r) {
    const name = r.querySelector('locatadd_nm')?.textContent?.trim() || '';
    const sido = r.querySelector('sido_cd')?.textContent || '';
    const sgg  = r.querySelector('sgg_cd')?.textContent || '';
    const umd  = r.querySelector('umd_cd')?.textContent || '';
    const ri   = r.querySelector('ri_cd')?.textContent || '00';

    // 코드 구성
    const sigungu = `${sido}${sgg}`;       // 시군구 코드 (5자리*2 형태일 수 있으나 API 기준 유지)
    const bjdong  = `${umd}${ri}`;         // 법정동(읍면동+리)
    const fullCode = `${sido}${sgg}${umd}${ri}`;

    // 타입 라벨(리/동/읍/면 파악)
    const kindGroup = (ri !== '00') ? 'ri' : 'dong';
    const tail = name.slice(-1);
    const typeByName = (ri !== '00') ? '리' : (tail === '동' ? '동' : (tail === '읍' ? '읍' : (tail === '면' ? '면' : '동')));

    return {
      displayName: name,      // UI 표기 이름 (API 원문명 그대로 사용)
      kindGroup,              // 'dong' | 'ri'
      typeLabel: typeByName,  // '동' | '읍' | '면' | '리'
      sigungu, bjdong, fullCode
    };
  }

  scoreItem(term, it) {
    const t = term.trim();
    const name = it.displayName;
    if (!t || !name) return 0;
    if (name === t) return 300;                 // 완전일치
    if (name.startsWith(t)) return 200;         // 접두일치
    if (name.includes(t)) return 100;           // 부분일치
    // 간단 초성 매칭(ㄷㄱ -> 도곡) 등은 필요시 추가
    return 0;
  }

  /* ---------- 필터링 & 렌더 ---------- */
  applyTypeFilter(type, opts = {}) {
    this.state.typeFilter = type; // 'all' | 'dong' | 'ri'
    const chips = ['chipAll', 'chipDong', 'chipRi'];
    chips.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active');
    });
    if (type === 'all') document.getElementById('chipAll')?.classList.add('active');
    if (type === 'dong') document.getElementById('chipDong')?.classList.add('active');
    if (type === 'ri') document.getElementById('chipRi')?.classList.add('active');

    let list = this.state.items || [];
    if (type === 'dong') list = list.filter(x => x.kindGroup === 'dong');
    if (type === 'ri') list = list.filter(x => x.kindGroup === 'ri');

    this.state.filtered = list;
    this.renderList(list);

    if (!opts.silent) {
      const t = this.state.query || '';
      const total = (this.state.items || []).length;
      const sub = (type === 'all') ? '' : (type === 'dong' ? ' (동만 보기)' : ' (리만 보기)');
      document.getElementById('summaryText').textContent =
        `${t} 검색 결과 ${total}건${sub}`;
    }
  }

  renderList(list) {
    const resultsDiv = document.getElementById('regionResults');
    resultsDiv.innerHTML = '';

    if (!list || list.length === 0) {
      this.renderEmpty('검색 결과가 없습니다.', resultsDiv);
      return;
    }

    for (const it of list) {
      const row = document.createElement('div');
      row.className = 'result-item';

      const main = document.createElement('div');
      main.className = 'result-main';

      const badge = document.createElement('span');
      badge.className = 'badge ' + this.kindToBadgeClass(it.typeLabel);
      badge.textContent = it.typeLabel;

      const nameEl = document.createElement('div');
      nameEl.className = 'place-name';
      nameEl.textContent = it.displayName;

      main.appendChild(badge);
      main.appendChild(nameEl);

      const btn = document.createElement('button');
      btn.className = 'select-btn';
      btn.textContent = '선택';
      btn.addEventListener('click', () => this.selectRegion(it));

      const sub = document.createElement('div');
      sub.className = 'result-sub';
      sub.innerHTML = `코드 <span class="code-pill">${it.fullCode}</span> · 시군구:${it.sigungu} · 법정동:${it.bjdong}`;

      row.appendChild(main);
      row.appendChild(btn);
      row.appendChild(sub);
      resultsDiv.appendChild(row);
    }

    resultsDiv.style.display = 'block';
  }

  renderEmpty(message, target = document.getElementById('regionResults')) {
    target.innerHTML = `<div class="empty-state">${message}</div>`;
    target.style.display = 'block';
    const statusDiv = document.getElementById('regionSearchStatus');
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.textContent = '검색 결과 없음';
    }
  }

  kindToBadgeClass(typeLabel) {
    if (typeLabel === '동') return 'badge-dong';
    if (typeLabel === '읍') return 'badge-eup';
    if (typeLabel === '면') return 'badge-myeon';
    return 'badge-ri'; // 리
    }

  /* ---------- 선택 ---------- */
  selectRegion(item) {
    // 상태 반영
    this.state.selection = {
      label: item.displayName,
      sigungu: item.sigungu,
      bjdong: item.bjdong,
      code: item.fullCode,
      type: item.typeLabel
    };

    // hidden input에 주입 (기존 호환)
    const sigunguEl = document.getElementById('sigunguCd');
    const bjdongEl = document.getElementById('bjdongCd');
    if (sigunguEl) sigunguEl.value = item.sigungu;
    if (bjdongEl) bjdongEl.value = item.bjdong;

    // 선택 배지 표시
    const selectedDiv = document.getElementById('selectedRegion');
    selectedDiv.innerHTML = `
      <span class="check-icon">✅</span>
      <div>
        <strong>선택완료:</strong> [${item.typeLabel}] ${item.displayName}<br>
        <small>시군구: ${item.sigungu} | 법정동: ${item.bjdong} | 코드: ${item.fullCode}</small>
      </div>
    `;
    selectedDiv.style.display = 'flex';

    // ✅ NEW: 선택 후 리스트/요약/상태 감추기
    const resultsDiv = document.getElementById('regionResults');
    const statusDiv  = document.getElementById('regionSearchStatus');
    const summaryBar = document.getElementById('summaryBar'); // 없으면 무시됨
    if (resultsDiv) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; }
    if (statusDiv)  { statusDiv.style.display  = 'none'; }
    if (summaryBar) { summaryBar.style.display = 'none'; }

    this.showToast('✅ 지역이 선택되었습니다!', 'success');
     // 선택 배지로 초점 이동(선택 직후 깔끔)
    selectedDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 기존 유지: 지번/도움말 ---------- */
  handleJibunInput(e) {
    const val = e.target.value.trim();
    const previewDiv = document.getElementById('jibunPreview');

    if (!val) {
      if (previewDiv) previewDiv.textContent = '';
      const bun = document.getElementById('bun');
      const ji = document.getElementById('ji');
      if (bun) bun.value = '';
      if (ji) ji.value = '';
      return;
    }

    const bunEl = document.getElementById('bun');
    const jiEl = document.getElementById('ji');

    if (val.includes('-')) {
      const [bunRaw, jiRaw] = val.split('-');
      const bun = (bunRaw || '').padStart(4, '0');
      const ji = (jiRaw || '').padStart(4, '0');
      if (bunEl) bunEl.value = bun;
      if (jiEl) jiEl.value = ji;
      if (previewDiv) {
        previewDiv.innerHTML = ji === '0000'
          ? `🎯 <strong>${bunRaw}번지만</strong> 조회`
          : `🎯 <strong>${bunRaw}-${jiRaw}번지</strong> 조회`;
      }
    } else {
      const bun = val.padStart(4, '0');
      if (bunEl) bunEl.value = bun;
      if (jiEl) jiEl.value = '';
      if (previewDiv) previewDiv.innerHTML = `🏘️ <strong>${val}번지 전체</strong> 조회`;
    }
  }

  toggleHelp(e) {
    e.preventDefault();
    const tooltip = document.getElementById('jibunHelpTooltip');
    const toggle = document.getElementById('jibunHelpToggle');
    if (!tooltip || !toggle) return;
    tooltip.classList.toggle('show');
    toggle.classList.toggle('active');
  }

  handleOutsideClick(e) {
    const tooltip = document.getElementById('jibunHelpTooltip');
    const toggle = document.getElementById('jibunHelpToggle');
    const inputGroup = document.querySelector('.input-with-help');
    if (!tooltip || !toggle || !inputGroup) return;
    if (!inputGroup.contains(e.target)) {
      tooltip.classList.remove('show');
      toggle.classList.remove('active');
    }
  }

  /* ---------- 유틸 ---------- */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

window.LocationModule = LocationModule;
