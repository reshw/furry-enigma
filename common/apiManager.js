/**
 * APIManager.js
 * Netlify 프록시를 통해 건축물대장 API를 호출합니다.
 */

class APIManager {
  static get CONFIG() {
    return {
      BASE_API_URL: 'https://apis.data.go.kr/1613000/BldRgstHubService',
      NETLIFY_FUNCTION_PATH: '/api/bld',
      LOCAL_PROXY_BASE: ''
    };
  }

  static buildProxyBaseWithEndpoint(endpoint) {
    const fn = this.CONFIG.NETLIFY_FUNCTION_PATH || '';
    const local = this.CONFIG.LOCAL_PROXY_BASE || '';
    const base = fn || local;
    if (!base) return '';
    return `${base}?endpoint=${encodeURIComponent(endpoint)}`;
  }

  static async safeFetchJson(url) {
    console.log('API URL:', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  static async fetchData(page = 1) {
    const service = window.serviceManager?.getCurrentService();
    if (!service) throw new Error('No service selected');

    if (window.locationModule && !window.locationModule.validateLocationSelection()) {
      throw new Error('행정구역을 먼저 검색하고 선택해 주세요.');
    }

    if (window.AppState) {
      window.AppState.currentPage = page;
      window.AppState.pageSize = parseInt(document.getElementById('numOfRows')?.value, 10) || 10;
    }

    const pageNoEl = document.getElementById('pageNo');
    if (pageNoEl) pageNoEl.value = page;

    return this.fetchPageForService(service, page, true);
  }

  static async fetchAllData() {
    const service = window.serviceManager?.getCurrentService();
    if (!service) throw new Error('No service selected');
    return this.fetchAllDataForService(service);
  }

  static async fetchPageForService(service, page = 1, updateState = false) {
    const params = this.buildParams(service, page);

    if (service.validateParams) {
      const paramObj = {};
      for (const [key, value] of params.entries()) {
        paramObj[key] = value;
      }
      const errors = service.validateParams(paramObj);
      if (errors.length > 0) throw new Error(errors.join('\n'));
    }

    const proxyBase = this.buildProxyBaseWithEndpoint(service.endpoint);
    const url = proxyBase
      ? `${proxyBase}&${params.toString()}`
      : `${this.CONFIG.BASE_API_URL}/${service.endpoint}?${params.toString()}`;

    try {
      const json = await this.safeFetchJson(url);
      const body = json?.response?.body;

      if (!body?.items) {
        if (updateState && window.AppState) {
          window.AppState.totalCount = 0;
          window.AppState.currentData = [];
        }
        return { items: [], totalCount: 0 };
      }

      let items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];
      if (service.processData) items = service.processData(items);

      if (updateState && window.AppState) {
        window.AppState.currentData = items;
        window.AppState.totalCount = body.totalCount;
      }

      return { items, totalCount: body.totalCount };
    } catch (err) {
      throw new Error('API 호출 오류: ' + err.message);
    }
  }

  static async fetchAllDataForService(service) {
    if (!service?.endpoint) {
      throw new Error('조회 endpoint가 없는 서비스입니다.');
    }

    const proxyBase = this.buildProxyBaseWithEndpoint(service.endpoint);
    const baseUrl = proxyBase || `${this.CONFIG.BASE_API_URL}/${service.endpoint}`;
    const params = this.buildParams(service, 1, true);

    try {
      params.set('numOfRows', '100');
      params.set('pageNo', '1');

      const firstUrl = proxyBase ? `${baseUrl}&${params.toString()}` : `${baseUrl}?${params.toString()}`;
      const firstJson = await this.safeFetchJson(firstUrl);
      const firstBody = firstJson?.response?.body;
      if (!firstBody?.items) {
        throw new Error('조회된 데이터가 없습니다.');
      }

      const totalCount = Number(firstBody.totalCount || 0);
      const pageSize = 100;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      let allItems = [];
      let firstItems = Array.isArray(firstBody.items.item) ? firstBody.items.item : [firstBody.items.item];
      if (service.processData) firstItems = service.processData(firstItems);
      allItems = allItems.concat(firstItems);

      for (let page = 2; page <= totalPages; page += 1) {
        params.set('pageNo', String(page));
        const pageUrl = proxyBase ? `${baseUrl}&${params.toString()}` : `${baseUrl}?${params.toString()}`;

        try {
          const json = await this.safeFetchJson(pageUrl);
          const body = json?.response?.body;
          if (body?.items) {
            let items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];
            if (service.processData) items = service.processData(items);
            allItems = allItems.concat(items);
          }

          const progress = Math.round((page / totalPages) * 100);
          if (window.UIManager) window.UIManager.updateProgressBar(progress);
          await new Promise(resolve => setTimeout(resolve, 80));
        } catch (error) {
          console.error(`페이지 ${page} 조회 실패`, error);
        }
      }

      return allItems;
    } catch (err) {
      throw new Error('전체 데이터 조회 오류: ' + err.message);
    }
  }

  static buildParams(service, page = 1, excludePaging = false) {
    const params = new URLSearchParams({
      _type: 'json',
    });

    (service.requiredParams || []).forEach((paramId) => {
      let value = document.getElementById(paramId)?.value?.trim();
      if (!value) return;
      if (paramId === 'ji' && value === '0000') return;
      params.append(paramId, value);
    });

    const optionalParams = excludePaging
      ? (service.optionalParams || []).filter(paramId => !['numOfRows', 'pageNo'].includes(paramId))
      : (service.optionalParams || []);

    optionalParams.forEach((paramId) => {
      let value = document.getElementById(paramId)?.value?.trim();
      if (paramId === 'platGbCd' && (!value || value === '')) value = '0';
      if (paramId === 'ji' && value === '0000') return;
      if (value) params.append(paramId, value);
    });

    if (!excludePaging) {
      const pageSize = parseInt(document.getElementById('numOfRows')?.value, 10) || 10;
      params.set('numOfRows', String(pageSize));
      params.set('pageNo', String(page));
    }

    return params;
  }

  static validateRequiredParams(service) {
    const missingParams = [];
    (service.requiredParams || []).forEach((paramId) => {
      const value = document.getElementById(paramId)?.value?.trim();
      if (!value) missingParams.push(paramId);
    });
    return missingParams;
  }
}

window.APIManager = APIManager;
