/**
 * UIManager.js
 * 공통 UI 동작을 관리합니다.
 */

class UIManager {
    static showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    static updateProgressBar(percent) {
        const bar = document.getElementById('progressBar');
        if (!bar) return;
        bar.style.width = `${percent}%`;
        bar.textContent = `${percent}%`;
    }

    static initAdvancedToggle() {
        const toggle = document.getElementById('advancedToggle');
        const content = document.getElementById('advancedContent');
        if (!toggle || !content) return;

        toggle.addEventListener('click', function() {
            content.classList.toggle('show');
            toggle.classList.toggle('active');
        });
    }

    static initTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');

        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const serviceId = button.getAttribute('data-service');
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                if (window.app?.changeService) {
                    window.app.changeService(serviceId);
                }
            });
        });
    }

    static renderServiceFields(service) {
        const serviceFieldsContainer = document.getElementById('service-specific-fields');
        const advancedFieldsContainer = document.getElementById('advanced-service-fields');
        if (!serviceFieldsContainer || !advancedFieldsContainer) return;

        serviceFieldsContainer.innerHTML = '';
        advancedFieldsContainer.innerHTML = '';

        if (typeof service.renderUI === 'function') {
            service.renderUI(serviceFieldsContainer, advancedFieldsContainer);
        } else if (service.searchFields?.length) {
            service.searchFields.forEach((field) => {
                serviceFieldsContainer.insertAdjacentHTML('beforeend', this.createFieldHTML(field));
            });
        }

        if (service.advancedFields?.length) {
            let gridContainer = null;

            service.advancedFields.forEach((field) => {
                if (field.gridClass === 'grid-2-item') {
                    if (!gridContainer) {
                        gridContainer = document.createElement('div');
                        gridContainer.className = 'grid-2';
                        advancedFieldsContainer.appendChild(gridContainer);
                    }
                    gridContainer.appendChild(this.createFieldElement(field));
                    return;
                }

                gridContainer = null;
                advancedFieldsContainer.appendChild(this.createFieldElement(field));
            });
        }
    }

    static createFieldHTML(field) {
        return `
            <div class="form-group">
                <label for="${field.id}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>
                ${this.createInputHTML(field)}
            </div>
        `;
    }

    static createFieldElement(field) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="${field.id}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>
            ${this.createInputHTML(field)}
        `;
        return div;
    }

    static createInputHTML(field) {
        switch (field.type) {
            case 'select':
                return `<select id="${field.id}">${(field.options || []).map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('')}</select>`;
            case 'number':
                return `<input type="number" id="${field.id}" ${field.placeholder ? `placeholder="${field.placeholder}"` : ''} ${field.min ? `min="${field.min}"` : ''} ${field.max ? `max="${field.max}"` : ''} />`;
            case 'textarea':
                return `<textarea id="${field.id}" rows="${field.rows || 4}" ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}></textarea>`;
            default:
                return `<input type="text" id="${field.id}" ${field.placeholder ? `placeholder="${field.placeholder}"` : ''} />`;
        }
    }

    static updateServiceTitle(title) {
        const titleElement = document.getElementById('service-title');
        if (titleElement) titleElement.textContent = title;
    }

    static updateServiceUI(service) {
        const advancedSection = document.querySelector('.advanced-section');
        const searchButton = document.getElementById('searchButton');
        const downloadAllButton = document.getElementById('downloadAllExcelButton');

        if (advancedSection) {
            advancedSection.style.display = service.hideAdvanced ? 'none' : 'block';
        }

        if (searchButton) {
            searchButton.textContent = service.searchButtonText || '🔍 조회하기';
        }

        if (downloadAllButton && service.hideDownloadAll) {
            downloadAllButton.style.display = 'none';
        }
    }

    static resetUI() {
        const resultTable = document.getElementById('resultTable');
        const paginationInfo = document.getElementById('paginationInfo');
        const pagination = document.getElementById('pagination');
        const aiAnswerCard = document.getElementById('aiAnswerCard');

        if (resultTable) resultTable.innerHTML = '';
        if (paginationInfo) paginationInfo.innerHTML = '';
        if (pagination) pagination.style.display = 'none';
        if (aiAnswerCard) {
            aiAnswerCard.innerHTML = '';
            aiAnswerCard.style.display = 'none';
        }

        const currentBtn = document.getElementById('downloadExcelButton');
        const allBtn = document.getElementById('downloadAllExcelButton');
        if (currentBtn) currentBtn.style.display = 'none';
        if (allBtn) allBtn.style.display = 'none';

        this.updateProgressBar(0);

        const pageNo = document.getElementById('pageNo');
        const numOfRows = document.getElementById('numOfRows');
        if (pageNo) pageNo.value = '1';
        if (numOfRows) numOfRows.value = '10';
    }

    static toggleLoading(button, isLoading, loadingText = '조회 중...') {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || '🔍 조회하기';
            button.classList.remove('loading');
        }
    }

    static showValidationErrors(errors) {
        if (errors.length > 0) {
            this.showToast(`입력 오류:\n${errors.join('\n')}`, 'error');
            return false;
        }
        return true;
    }
}

window.UIManager = UIManager;
