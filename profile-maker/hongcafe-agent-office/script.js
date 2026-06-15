const state = {
    connected: false,
    selectedAgentId: null,
    missionCounter: 1,
    taskQueue: [],
    eventLog: [],
    outputDrafts: [],
    agents: [
        {
            id: 'agent-pm',
            name: 'Ari',
            role: 'PM Commander',
            type: 'pm',
            status: 'idle',
            focusMode: false,
            task: '대기 중',
            output: '아직 생성된 작업 계획이 없습니다.',
            position: { x: 148, y: 202 },
            logs: ['초기화 완료'],
            subagents: []
        },
        {
            id: 'agent-dev',
            name: 'Nox',
            role: 'Frontend Builder',
            type: 'dev',
            status: 'idle',
            focusMode: false,
            task: '대기 중',
            output: '아직 코드 초안이 없습니다.',
            position: { x: 318, y: 202 },
            logs: ['초기화 완료'],
            subagents: []
        },
        {
            id: 'agent-qa',
            name: 'Mina',
            role: 'QA Reviewer',
            type: 'qa',
            status: 'idle',
            focusMode: false,
            task: '대기 중',
            output: '아직 리뷰 결과가 없습니다.',
            position: { x: 488, y: 202 },
            logs: ['초기화 완료'],
            subagents: []
        }
    ]
};

const elements = {
    connectionBadge: document.getElementById('connection-badge'),
    connectBtn: document.getElementById('connect-btn'),
    missionInput: document.getElementById('mission-input'),
    dispatchBtn: document.getElementById('dispatch-btn'),
    reviewBtn: document.getElementById('review-btn'),
    spawnSubagentBtn: document.getElementById('spawn-subagent-btn'),
    focusBtn: document.getElementById('focus-btn'),
    queueList: document.getElementById('task-queue'),
    queueCount: document.getElementById('queue-count'),
    eventLog: document.getElementById('event-log'),
    agentLayer: document.getElementById('agent-layer'),
    roster: document.getElementById('roster'),
    agentDetail: document.getElementById('agent-detail'),
    selectedRole: document.getElementById('selected-role'),
    outputPreview: document.getElementById('output-preview'),
    activeCount: document.getElementById('active-count'),
    subagentCount: document.getElementById('subagent-count'),
    serverName: document.getElementById('server-name'),
    serverHost: document.getElementById('server-host'),
    serverNote: document.getElementById('server-note')
};

const statusLabels = {
    idle: '대기',
    working: '작업 중',
    review: '리뷰',
    blocked: '막힘',
    done: '완료'
};

const statusTone = {
    idle: 'status-idle',
    working: 'status-working',
    review: 'status-review',
    blocked: 'status-blocked',
    done: 'status-done'
};

function addLog(title, message) {
    state.eventLog.unshift({
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        title,
        message
    });
    state.eventLog = state.eventLog.slice(0, 12);
}

function updateAgent(agentId, patch) {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) {
        return;
    }

    Object.assign(agent, patch);
}

function renderQueue() {
    elements.queueCount.textContent = `${state.taskQueue.length}건`;
    if (!state.taskQueue.length) {
        elements.queueList.innerHTML = '<li><strong>큐가 비어 있습니다</strong><p>업무를 시작하면 PM이 작업을 쪼개서 여기에 올립니다.</p></li>';
        return;
    }

    elements.queueList.innerHTML = state.taskQueue.map(task => `
        <li>
            <strong>${task.title}</strong>
            <p>${task.description}</p>
        </li>
    `).join('');
}

function renderLogs() {
    elements.eventLog.innerHTML = state.eventLog.map(item => `
        <li>
            <strong>${item.title}</strong>
            <p>${item.message}</p>
        </li>
    `).join('');
}

