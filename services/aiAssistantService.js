const AIAssistantService = {
    id: 'ai-assistant',
    title: '🤖 AI 묻기',
    description: '자유질문으로 건축물대장 데이터를 해석합니다.',
    hideAdvanced: true,
    searchButtonText: '🤖 AI에게 묻기',
    tableHeaders: {
        source: '출처',
        matchedPurpose: '판단 용도',
        platPlc: '대지위치',
        bldNm: '건물명',
        dongNm: '동명칭',
        hoNm: '호명칭',
        flrNoNm: '층',
        mainPurpsCdNm: '주용도',
        etcPurps: '기타용도',
        area: '면적(㎡)',
        areaPyeong: '면적(평)',
        reason: '판단사유'
    },

    renderUI(container) {
        container.innerHTML = `
            <div class="ai-ask-panel">
                <div class="ai-panel-header">
                    <div class="ai-panel-title">AI에게 자유롭게 물어보세요</div>
                    <div class="ai-panel-subtitle">질문에 주소와 지번을 같이 적으면 AI가 먼저 해석하고, 층별개요와 전유공유면적을 함께 검토합니다.</div>
                </div>

                <div class="form-group">
                    <label for="aiQuestion">질문</label>
                    <textarea id="aiQuestion" rows="4" placeholder="예: 서울 강남구 역삼동 123-45 영화관 몇 평이야?&#10;예: 삼성동 159 문화 및 집회시설 관련 층만 보여줘&#10;예: 이 건물 용도별 면적이 궁금해"></textarea>
                </div>

                <div class="ai-example-chips">
                    <button type="button" class="chip ai-question-chip" data-question="이 건물 용도별 면적이 궁금해">용도별 면적 요약</button>
                    <button type="button" class="chip ai-question-chip" data-question="여기 영화관 몇 평이야?">영화관 몇 평</button>
                    <button type="button" class="chip ai-question-chip" data-question="문화 및 집회시설 관련 층만 검토표로 보여줘">문집시설 검토표</button>
                </div>

                <div id="aiAnswerCard" class="ai-answer-card" style="display:none;"></div>
            </div>
        `;

        container.querySelectorAll('.ai-question-chip').forEach((button) => {
            button.addEventListener('click', () => {
                const questionInput = document.getElementById('aiQuestion');
                if (questionInput) {
                    questionInput.value = button.dataset.question || '';
                    questionInput.focus();
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (window.serviceManager) {
        window.serviceManager.registerService(AIAssistantService.id, AIAssistantService);
    }
});

window.AIAssistantService = AIAssistantService;
