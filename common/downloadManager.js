/**
 * DownloadManager.js
 * Excel 다운로드를 관리합니다.
 */

class DownloadManager {
    static convertToExcelCell(value) {
        if (value === null || value === undefined || value === '') {
            return { t: 's', v: '' };
        }

        if (typeof value === 'boolean') {
            return { t: 'b', v: value };
        }

        if (value instanceof Date) {
            return { t: 'd', v: value };
        }

        const stringValue = String(value).trim();
        const numberValue = Number(value);

        if (!Number.isNaN(numberValue) && stringValue !== '') {
            if (stringValue.includes('-') || /^0\d{4,}$/.test(stringValue)) {
                return { t: 's', v: stringValue };
            }
            if (/^-?\d+(\.\d+)?$/.test(stringValue)) {
                return { t: 'n', v: numberValue };
            }
        }

        return { t: 's', v: stringValue };
    }

    static jsonToTypedWorksheet(jsonData, headers) {
        if (!jsonData || jsonData.length === 0) {
            return XLSX.utils.aoa_to_sheet([]);
        }

        const headerKeys = Object.keys(headers);
        const headerValues = Object.values(headers);
        const rows = [];

        rows.push(headerValues.map(value => ({ t: 's', v: value })));
        jsonData.forEach((item) => {
            rows.push(headerKeys.map(key => this.convertToExcelCell(item[key] ?? '')));
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = headerKeys.map((key, index) => {
            const headerLength = String(headerValues[index]).length;
            const maxDataLength = Math.max(...jsonData.map(item => String(item[key] ?? '').length), 0);
            return { wch: Math.min(Math.max(headerLength, maxDataLength) + 2, 50) };
        });

        return worksheet;
    }

    static downloadCurrentData() {
        const service = window.serviceManager?.getCurrentService();
        const data = window.AppState?.currentData || [];

        if (!data.length) {
            window.UIManager?.showToast('다운로드할 데이터가 없습니다.', 'error');
            return;
        }

        if (!service?.tableHeaders) {
            window.UIManager?.showToast('다운로드 형식을 찾지 못했습니다.', 'error');
            return;
        }

        const worksheet = this.jsonToTypedWorksheet(data, service.tableHeaders);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '조회결과');

        const fileName = this.generateFileName(service, 'current', data[0]);
        XLSX.writeFile(workbook, fileName);
        window.UIManager?.showToast('Excel 파일을 다운로드했습니다.', 'success');
    }

    static async downloadAllData() {
        const service = window.serviceManager?.getCurrentService();
        if (!service || service.id === 'ai-assistant') {
            return;
        }

        if (window.locationModule && !window.locationModule.validateLocationSelection()) {
            return;
        }

        const button = document.getElementById('downloadAllExcelButton');
        window.UIManager?.toggleLoading(button, true, '전체 다운로드 중...');

        try {
            const items = await window.APIManager.fetchAllData();
            if (!items.length) {
                window.UIManager?.showToast('다운로드할 데이터가 없습니다.', 'error');
                return;
            }

            const worksheet = this.jsonToTypedWorksheet(items, service.tableHeaders);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '전체데이터');

            const fileName = this.generateFileName(service, 'all', items[0]);
            XLSX.writeFile(workbook, fileName);
            window.UIManager?.showToast(`${items.length.toLocaleString()}건의 전체 데이터를 다운로드했습니다.`, 'success');
        } catch (err) {
            window.UIManager?.showToast('다운로드 오류: ' + err.message, 'error');
        } finally {
            window.UIManager?.toggleLoading(button, false);
            window.UIManager?.updateProgressBar(0);
        }
    }

    static generateFileName(service, type = 'current', firstData = null) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[:.-]/g, '_');

        if (service.id === 'ai-assistant') {
            const question = document.getElementById('aiQuestion')?.value?.trim() || 'ai_분석';
            const safeQuestion = question.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
            return `AI묻기_${safeQuestion}_${dateStr}.xlsx`;
        }

        if (typeof service.getExcelFileName === 'function') {
            return service.getExcelFileName(type);
        }

        const names = {
            'floor-outline': '층별개요',
            'exclusive-area': '전유공유면적'
        };
        const prefix = type === 'all' ? '전체_' : '';
        const serviceName = names[service.id] || '조회결과';
        const location = this.extractLocationInfo(firstData);

        return `${prefix}${serviceName}${location}_${dateStr}.xlsx`;
    }

    static extractLocationInfo(firstData) {
        if (!firstData?.platPlc) return '';
        const text = String(firstData.platPlc).replace(/[\\/:*?"<>|]/g, '_');
        return `_${text.slice(0, 25)}`;
    }

    static toggleDownloadButtons(show = false, showAll = true) {
        const currentBtn = document.getElementById('downloadExcelButton');
        const allBtn = document.getElementById('downloadAllExcelButton');

        if (currentBtn) currentBtn.style.display = show ? 'block' : 'none';
        if (allBtn) allBtn.style.display = show && showAll ? 'block' : 'none';
    }

    static initDownloadEvents() {
        const currentBtn = document.getElementById('downloadExcelButton');
        const allBtn = document.getElementById('downloadAllExcelButton');

        if (currentBtn) {
            currentBtn.addEventListener('click', () => this.downloadCurrentData());
        }

        if (allBtn) {
            allBtn.addEventListener('click', () => this.downloadAllData());
        }
    }
}

window.DownloadManager = DownloadManager;
