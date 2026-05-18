/**
 * app.js
 * 메인 애플리케이션 진입점
 */

window.AppState = {
    currentData: [],
    currentPage: 1,
    totalCount: 0,
    pageSize: 10,
    isFirstSearch: true,
    currentService: null,
    aiAnalysis: null
};

class SearchManager {
    static async performSearch(page = 1) {
        const btn = document.getElementById('searchButton');
        const service = window.serviceManager?.getCurrentService();
        const loadingText = service?.searchButtonText?.includes('AI') ? 'AI 분석 중...' : '조회 중...';

        window.UIManager.toggleLoading(btn, true, loadingText);

        try {
            if (service?.id === 'ai-assistant') {
                const result = await window.AIAssistantManager.answerQuestion();
                if (result.totalCount === 0) {
                    window.UIManager.showToast('질문에 맞는 근거 행을 찾지 못했습니다.', 'error');
                } else {
                    window.UIManager.showToast(`AI가 ${result.totalCount.toLocaleString()}건의 근거 행을 정리했습니다.`, 'success');
                }
                return;
            }

            const result = await window.APIManager.fetchData(page);

            if (result.totalCount === 0) {
                window.UIManager.showToast('해당 조건에 맞는 정보가 없습니다.', 'error');
                window.TableManager.clearTable();
                window.DownloadManager.toggleDownloadButtons(false);
                return;
            }

            window.TableManager.displayPaginationInfo();
            window.TableManager.createPagination();
            window.TableManager.createTable(result.items);
            window.DownloadManager.toggleDownloadButtons(true);

            if (window.AppState.isFirstSearch) {
                window.UIManager.showToast(`총 ${result.totalCount.toLocaleString()}건을 찾았습니다. 첫 ${result.items.length}건을 표시합니다.`, 'success');
            } else {
                const startItem = (window.AppState.currentPage - 1) * window.AppState.pageSize + 1;
                const endItem = Math.min(window.AppState.currentPage * window.AppState.pageSize, result.totalCount);
                window.UIManager.showToast(`${window.AppState.currentPage}페이지 (${startItem.toLocaleString()}-${endItem.toLocaleString()}건 표시중)`, 'success');
            }
        } catch (err) {
            window.UIManager.showToast(err.message, 'error');
        } finally {
            window.UIManager.toggleLoading(btn, false);
        }
    }
}

class App {
    constructor() {
        this.serviceManager = new window.ServiceManager();
        this.locationModule = null;
        this.init();
    }

    init() {
        window.serviceManager = this.serviceManager;
        window.SearchManager = SearchManager;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMLoaded());
        } else {
            this.onDOMLoaded();
        }
    }

    onDOMLoaded() {
        this.initModules();
        this.setupDefaultService();
        this.setupEventListeners();

        console.log('건축물 정보조회 시스템이 초기화되었습니다.');
    }

    initModules() {
        this.locationModule = new window.LocationModule();
        window.locationModule = this.locationModule;

        window.UIManager.initAdvancedToggle();
        window.UIManager.initTabNavigation();
        window.DownloadManager.initDownloadEvents();
    }

    setupDefaultService() {
        setTimeout(() => {
            if (this.serviceManager.hasService('floor-outline')) {
                this.changeService('floor-outline');
            }
        }, 100);
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('searchButton');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                window.AppState.isFirstSearch = true;
                SearchManager.performSearch(1);
            });
        }

        document.addEventListener('keypress', (e) => {
            if (e.key !== 'Enter') return;
            if (e.target.id === 'unifiedAddrInput' || e.target.id === 'jibun' || e.target.id === 'roadAddrInput') return;
            if (e.target.tagName === 'TEXTAREA' && !e.ctrlKey && !e.metaKey) return;

            if (e.target.matches('input[type="text"], input[type="number"], select')) {
                e.preventDefault();
                const button = document.getElementById('searchButton');
                if (button && !button.disabled) button.click();
            }
        });
    }

    changeService(serviceId) {
        try {
            const service = this.serviceManager.setCurrentService(serviceId);

            window.UIManager.updateServiceTitle(service.title);
            window.UIManager.renderServiceFields(service);
            window.UIManager.updateServiceUI(service);

            window.AppState.currentData = [];
            window.AppState.currentPage = 1;
            window.AppState.totalCount = 0;
            window.AppState.isFirstSearch = true;
            window.AppState.aiAnalysis = null;

            window.UIManager.resetUI();
            window.DownloadManager.toggleDownloadButtons(false);

            console.log(`현재 서비스가 '${service.title}'로 변경되었습니다.`);
        } catch (err) {
            window.UIManager.showToast('서비스 변경 오류: ' + err.message, 'error');
        }
    }
}

window.app = new App();
