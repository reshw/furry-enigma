class AIAssistantManager {
    static PURPOSE_HINTS = [
        { label: '문화 및 집회시설', aliases: ['영화관', '문집시설', '문화시설', '집회시설', '공연장'] },
        { label: '판매시설', aliases: ['상가', '매장', '리테일'] },
        { label: '근린생활시설', aliases: ['근생', '상가', '학원', '의원'] },
        { label: '업무시설', aliases: ['사무실', '오피스', '업무'] },
        { label: '의료시설', aliases: ['병원', '의원', '의료'] }
    ];

    static async answerQuestion() {
        const question = document.getElementById('aiQuestion')?.value?.trim();
        if (!question) {
            throw new Error('질문을 입력해 주세요.');
        }

        if (window.locationModule && !window.locationModule.validateLocationSelection()) {
            throw new Error('행정구역을 먼저 선택해 주세요.');
        }

        const floorService = window.serviceManager?.services?.get('floor-outline');
        const exclusiveService = window.serviceManager?.services?.get('exclusive-area');
        if (!floorService || !exclusiveService) {
            throw new Error('AI 분석에 필요한 서비스 설정을 찾지 못했습니다.');
        }

        window.UIManager.updateProgressBar(10);

        const [floorItems, exclusiveItems] = await Promise.all([
            window.APIManager.fetchAllDataForService(floorService),
            window.APIManager.fetchAllDataForService(exclusiveService)
        ]);

        window.UIManager.updateProgressBar(55);

        const normalizedItems = this.normalizeItems(floorItems, exclusiveItems);
        const purposeSummary = this.buildPurposeSummary(normalizedItems);
        const aiResult = await this.requestGemini(question, purposeSummary);

        window.UIManager.updateProgressBar(80);

        const analysis = this.buildAnalysis(question, normalizedItems, purposeSummary, aiResult);
        this.renderAnswer(analysis);

        if (window.AppState) {
            window.AppState.currentData = analysis.evidenceRows;
            window.AppState.totalCount = analysis.evidenceRows.length;
            window.AppState.currentPage = 1;
            window.AppState.pageSize = Math.max(analysis.evidenceRows.length, 10);
            window.AppState.aiAnalysis = analysis;
        }

        if (analysis.evidenceRows.length > 0) {
            window.TableManager.createTable(analysis.evidenceRows);
            window.DownloadManager.toggleDownloadButtons(true, false);
        } else {
            window.TableManager.clearTable();
            window.DownloadManager.toggleDownloadButtons(false, false);
        }

        window.UIManager.updateProgressBar(100);
        return {
            items: analysis.evidenceRows,
            totalCount: analysis.evidenceRows.length
        };
    }

    static normalizeItems(floorItems, exclusiveItems) {
        const mapItem = (item, source) => {
            const areaNumeric = Number.parseFloat(item.area) || 0;
            return {
                source,
                platPlc: item.platPlc || '-',
                bldNm: item.bldNm || '-',
                dongNm: item.dongNm || '-',
                hoNm: item.hoNm || '-',
                flrNoNm: item.flrNoNm || '-',
                mainPurpsCdNm: item.mainPurpsCdNm || '-',
                etcPurps: item.etcPurps || '-',
                area: areaNumeric.toFixed(2),
                areaNumeric,
                areaPyeong: this.toPyeong(areaNumeric).toFixed(2),
                matchedPurpose: '',
                reason: ''
            };
        };

        return [
            ...floorItems.map(item => mapItem(item, '층별개요')),
            ...exclusiveItems.map(item => mapItem(item, '전유공유면적'))
        ];
    }

    static buildPurposeSummary(items) {
        const grouped = new Map();

        items.forEach((item) => {
            const purpose = item.mainPurpsCdNm || '기타';
            if (!grouped.has(purpose)) {
                grouped.set(purpose, {
                    purpose,
                    totalSqm: 0,
                    totalPyeong: 0,
                    rowCount: 0,
                    sampleEtcPurps: new Set(),
                    floors: new Set()
                });
            }

            const entry = grouped.get(purpose);
            entry.totalSqm += item.areaNumeric;
            entry.rowCount += 1;
            if (item.etcPurps && item.etcPurps !== '-') entry.sampleEtcPurps.add(item.etcPurps);
            if (item.flrNoNm && item.flrNoNm !== '-') entry.floors.add(item.flrNoNm);
        });

        return Array.from(grouped.values())
            .map((entry) => ({
                purpose: entry.purpose,
                totalSqm: Number(entry.totalSqm.toFixed(2)),
                totalPyeong: Number(this.toPyeong(entry.totalSqm).toFixed(2)),
                rowCount: entry.rowCount,
                sampleEtcPurps: Array.from(entry.sampleEtcPurps).slice(0, 4),
                sampleFloors: Array.from(entry.floors).slice(0, 6)
            }))
            .sort((a, b) => b.totalSqm - a.totalSqm);
    }

    static async requestGemini(question, purposeSummary) {
        const response = await fetch('/.netlify/functions/ai-ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question,
                purposeSummary
            })
        });

        const data = await response.json();
        if (!response.ok || data?.error) {
            throw new Error(data?.message || 'Gemini 응답을 가져오지 못했습니다.');
        }

        return data.result || {};
    }

    static buildAnalysis(question, items, purposeSummary, aiResult) {
        const mode = aiResult.mode === 'summary' ? 'summary' : 'targeted';
        const matchedPurposes = Array.isArray(aiResult.matchedPurposes) ? aiResult.matchedPurposes : [];

        const evidenceRows = mode === 'summary'
            ? purposeSummary.map((entry) => ({
                source: '통합요약',
                matchedPurpose: entry.purpose,
                platPlc: '-',
                bldNm: '-',
                dongNm: '-',
                hoNm: '-',
                flrNoNm: entry.sampleFloors.join(', ') || '-',
                mainPurpsCdNm: entry.purpose,
                etcPurps: entry.sampleEtcPurps.join(', ') || '-',
                area: entry.totalSqm.toFixed(2),
                areaPyeong: entry.totalPyeong.toFixed(2),
                areaNumeric: entry.totalSqm,
                reason: '같은 주용도끼리 합산'
            }))
            : this.filterEvidenceRows(items, matchedPurposes, question);

        const totalSqm = evidenceRows.reduce((sum, item) => sum + (Number(item.areaNumeric) || Number(item.area) || 0), 0);
        const totalPyeong = this.toPyeong(totalSqm);

        return {
            question,
            mode,
            matchedPurposes,
            evidenceRows,
            totalSqm,
            totalPyeong,
            answer: aiResult.answer || '질문에 맞는 결과를 정리했습니다.',
            caution: aiResult.caution || '건축물대장상 용도명과 실사용 명칭은 다를 수 있습니다.',
            reasoning: aiResult.reasoning || '용도 요약표를 기준으로 관련성이 높은 항목을 골랐습니다.'
        };
    }

    static filterEvidenceRows(items, matchedPurposes, question) {
        const loweredQuestion = question.toLowerCase();
        const aliases = this.PURPOSE_HINTS
            .filter(item => matchedPurposes.includes(item.label))
            .flatMap(item => item.aliases.map(alias => alias.toLowerCase()));

        return items
            .filter((item) => {
                const main = String(item.mainPurpsCdNm || '').toLowerCase();
                const etc = String(item.etcPurps || '').toLowerCase();

                if (matchedPurposes.some(purpose => main.includes(purpose.toLowerCase()) || etc.includes(purpose.toLowerCase()))) {
                    return true;
                }

                return aliases.some(alias => etc.includes(alias) || main.includes(alias) || loweredQuestion.includes(alias));
            })
            .map((item) => ({
                ...item,
                matchedPurpose: matchedPurposes.join(', ') || item.mainPurpsCdNm,
                reason: this.buildReason(item, matchedPurposes)
            }));
    }

    static buildReason(item, matchedPurposes) {
        const main = String(item.mainPurpsCdNm || '');
        const etc = String(item.etcPurps || '');

        for (const purpose of matchedPurposes) {
            if (main.includes(purpose)) {
                return `주용도에 ${purpose}가 직접 표시됩니다.`;
            }
            if (etc.includes(purpose)) {
                return `기타용도에 ${purpose}가 표시됩니다.`;
            }
        }

        return '질문과 가까운 용도 후보로 분류했습니다.';
    }

    static renderAnswer(analysis) {
        const card = document.getElementById('aiAnswerCard');
        const infoDiv = document.getElementById('paginationInfo');
        if (!card || !infoDiv) return;

        const badge = analysis.mode === 'summary' ? '용도별 요약' : 'Gemini 추정';
        const matchedText = analysis.matchedPurposes.length > 0 ? analysis.matchedPurposes.join(', ') : '전체 용도';

        card.innerHTML = `
            <div class="ai-answer-badge">${badge}</div>
            <div class="ai-answer-text">${analysis.answer}</div>
            <div class="ai-answer-meta">해석 대상: ${matchedText}</div>
            <ul class="ai-answer-hints">
                <li>${analysis.reasoning}</li>
                <li>${analysis.caution}</li>
                <li>근거 행 ${analysis.evidenceRows.length.toLocaleString('ko-KR')}건을 아래 표에 표시했습니다.</li>
            </ul>
        `;
        card.style.display = 'block';

        infoDiv.innerHTML = `
            <div class="info-card ai-info-card">
                <h4>🤖 Gemini 답변</h4>
                <p>${analysis.answer}</p>
                <p><strong>질문:</strong> ${analysis.question}</p>
                <p><strong>대상 용도:</strong> ${matchedText}</p>
                <p><strong>총 면적:</strong> ${analysis.totalSqm.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}㎡ / ${analysis.totalPyeong.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}평</p>
            </div>
        `;
    }

    static toPyeong(area) {
        return Number(area || 0) / 3.305785;
    }
}

window.AIAssistantManager = AIAssistantManager;