function renderAgents() {
    elements.agentLayer.innerHTML = state.agents.map(agent => `
        <button
            class="agent-sprite ${state.selectedAgentId === agent.id ? 'selected' : ''}"
            style="left:${agent.position.x}px; top:${agent.position.y}px"
            data-agent-id="${agent.id}"
            type="button"
        >
            <span class="status-bubble ${statusTone[agent.status]}">${statusLabels[agent.status]}</span>
            <span class="agent-head"></span>
            <span class="agent-body ${agent.type === 'pm' ? 'pm' : agent.type === 'dev' ? 'dev' : agent.type === 'qa' ? 'qa' : 'sub'}"></span>
        </button>
    `).join('');

    elements.roster.innerHTML = state.agents.map(agent => `
        <button class="roster-item ${state.selectedAgentId === agent.id ? 'selected' : ''}" data-agent-id="${agent.id}" type="button">
            <div>
                <strong>${agent.name}</strong>
                <span>${agent.role}</span>
            </div>
            <span class="tiny-status ${statusTone[agent.status]}">${statusLabels[agent.status]}</span>
        </button>
    `).join('');

    elements.agentLayer.querySelectorAll('[data-agent-id]').forEach(button => {
        button.addEventListener('click', () => selectAgent(button.dataset.agentId));
    });
    elements.roster.querySelectorAll('[data-agent-id]').forEach(button => {
        button.addEventListener('click', () => selectAgent(button.dataset.agentId));
    });
}

function renderAgentDetail() {
    const agent = state.agents.find(item => item.id === state.selectedAgentId);
    if (!agent) {
        elements.selectedRole.textContent = '선택 없음';
        elements.agentDetail.className = 'agent-detail empty';
        elements.agentDetail.textContent = '왼쪽 사무실에서 에이전트를 클릭하면 상세 정보가 표시됩니다.';
        elements.spawnSubagentBtn.disabled = true;
        elements.focusBtn.disabled = true;
        return;
    }

    elements.selectedRole.textContent = agent.role;
    elements.agentDetail.className = 'agent-detail';
    elements.agentDetail.innerHTML = `
        <h3>${agent.name}</h3>
        <p>현재 작업: ${agent.task}</p>
        <div class="detail-chip-row">
            <span class="detail-chip">상태: ${statusLabels[agent.status]}</span>
            <span class="detail-chip">포커스: ${agent.focusMode ? '집중 모드' : '기본 모드'}</span>
            <span class="detail-chip">서브 에이전트: ${agent.subagents.length}명</span>
        </div>
        <p>최근 로그</p>
        <p>${agent.logs.slice(-3).reverse().join(' / ')}</p>
        <p>최신 산출물</p>
        <p>${agent.output}</p>
    `;

    const isSubAgent = agent.type === 'sub';
    elements.spawnSubagentBtn.disabled = isSubAgent;
    elements.focusBtn.disabled = false;
    elements.focusBtn.textContent = agent.focusMode ? '집중 모드 해제' : '집중 모드 전환';
}

function renderOutputPreview() {
    const latestOutput = state.outputDrafts[0];
    if (!latestOutput) {
        elements.outputPreview.className = 'output-preview empty';
        elements.outputPreview.textContent = '업무를 시작하면 PM 계획서, 개발 초안, QA 메모가 여기에 누적됩니다.';
        return;
    }

    elements.outputPreview.className = 'output-preview';
    elements.outputPreview.innerHTML = `
        <h3>${latestOutput.title}</h3>
        <p>${latestOutput.body}</p>
        <p>작성자: ${latestOutput.author}</p>
    `;
}

function renderMeta() {
    const activeCount = state.agents.filter(agent => agent.status === 'working' || agent.status === 'review').length;
    const subagentCount = state.agents.filter(agent => agent.type === 'sub').length;
    elements.activeCount.textContent = String(activeCount);
    elements.subagentCount.textContent = String(subagentCount);
}

function renderConnection() {
    elements.connectionBadge.textContent = state.connected ? 'Online' : 'Offline';
    elements.connectionBadge.className = `badge ${state.connected ? 'badge-online' : 'badge-offline'}`;
    elements.connectBtn.textContent = state.connected ? '연결 상태 점검 완료' : '서버 연결 준비';
}

function renderAll() {
    renderConnection();
    renderQueue();
    renderLogs();
    renderAgents();
    renderAgentDetail();
    renderOutputPreview();
    renderMeta();
}

function selectAgent(agentId) {
    state.selectedAgentId = agentId;
    renderAll();
}

