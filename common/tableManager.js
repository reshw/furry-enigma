/**
 * TableManager.js
 * 테이블 및 페이지네이션 관련 기능을 관리하는 모듈
 */

class TableManager {
    static createTable(items) {
        const service = window.serviceManager?.getCurrentService();
        if (!service) {
            console.error('No service selected for table creation');
            return;
        }
        
        const headers = service.tableHeaders;
        const div = document.getElementById('resultTable');
        div.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'table-container';
        
        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headRow = thead.insertRow();
        
        // 헤더 생성
        Object.values(headers).forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headRow.appendChild(th);
        });
        
        // 데이터 행 생성
        items.forEach(item => {
            const row = tbody.insertRow();
            Object.keys(headers).forEach(k => {
                const cell = row.insertCell();
                cell.textContent = item[k] || '-';
                
                // 면적 데이터의 경우 우측 정렬
                if (k === 'area' && item[k]) {
                    cell.style.textAlign = 'right';
                }
            });
        });
        
        container.appendChild(table);
        div.appendChild(container);
    }
    
    static displayPaginationInfo() {
        const AppState = window.AppState;
        if (!AppState) return;
        
        const infoDiv = document.getElementById('paginationInfo');
        const startItem = (AppState.currentPage - 1) * AppState.pageSize + 1;
        const endItem = Math.min(AppState.currentPage * AppState.pageSize, AppState.totalCount);
        const totalPages = Math.ceil(AppState.totalCount / AppState.pageSize);
        
        const service = window.serviceManager?.getCurrentService();
        const serviceTitle = service?.title || '조회';
        
        infoDiv.innerHTML = `
            <div class="info-card">
                <h4>📊 ${serviceTitle} 결과</h4>
                <p><strong>전체 건수:</strong> ${AppState.totalCount.toLocaleString()}건</p>
                <p><strong>현재 페이지:</strong> ${AppState.currentPage} / ${totalPages} (${startItem.toLocaleString()}-${endItem.toLocaleString()}건 표시)</p>
                <p><strong>페이지당 표시:</strong> ${AppState.pageSize}건</p>
            </div>
        `;
    }
    
    static createPagination() {
        const AppState = window.AppState;
        if (!AppState) return;
        
        const paginationDiv = document.getElementById('pagination');
        if (AppState.totalCount <= AppState.pageSize) {
            paginationDiv.style.display = 'none';
            return;
        }
        
        const totalPages = Math.ceil(AppState.totalCount / AppState.pageSize);
        paginationDiv.innerHTML = '';
        paginationDiv.style.display = 'flex';
        
        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '‹';
        prevBtn.disabled = AppState.currentPage <= 1;
        prevBtn.addEventListener('click', () => {
            if (AppState.currentPage > 1) {
                AppState.isFirstSearch = false;
                if (window.SearchManager) {
                    window.SearchManager.performSearch(AppState.currentPage - 1);
                }
            }
        });
        paginationDiv.appendChild(prevBtn);
        
        // 모바일 환경에서는 더 적은 페이지 표시
        const isMobile = window.innerWidth <= 480;
        const maxVisiblePages = isMobile ? 3 : 5;
        const sidePages = Math.floor(maxVisiblePages / 2);
        
        // 페이지 번호들 계산
        let startPage = Math.max(1, AppState.currentPage - sidePages);
        let endPage = Math.min(totalPages, AppState.currentPage + sidePages);
        
        // 시작/끝 조정으로 항상 maxVisiblePages 개수 유지
        if (endPage - startPage + 1 < maxVisiblePages) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
        }
        
        // 첫 페이지 (시작 페이지가 1이 아닌 경우)
        if (startPage > 1) {
            const firstBtn = this.createPageButton(1);
            firstBtn.addEventListener('click', () => {
                AppState.isFirstSearch = false;
                if (window.SearchManager) {
                    window.SearchManager.performSearch(1);
                }
            });
            paginationDiv.appendChild(firstBtn);
            
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.className = 'pagination-info';
                dots.textContent = '⋯';
                paginationDiv.appendChild(dots);
            }
        }
        
        // 중간 페이지들
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn';
            pageBtn.textContent = i;
            if (i === AppState.currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                if (i !== AppState.currentPage) {
                    AppState.isFirstSearch = false;
                    if (window.SearchManager) {
                        window.SearchManager.performSearch(i);
                    }
                }
            });
            paginationDiv.appendChild(pageBtn);
        }
        
        // 마지막 페이지 (끝 페이지가 마지막이 아닌 경우)
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.className = 'pagination-info';
                dots.textContent = '⋯';
                paginationDiv.appendChild(dots);
            }
            
            const lastBtn = this.createPageButton(totalPages);
            lastBtn.addEventListener('click', () => {
                AppState.isFirstSearch = false;
                if (window.SearchManager) {
                    window.SearchManager.performSearch(totalPages);
                }
            });
            paginationDiv.appendChild(lastBtn);
        }
        
        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '›';
        nextBtn.disabled = AppState.currentPage >= totalPages;
        nextBtn.addEventListener('click', () => {
            if (AppState.currentPage < totalPages) {
                AppState.isFirstSearch = false;
                if (window.SearchManager) {
                    window.SearchManager.performSearch(AppState.currentPage + 1);
                }
            }
        });
        paginationDiv.appendChild(nextBtn);
    }
    
    static createPageButton(pageNum) {
        const btn = document.createElement('button');
        btn.className = 'pagination-btn';
        btn.textContent = pageNum;
        return btn;
    }
    
    static clearTable() {
        document.getElementById('resultTable').innerHTML = '';
        document.getElementById('paginationInfo').innerHTML = '';
        document.getElementById('pagination').style.display = 'none';
    }
}

// 전역에서 사용할 수 있도록 등록
window.TableManager = TableManager;