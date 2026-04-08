/**
 * ServiceManager.js
 * 다양한 건축물 정보 조회 서비스를 관리하는 모듈
 */

class ServiceManager {
    constructor() {
        this.services = new Map();
        this.currentService = null;
    }
    
    // 서비스 등록
    registerService(serviceId, config) {
        this.services.set(serviceId, config);
        console.log(`✅ 서비스 등록됨: ${serviceId}`);
    }
    
    // 현재 서비스 설정
    setCurrentService(serviceId) {
        if (!this.services.has(serviceId)) {
            throw new Error(`Service ${serviceId} not found`);
        }
        this.currentService = serviceId;
        if (window.AppState) {
            window.AppState.currentService = serviceId;
        }
        return this.getCurrentService();
    }
    
    // 현재 서비스 가져오기
    getCurrentService() {
        return this.services.get(this.currentService);
    }
    
    // 모든 서비스 목록 가져오기
    getAllServices() {
        return Array.from(this.services.entries()).map(([id, config]) => ({
            id,
            title: config.title,
            description: config.description || ''
        }));
    }
    
    // 서비스 존재 여부 확인
    hasService(serviceId) {
        return this.services.has(serviceId);
    }
    
    // 서비스 제거
    removeService(serviceId) {
        if (this.currentService === serviceId) {
            this.currentService = null;
        }
        return this.services.delete(serviceId);
    }
}

// 전역에서 사용할 수 있도록 등록
window.ServiceManager = ServiceManager;