function setAgentStatus(agentId, status, task, output, logMessage) {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) {
        return;
    }

    agent.status = status;
    agent.task = task;
    if (output) {
        agent.output = output;
    }
    if (logMessage) {
        agent.logs.push(logMessage);
    }
}

function createMissionOutput(author, title, body) {
    state.outputDrafts.unshift({ author, title, body });
    state.outputDrafts = state.outputDrafts.slice(0, 6);
}

function connectServer() {
    state.connected = true;
    addLog(
        '서버 연결 준비 완료',
        `${elements.serverName.value} (${elements.serverHost.value}) 대상으로 오케스트레이터 연결 준비가 끝났습니다. 메모: ${elements.serverNote.value}`
    );
    renderAll();
}

function dispatchMission() {
    const mission = elements.missionInput.value.trim();
    if (!mission) {
        addLog('업무 시작 실패', '메인 요청이 비어 있어 작업을 시작하지 않았습니다.');
        renderAll();
        return;
    }

    const missionId = `M-${String(state.missionCounter).padStart(2, '0')}`;
    state.missionCounter += 1;

    state.taskQueue = [
        {
            title: `${missionId} 요구사항 분석`,
            description: 'PM이 목표를 세부 작업으로 나눕니다.'
        },
        {
            title: `${missionId} 화면/로직 초안`,
            description: '개발 에이전트가 UI와 인터랙션 구조를 정리합니다.'
        },
        {
            title: `${missionId} 리뷰 라운드`,
            description: 'QA가 품질과 누락 요소를 점검합니다.'
        }
    ];

    setAgentStatus('agent-pm', 'working', '요구사항 분해 및 담당 배정', '3단계 실행 계획 초안 작성', `새 업무 접수: ${mission}`);
    setAgentStatus('agent-dev', 'idle', 'PM 배정 대기', null, '새 업무 대기');
    setAgentStatus('agent-qa', 'idle', '리뷰 요청 대기', null, '리뷰 라운드 대기');

    createMissionOutput(
        'Ari / PM Commander',
        `${missionId} PM 계획안`,
        `요청을 분석한 뒤 업무를 설계, 구현, 검수 3개 트랙으로 분해했습니다. 메인 산출물은 가상 사무실 UI, 상태 로그, 서브 에이전트 확장 규칙입니다.`
    );
    addLog('업무 접수', `${missionId} 작업이 생성되었습니다. PM이 요구사항을 분해하고 있습니다.`);

    renderAll();

    window.setTimeout(() => {
        setAgentStatus(
            'agent-dev',
            'working',
            '가상 사무실 UI 및 에이전트 상태 패널 구현',
            '픽셀 사무실 화면, 로그, 로스터 영역 스캐폴드 초안 작성',
            'PM으로부터 UI 및 상태 관리 구현을 배정받았습니다.'
        );
        addLog('개발 착수', 'Frontend Builder가 메인 화면과 에이전트 렌더링 작업을 시작했습니다.');
        renderAll();
    }, 900);

    window.setTimeout(() => {
        setAgentStatus(
            'agent-pm',
            'review',
            '작업 진척 추적 및 리스크 조정',
            '추가 서브 에이전트 투입 여부 검토',
            '개발 진행률을 확인하며 병목 구간을 추적합니다.'
        );
        createMissionOutput(
            'Nox / Frontend Builder',
            `${missionId} 개발 초안`,
            '메인 방, 에이전트 자리, 라이브 로그, 서브 에이전트 버튼을 포함한 초기 MVP UI를 구성했습니다.'
        );
        addLog('PM 모니터링', 'Commander가 병목을 확인하고 서브 에이전트 투입 기준을 계산 중입니다.');
        renderAll();
    }, 1800);

    window.setTimeout(() => {
        setAgentStatus(
            'agent-qa',
            'review',
            'UI 흐름 및 품질 기준 확인',
            '상태 표시 명확성, 연결 설계, 승인 흐름 확인',
            '개발 초안 검수에 들어갔습니다.'
        );
        createMissionOutput(
            'Mina / QA Reviewer',
            `${missionId} QA 메모`,
            '시각화는 충분히 직관적입니다. 다음 단계로 실제 서버 이벤트 연결, 권한 관리, 실패 복구 흐름이 필요합니다.'
        );
        addLog('QA 착수', 'QA Reviewer가 흐름 검수와 누락 기능 정리를 시작했습니다.');
        renderAll();
    }, 2700);

    window.setTimeout(() => {
        state.taskQueue = [];
        setAgentStatus('agent-pm', 'done', '업무 정리 및 다음 라운드 대기', null, '현재 라운드 정리 완료');
        setAgentStatus('agent-dev', 'done', '초안 제출 완료', null, '초안 제출 완료');
        setAgentStatus('agent-qa', 'done', '리뷰 정리 완료', null, '리뷰 제출 완료');
        addLog('라운드 완료', `${missionId} 작업의 1차 라운드가 마무리되었습니다.`);
        renderAll();
    }, 3800);
}

