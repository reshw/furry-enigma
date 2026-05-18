class LocationModule {
  constructor() {
    this.state = { selection: null };
    this.initEventListeners();
  }

  validateLocationSelection() {
    const sigungu = document.getElementById('sigunguCd')?.value.trim() || '';
    const bjdong  = document.getElementById('bjdongCd')?.value.trim() || '';
    return Boolean(sigungu && bjdong);
  }

  hasLocationSelection() {
    return this.validateLocationSelection();
  }

  initEventListeners() {
    const $ = (id) => document.getElementById(id);

    // Mode pill toggle
    document.querySelectorAll('input[name="addrMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isRoad = e.target.value === 'road';
        const jibunContainer = $('jibunSearchContainer');
        const roadContainer  = $('roadSearchContainer');
        const jibunResults   = $('unifiedAddrResults');
        const roadResults    = $('roadSearchResults');
        if (jibunContainer) jibunContainer.style.display = isRoad ? 'none' : '';
        if (roadContainer)  roadContainer.style.display  = isRoad ? ''     : 'none';
        if (jibunResults)   { jibunResults.innerHTML = '';  jibunResults.style.display  = 'none'; }
        if (roadResults)    { roadResults.innerHTML  = '';  roadResults.style.display   = 'none'; }
      });
    });

    // Jibun search
    $('unifiedAddrSearchBtn')?.addEventListener('click', () => this._searchByJibun());
    $('unifiedAddrInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._searchByJibun(); }
    });

    // Road address search
    $('roadSearchBtn')?.addEventListener('click', () => this._searchByRoad());
    $('roadAddrInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._searchByRoad(); }
    });

    // Jibun input
    $('jibun')?.addEventListener('input', (e) => this.handleJibunInput(e));
    $('jibun')?.addEventListener('keypress', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const btn = $('searchButton');
      if (btn && !btn.disabled) btn.click();
    });

    // Jibun help tooltip
    $('jibunHelpToggle')?.addEventListener('click', (e) => this.toggleHelp(e));
    document.addEventListener('click', (e) => this.handleOutsideClick(e));

    // Manual code input
    $('applyManualCodes')?.addEventListener('click', () => {
      const sigunguCd = $('sigunguCdManual')?.value.trim();
      const bjdongCd  = $('bjdongCdManual')?.value.trim();
      if (!sigunguCd || !bjdongCd) {
        this.showToast('❗ 코드 두 개 모두 입력해주세요.', 'error');
        return;
      }
      $('sigunguCd').value = sigunguCd;
      $('bjdongCd').value  = bjdongCd;
      const sel = $('selectedRegion');
      if (sel) {
        sel.innerHTML = `
          <span class="check-icon">✅</span>
          <div><strong>수동입력 완료:</strong><br>
          시군구코드: ${sigunguCd} | 법정동코드: ${bjdongCd}</div>`;
        sel.style.display = 'flex';
      }
      this.showToast('✅ 수동 코드가 적용되었습니다!', 'success');
    });
  }

  /* ── 지번 검색 ── */
  async _searchByJibun() {
    const raw = (document.getElementById('unifiedAddrInput')?.value || '').trim();
    if (!raw) return this.showToast('주소를 입력해주세요.', 'error');

    const tokens  = raw.split(/\s+/);
    const lastTok = tokens[tokens.length - 1];
    let jibunPart = '';
    let dongQuery = raw;
    if (/^\d+(-\d+)?$/.test(lastTok)) {
      jibunPart = lastTok;
      dongQuery = tokens.slice(0, -1).join(' ').trim();
    }
    if (!dongQuery) return this.showToast('동/리 이름을 포함해 입력해주세요.', 'error');

    await this._doRegionSearch(dongQuery, jibunPart);
  }

  async _doRegionSearch(dongQuery, jibunPart) {
    const btn        = document.getElementById('unifiedAddrSearchBtn');
    const resultsDiv = document.getElementById('unifiedAddrResults');
    btn.disabled = true; btn.textContent = '검색중...';
    if (resultsDiv) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; }

    try {
      const res  = await fetch(`/api/region-proxy?type=xml&pageNo=1&numOfRows=300&flag=Y&locatadd_nm=${encodeURIComponent(dongQuery)}`);
      const text = await res.text();
      const xml  = new DOMParser().parseFromString(text, 'text/xml');
      const rows = Array.from(xml.querySelectorAll('row'));

      if (rows.length === 0) {
        this._showEmpty(resultsDiv, '검색 결과가 없습니다.');
        return;
      }

      const items  = rows.map(r => this.rowToItem(r));
      const uniq   = new Map();
      for (const it of items) uniq.set(it.fullCode, it);
      const sorted = Array.from(uniq.values())
        .map(it => ({ ...it, score: this.scoreItem(dongQuery, it) }))
        .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, 'ko'));

      this._renderJibunResults(sorted, jibunPart);
    } catch (err) {
      this.showToast('검색 오류: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = '검색';
    }
  }

  _renderJibunResults(items, jibunPart) {
    const resultsDiv = document.getElementById('unifiedAddrResults');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'block';

    items.forEach(it => {
      const row  = document.createElement('div');
      row.className = 'result-item';

      const main = document.createElement('div');
      main.className = 'result-main';

      const badge = document.createElement('span');
      badge.className = 'badge ' + this.kindToBadgeClass(it.typeLabel);
      badge.textContent = it.typeLabel;

      const nameEl = document.createElement('div');
      nameEl.className = 'place-name';
      nameEl.textContent = jibunPart ? `${it.displayName} ${jibunPart}` : it.displayName;

      const sub = document.createElement('div');
      sub.className = 'result-sub';
      sub.innerHTML = `코드 <span class="code-pill">${it.fullCode}</span>`;

      main.appendChild(badge);
      main.appendChild(nameEl);

      const selectBtn = document.createElement('button');
      selectBtn.className = 'select-btn';
      selectBtn.textContent = '선택';
      selectBtn.addEventListener('click', () => this._applyJibunSelection(it, jibunPart));

      row.appendChild(main);
      row.appendChild(selectBtn);
      row.appendChild(sub);
      resultsDiv.appendChild(row);
    });
  }

  _applyJibunSelection(item, jibunPart) {
    this.applyResolvedLocation(item, {
      jibun: jibunPart,
      source: jibunPart ? `지번: ${item.displayName} ${jibunPart}` : undefined,
    });
    const resultsDiv = document.getElementById('unifiedAddrResults');
    if (resultsDiv) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; }
    this.showToast('✅ 지역이 선택되었습니다.', 'success');
  }

  /* ── 도로명 검색 ── */
  async _searchByRoad() {
    const keyword = (document.getElementById('roadAddrInput')?.value || '').trim();
    if (!keyword) return this.showToast('도로명주소를 입력해주세요.', 'error');

    const btn        = document.getElementById('roadSearchBtn');
    const resultsDiv = document.getElementById('roadSearchResults');
    btn.disabled = true; btn.textContent = '검색중...';
    if (resultsDiv) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; }

    try {
      const res = await fetch(`/api/juso-proxy?keyword=${encodeURIComponent(keyword)}`);
      if (!res.ok) throw new Error(`서버 오류 ${res.status}`);
      const data = await res.json();

      if (data?.error) throw new Error(data.error);
      const errorCode = data?.results?.common?.errorCode;
      if (errorCode && errorCode !== '0') {
        throw new Error(`주소 API 오류: ${data?.results?.common?.errorMessage || errorCode}`);
      }

      const list = data?.results?.juso || [];
      if (list.length === 0) {
        this._showEmpty(resultsDiv, '검색 결과가 없습니다. 건물번호까지 포함한 전체 도로명주소를 입력해보세요.');
        return;
      }
      this._renderRoadResults(list);
    } catch (err) {
      this.showToast('검색 오류: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = '검색';
    }
  }

  _renderRoadResults(list) {
    const resultsDiv = document.getElementById('roadSearchResults');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'block';

    list.forEach(juso => {
      const row  = document.createElement('div');
      row.className = 'result-item';

      const main = document.createElement('div');
      main.className = 'result-main';

      const nameEl = document.createElement('div');
      nameEl.className = 'place-name';
      nameEl.textContent = juso.roadAddr;

      const subEl = document.createElement('div');
      subEl.className = 'result-sub';
      subEl.textContent = juso.jibunAddr;

      main.appendChild(nameEl);
      main.appendChild(subEl);

      const selectBtn = document.createElement('button');
      selectBtn.className = 'select-btn';
      selectBtn.textContent = '선택';
      selectBtn.addEventListener('click', () => this._applyRoadSelection(juso));

      row.appendChild(main);
      row.appendChild(selectBtn);
      resultsDiv.appendChild(row);
    });
  }

  _applyRoadSelection(juso) {
    const admCd    = juso.admCd || '';
    const sigungu  = admCd.slice(0, 5);
    const bjdong   = admCd.slice(5, 10);
    const bunNum   = juso.lnbrMnnm || '';
    const jiNum    = juso.lnbrSlno || '0';
    const jibunStr = (jiNum && String(jiNum) !== '0') ? `${bunNum}-${jiNum}` : String(bunNum);

    this.applyResolvedLocation(
      { displayName: juso.jibunAddr || juso.roadAddr, sigungu, bjdong, fullCode: admCd, typeLabel: '도로명' },
      { jibun: jibunStr, source: `📮 도로명: ${juso.roadAddr}` }
    );

    const resultsDiv = document.getElementById('roadSearchResults');
    if (resultsDiv) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; }
    const roadInput = document.getElementById('roadAddrInput');
    if (roadInput) roadInput.value = '';

    this.showToast('✅ 주소가 자동입력되었습니다.', 'success');

    // Async coords fetch — fire-and-forget, failure is silent
    this._fetchAndStoreCoords(juso.roadAddr).catch(() => {});
  }

  async _fetchAndStoreCoords(roadAddr) {
    if (!roadAddr) return;
    try {
      const res  = await fetch(`/api/vworld-proxy?address=${encodeURIComponent(roadAddr)}`);
      if (!res.ok) return;
      const data = await res.json();
      const pt   = data?.response?.result?.point;
      if (!pt?.x || !pt?.y) return;
      const latEl = document.getElementById('addrLat');
      const lonEl = document.getElementById('addrLon');
      if (latEl) latEl.value = pt.y;
      if (lonEl) lonEl.value = pt.x;
    } catch (_) { /* coords are optional */ }
  }

  /* ── 공통 적용 ── */
  applyResolvedLocation(item, meta = {}) {
    if (!item) return;
    this.state.selection = { label: item.displayName, sigungu: item.sigungu, bjdong: item.bjdong, code: item.fullCode, type: item.typeLabel };

    const sigunguEl = document.getElementById('sigunguCd');
    const bjdongEl  = document.getElementById('bjdongCd');
    if (sigunguEl) sigunguEl.value = item.sigungu;
    if (bjdongEl)  bjdongEl.value  = item.bjdong;

    if (meta.jibun) this.applyJibunValue(meta.jibun);

    const sel = document.getElementById('selectedRegion');
    if (sel) {
      const extra      = meta.jibun  ? ` | 지번: ${meta.jibun}` : '';
      const sourceText = meta.source ? `<br><small>${meta.source}</small>` : '';
      sel.innerHTML = `
        <span class="check-icon">✅</span>
        <div>
          <strong>선택완료:</strong> [${item.typeLabel}] ${item.displayName}${extra}<br>
          <small>시군구 ${item.sigungu} | 법정동 ${item.bjdong} | 코드: ${item.fullCode}</small>
          ${sourceText}
        </div>`;
      sel.style.display = 'flex';
    }
  }

  applyJibunValue(rawValue) {
    const jibunInput = document.getElementById('jibun');
    if (jibunInput) jibunInput.value = rawValue;

    const normalized  = String(rawValue || '').trim();
    if (!normalized) return;

    const bunEl      = document.getElementById('bun');
    const jiEl       = document.getElementById('ji');
    const previewDiv = document.getElementById('jibunPreview');

    if (normalized.includes('-')) {
      const [bunRaw, jiRaw] = normalized.split('-');
      if (bunEl) bunEl.value = (bunRaw || '').padStart(4, '0');
      if (jiEl)  jiEl.value  = (jiRaw  || '').padStart(4, '0');
      if (previewDiv) previewDiv.innerHTML = `🔎 <strong>${normalized}번지</strong> 조회`;
    } else {
      if (bunEl) bunEl.value = normalized.padStart(4, '0');
      if (jiEl)  jiEl.value  = '';
      if (previewDiv) previewDiv.innerHTML = `🔎 <strong>${normalized}번지 전체</strong> 조회`;
    }
  }

  handleJibunInput(e) {
    const val        = e.target.value.trim();
    const previewDiv = document.getElementById('jibunPreview');
    const bunEl      = document.getElementById('bun');
    const jiEl       = document.getElementById('ji');

    if (!val) {
      if (previewDiv) previewDiv.textContent = '';
      if (bunEl) bunEl.value = '';
      if (jiEl)  jiEl.value  = '';
      return;
    }

    if (val.includes('-')) {
      const [bunRaw, jiRaw] = val.split('-');
      if (bunEl) bunEl.value = (bunRaw || '').padStart(4, '0');
      if (jiEl)  jiEl.value  = (jiRaw  || '').padStart(4, '0');
      if (previewDiv) {
        previewDiv.innerHTML = (jiRaw || '').padStart(4, '0') === '0000'
          ? `🎯 <strong>${bunRaw}번지만</strong> 조회`
          : `🎯 <strong>${bunRaw}-${jiRaw}번지</strong> 조회`;
      }
    } else {
      if (bunEl) bunEl.value = val.padStart(4, '0');
      if (jiEl)  jiEl.value  = '';
      if (previewDiv) previewDiv.innerHTML = `🏘️ <strong>${val}번지 전체</strong> 조회`;
    }
  }

  toggleHelp(e) {
    e.preventDefault();
    document.getElementById('jibunHelpTooltip')?.classList.toggle('show');
    document.getElementById('jibunHelpToggle')?.classList.toggle('active');
  }

  handleOutsideClick(e) {
    const inputGroup = document.querySelector('.input-with-help');
    if (!inputGroup?.contains(e.target)) {
      document.getElementById('jibunHelpTooltip')?.classList.remove('show');
      document.getElementById('jibunHelpToggle')?.classList.remove('active');
    }
  }

  _showEmpty(div, msg) {
    if (!div) return;
    div.innerHTML = `<div class="empty-state">${msg}</div>`;
    div.style.display = 'block';
  }

  rowToItem(r) {
    const name    = r.querySelector('locatadd_nm')?.textContent?.trim() || '';
    const sido    = r.querySelector('sido_cd')?.textContent || '';
    const sgg     = r.querySelector('sgg_cd')?.textContent  || '';
    const umd     = r.querySelector('umd_cd')?.textContent  || '';
    const ri      = r.querySelector('ri_cd')?.textContent   || '00';
    const sigungu  = `${sido}${sgg}`;
    const bjdong   = `${umd}${ri}`;
    const fullCode = `${sido}${sgg}${umd}${ri}`;
    const tail     = name.slice(-1);
    const typeByName = ri !== '00' ? '리' : (tail === '동' ? '동' : tail === '읍' ? '읍' : tail === '면' ? '면' : '동');
    return { displayName: name, typeLabel: typeByName, sigungu, bjdong, fullCode };
  }

  scoreItem(term, it) {
    const t = term.trim(), name = it.displayName;
    if (!t || !name) return 0;
    if (name === t) return 300;
    if (name.startsWith(t)) return 200;
    if (name.includes(t)) return 100;
    return 0;
  }

  kindToBadgeClass(typeLabel) {
    if (typeLabel === '동') return 'badge-dong';
    if (typeLabel === '읍') return 'badge-eup';
    if (typeLabel === '면') return 'badge-myeon';
    return 'badge-ri';
  }

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