function runReviewRound() {
    const pm = state.agents.find(agent => agent.id === 'agent-pm');
    const dev = state.agents.find(agent => agent.id === 'agent-dev');
    const qa = state.agents.find(agent => agent.id === 'agent-qa');
    if (!pm || !dev || !qa) {
        return;
    }

    setAgentStatus(pm.id, 'review', '리뷰 코멘트 취합', null, '리뷰 요청을 다시 취합합니다.');
    setAgentStatus(dev.id, 'working', 'QA 코멘트 반영', null, '리뷰 반영용 수정 작업을 시작합니다.');
    setAgentStatus(qa.id, 'review', '품질 기준 재확인', null, '재검토를 진행합니다.');
    addLog('리뷰 라운드', 'PM, Dev, QA가 함께 개선 포인트를 재정렬하고 있습니다.');
    createMissionOutput(
        'Observer',
        '리뷰 라운드 요약',
        '리뷰 단계에서는 실패 케이스, 승인 플로우, 서버 연결 에러 상태를 우선 보강하도록 추천합니다.'
    );
    renderAll();
}

function spawnSubAgent() {
    const parent = state.agents.find(agent => agent.id === state.selectedAgentId);
    if (!parent || parent.type === 'sub') {
        return;
    }

    const subIndex = parent.subagents.length + 1;
    const subId = `${parent.id}-sub-${subIndex}`;
    const subAgent = {
        id: subId,
        name: `${parent.name}-Sub${subIndex}`,
        role: `${parent.role} Support`,
        type: 'sub',
        status: 'working',
        focusMode: false,
        task: `${parent.name} 작업 보조`,
        output: `${parent.role}의 세부 작업을 병렬 처리합니다.`,
        position: { x: parent.position.x + 40, y: parent.position.y + 72 + (subIndex - 1) * 48 },
        logs: ['부모 에이전트 요청으로 생성됨'],
        subagents: []
    };

    parent.subagents.push(subId);
    parent.logs.push(`서브 에이전트 ${subAgent.name} 생성`);
    state.agents.push(subAgent);
    addLog('서브 에이전트 생성', `${parent.name} 아래에 ${subAgent.name}를 추가했습니다.`);
    createMissionOutput(
        subAgent.name,
        '서브 에이전트 작업 착수',
        `${parent.role}의 병목을 줄이기 위해 세부 구현과 검수 보조를 담당합니다.`
    );
    state.selectedAgentId = subId;
    renderAll();
}

function toggleFocusMode() {
    const agent = state.agents.find(item => item.id === state.selectedAgentId);
    if (!agent) {
        return;
    }

    agent.focusMode = !agent.focusMode;
    agent.logs.push(agent.focusMode ? '집중 모드 진입' : '집중 모드 해제');
    addLog('집중 모드 변경', `${agent.name} 상태가 ${agent.focusMode ? '집중 모드' : '기본 모드'}로 전환되었습니다.`);
    renderAll();
}

elements.connectBtn.addEventListener('click', connectServer);
elements.dispatchBtn.addEventListener('click', dispatchMission);
elements.reviewBtn.addEventListener('click', runReviewRound);
elements.spawnSubagentBtn.addEventListener('click', spawnSubAgent);
elements.focusBtn.addEventListener('click', toggleFocusMode);

addLog('오피스 초기화', '가상 사무실 UI가 준비되었습니다. 서버 연결과 업무 지시를 시작할 수 있습니다.');
renderAll();
