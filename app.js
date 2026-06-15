const STORAGE_KEY = "hongcafe_ops_worklog_v1";
const SERVER_STATE_URL = "/api/state";
const AUTH_LOGIN_URL = "/api/auth/login";
const AUTH_ME_URL = "/api/auth/me";
const AUTH_LOGOUT_URL = "/api/auth/logout";
const USERS_URL = "/api/users";
const WORK_REPORT_URL = "/api/reports/work-report.xlsx";
const COUNSELOR_REPORT_IMPORT_URL = "/api/reports/import-counselors";

const statusFlow = ["대기", "진행중", "완료 보고", "확인 완료", "반려"];
const activeTaskStatuses = ["대기", "진행중", "완료 보고", "반려"];
const opsParts = ["운영 1파트", "운영 2파트", "운영 3파트"];
const counselorFields = [
  "responsibility",
  "task",
  "field",
  "subField",
  "alias",
  "currentStatus",
  "registeredAt",
  "reason",
  "recentHistory",
  "weeklyAction",
  "result",
  "manageCount",
  "note",
];
const templates = {
  recruit: ["업체명", "담당자", "연락처", "섭외 상태", "최근 연락일", "다음 액션", "메모"],
  project: ["프로젝트", "담당 파트", "담당자", "현재 단계", "마감일", "이슈", "보고 여부"],
  blank: ["항목", "담당자", "상태", "메모"],
};

const defaultData = {
  activeRole: "teamLead",
  activeSheetId: "sheet-1",
  org: {
    teamLead: { id: "u1", name: "김팀장", role: "팀장", part: "운영팀" },
    parts: [
      {
        id: "섭외파트",
        lead: { id: "u2", name: "이파트장", role: "파트장", part: "섭외파트" },
        members: [
          { id: "u3", name: "박파트원", role: "파트원", part: "섭외파트" },
          { id: "u4", name: "최파트원", role: "파트원", part: "섭외파트" },
        ],
      },
      {
        id: "콘텐츠파트",
        lead: { id: "u5", name: "정파트장", role: "파트장", part: "콘텐츠파트" },
        members: [{ id: "u6", name: "윤파트원", role: "파트원", part: "콘텐츠파트" }],
      },
      {
        id: "CS파트",
        lead: { id: "u7", name: "한파트장", role: "파트장", part: "CS파트" },
        members: [{ id: "u8", name: "오파트원", role: "파트원", part: "CS파트" }],
      },
    ],
  },
  duties: [
    { id: "d1", title: "주간 섭외 현황 점검", part: "섭외파트", cycle: "매주", due: "매주 금요일 17:00", status: "진행중" },
    { id: "d2", title: "신규 기획서 숙지 확인", part: "콘텐츠파트", cycle: "수시", due: "공유 후 24시간 이내", status: "대기" },
    { id: "d3", title: "고객 문의 주요 이슈 정리", part: "CS파트", cycle: "매일", due: "매일 18:00", status: "확인 완료" },
  ],
  tasks: [
    {
      id: "t1",
      title: "6월 1주 섭외 후보 리스트 업데이트",
      assignee: "u3",
      assigneeName: "박파트원",
      part: "섭외파트",
      priority: "높음",
      dueDate: getDateOffset(2),
      memo: "진행 상태와 다음 액션까지 입력",
      status: "진행중",
      assigner: "김팀장",
      reports: [],
    },
    {
      id: "t2",
      title: "신규 프로젝트 업무 흐름 초안 검토",
      assignee: "u5",
      assigneeName: "정파트장",
      part: "콘텐츠파트",
      priority: "보통",
      dueDate: getDateOffset(4),
      memo: "기획서와 매뉴얼 연결 항목 확인",
      status: "대기",
      assigner: "김팀장",
      reports: [],
    },
  ],
  knowledge: [
    {
      id: "k1",
      title: "업무 완료 보고 기준",
      target: "전체",
      body: "완료 보고에는 처리 결과, 남은 이슈, 다음 담당자가 필요한지 여부를 포함합니다.",
      completedBy: ["u1", "u2"],
    },
  ],
  manuals: [
    {
      id: "m1",
      title: "섭외 진행 상태 관리 기준",
      category: "섭외",
      body: "각 업체별 최근 연락일과 다음 액션을 반드시 남기고, 재연락 예정일이 지난 항목은 당일 보고합니다.",
      files: [{ name: "sample_process.xlsx", size: 24576 }],
      createdAt: new Date().toISOString(),
    },
  ],
  sheets: [
    {
      id: "sheet-1",
      name: "5월 5주 섭외현황",
      columns: templates.recruit,
      rows: [
        ["A업체", "박파트원", "010-0000-0000", "진행중", "2026-05-28", "조건 확인", "담당자 회신 대기"],
        ["B업체", "최파트원", "010-1111-1111", "보류", "2026-05-27", "다음 주 재연락", ""],
      ],
    },
  ],
  counselors: [
    {
      id: "c1",
      responsibility: "상담사 모니터링",
      task: "정산시간/접속시간/부재중/매출/후기/1:1문의",
      field: "전화",
      subField: "타로",
      alias: "홍길동",
      currentStatus: "관리필요",
      registeredAt: "2026.06.11",
      reason: "접속저조",
      recentHistory: "접속시간 증가 개선 요청",
      weeklyAction: "접속시간 증가 및 단골 확보 재요청",
      result: "모니터링중",
      manageCount: "2회",
      note: "",
    },
  ],
  workReportTemplate: {
    title: "업무보고",
    managerLine: "[운영팀] 담당자 : 김소리,박현구,이재영,윤가영,고한나,최용빈,이다혜,지상혁,오혜림,윤유나,양현모,좌유진",
    noticeTitle: "[전달사항]",
    notices:
      "① 광고 상담사 진행 현황 전달\n② 타로/사주/신점 상담사 신규 소개비 지급 현황 공유\n③ 블라인드 상담사 발생 사유 및 재등록 검토 현황 공유\n④ 타사 영업자·타사 상담사 영업행위 체크 및 모니터링 진행\n⑤ 타로·사주 분야 활동 저조 상담사 대상 관리 및 활동 독려 진행\n⑥ 접속 저조 상담사 현황 및 집중관리 대상 공유\n⑦ 반복 관리 상담사 및 장기 미개선 상담사 현황 정리",
    counselorSummaryLine: "",
  },
  reports: [
    {
      id: "r1",
      taskId: "t1",
      title: "6월 1주 섭외 후보 리스트 업데이트",
      reporter: "박파트원",
      reviewer: "이파트장",
      body: "후보 18건 정리 완료, 4건은 연락처 확인 필요",
      status: "검토 대기",
      createdAt: new Date().toISOString(),
    },
  ],
};

let state = loadState();
let serverSyncEnabled = window.location.protocol !== "file:";
let isHydratingFromServer = false;
let currentUser = null;
let userMappings = [];
let sheetListCollapsed = false;
let sheetSortMode = "recent";
let sheetViewMode = "wrap";
let selectedSheetCell = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function getDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDefaultState(saved) {
  const base = clone(defaultData);
  return {
    ...base,
    ...saved,
    org: { ...base.org, ...(saved?.org || {}) },
    workReportTemplate: { ...base.workReportTemplate, ...(saved?.workReportTemplate || {}) },
    counselors: Array.isArray(saved?.counselors) ? saved.counselors : base.counselors,
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return clone(defaultData);

  try {
    return mergeDefaultState(JSON.parse(stored));
  } catch {
    return clone(defaultData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (serverSyncEnabled && !isHydratingFromServer) {
    saveStateToServer();
  }
}

async function hydrateFromServer() {
  if (!serverSyncEnabled) return;

  try {
    const response = await fetch(SERVER_STATE_URL);
    if (!response.ok) throw new Error("Server state request failed.");
    const payload = await response.json();
    if (payload.state) {
      isHydratingFromServer = true;
      state = mergeDefaultState(payload.state);
      renderAll();
      isHydratingFromServer = false;
    } else {
      await saveStateToServer();
    }
  } catch {
    serverSyncEnabled = false;
  }
}

async function saveStateToServer() {
  try {
    await fetch(SERVER_STATE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  } catch {
    serverSyncEnabled = false;
  }
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function loadUsers() {
  userMappings = [];
  if (!serverSyncEnabled || currentUser?.role !== "teamLead") return;

  try {
    const response = await fetch(USERS_URL);
    const payload = await readResponseBody(response);
    if (!response.ok) throw new Error(payload.error || "사용자 목록을 불러오지 못했습니다.");
    userMappings = payload.users || [];
  } catch {
    userMappings = [];
  }
}

async function saveUserMapping(formData) {
  const response = await fetch(USERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const payload = await readResponseBody(response);
  if (!response.ok) throw new Error(payload.error || "사용자 저장에 실패했습니다.");
  await loadUsers();
}

async function deleteUserMapping(adminId) {
  const response = await fetch(`${USERS_URL}/${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  });
  const payload = await readResponseBody(response);
  if (!response.ok) throw new Error(payload.error || "사용자 삭제에 실패했습니다.");
  await loadUsers();
}

async function initApp() {
  bindEvents();

  if (!serverSyncEnabled) {
    showAuthenticatedApp();
    return;
  }

  try {
    const response = await fetch(AUTH_ME_URL);
    if (!response.ok) {
      showLogin();
      return;
    }

    const payload = await response.json();
    currentUser = payload.user;
    applyCurrentUser();
    await loadUsers();
    await hydrateFromServer();
    showAuthenticatedApp();
  } catch {
    showLogin("서버 연결을 확인해주세요.");
  }
}

function showLogin(message = "") {
  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  $("#loginError").textContent = message;
}

function showAuthenticatedApp() {
  document.body.classList.remove("auth-pending");
  document.body.classList.add("authenticated");
  applyCurrentUser();
  renderAll();
}

function applyCurrentUser() {
  if (!currentUser) return;

  state.activeRole = currentUser.role;
  const roleSelect = $("#roleSelect");
  roleSelect.value = currentUser.role;
  roleSelect.disabled = true;
  $("#sessionUser").textContent = `${currentUser.name} · ${roleLabel(currentUser.role)} · ${currentUser.part}`;
}

function roleLabel(role) {
  if (role === "teamLead") return "팀장";
  if (role === "partLead") return "파트장";
  return "파트원";
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function activeSheet() {
  return state.sheets.find((sheet) => sheet.id === state.activeSheetId) || state.sheets[0];
}

function normalizeDuty(duty) {
  return {
    id: duty.id,
    job: duty.job || duty.title || "이름 없는 직무",
    responsibility: duty.responsibility || duty.duty || "",
    task: duty.task || duty.title || "",
    detail: duty.detail || duty.description || duty.memo || duty.due || "",
    part: duty.part || "운영 1파트",
    owner: duty.owner || duty.assigneeName || "",
    frequency: duty.frequency || duty.cycle || "수시",
    duration: duty.duration || duty.due || "",
    importance: duty.importance || "3",
    difficulty: duty.difficulty || "3",
    approver: duty.approver || "",
    note: duty.note || duty.remark || "",
  };
}

function normalizeCounselor(counselor = {}) {
  const histories = Array.isArray(counselor.history) && counselor.history.length
    ? counselor.history.map(normalizeCounselorHistory)
    : [normalizeCounselorHistory(counselor)];
  const latest = histories[histories.length - 1] || {};
  const normalized = {
    id: counselor.id || uid("counselor"),
    history: histories,
  };

  counselorFields.forEach((field) => {
    normalized[field] = counselor[field] || latest[field] || "";
  });

  normalized.responsibility = normalized.responsibility || "상담사 모니터링";
  normalized.task = normalized.task || "정산시간/접속시간/부재중/매출/후기/1:1문의";
  normalized.alias = normalized.alias || latest.alias || "";
  normalized.field = normalized.field || latest.field || "";
  normalized.subField = normalized.subField || latest.subField || "";
  normalized.reason = normalized.reason || latest.reason || "";
  normalized.manageCount = formatManageCount(counselorManageCount(normalized));
  return normalized;
}

function normalizeCounselorHistory(entry = {}) {
  const history = {};
  counselorFields.forEach((field) => {
    history[field] = entry[field] || "";
  });
  history.responsibility = history.responsibility || "상담사 모니터링";
  history.task = history.task || "정산시간/접속시간/부재중/매출/후기/1:1문의";
  history.manageCountRaw = entry.manageCountRaw || entry.manageCount || "";
  history.reportDate = entry.reportDate || "";
  history.sourceName = entry.sourceName || "";
  history.sourceRow = entry.sourceRow || "";
  history.importedAt = entry.importedAt || "";
  return history;
}

function counselorCaseKey(counselorOrHistory) {
  return ["alias", "field", "subField", "reason"]
    .map((field) => String(counselorOrHistory[field] || "").trim().toLowerCase())
    .join("|");
}

function parseManageCount(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function counselorManageCount(counselor) {
  const history = Array.isArray(counselor.history) ? counselor.history : [];
  const importedMax = Math.max(0, ...history.map((item) => parseManageCount(item.manageCountRaw || item.manageCount)));
  return Math.max(history.length, importedMax);
}

function formatManageCount(count) {
  return `${Math.max(Number(count) || 0, 0)}회`;
}

function counselorReportRows() {
  return state.counselors.map(normalizeCounselor).flatMap((counselor) => {
    const count = formatManageCount(counselorManageCount(counselor));
    return counselor.history.map((history, historyIndex) => ({
      ...history,
      id: counselor.id,
      historyIndex,
      manageCount: count,
    }));
  });
}

function historySignature(history) {
  return ["alias", "field", "subField", "reason", "weeklyAction", "result", "registeredAt", "sourceName", "sourceRow"]
    .map((field) => String(history[field] || "").trim())
    .join("|");
}

function mergeCounselors(existing, incoming, replace = false) {
  if (replace) return incoming.map(normalizeCounselor);
  const merged = existing.map(normalizeCounselor);

  incoming.map(normalizeCounselor).forEach((next) => {
    const key = counselorCaseKey(next);
    const target = merged.find((item) => counselorCaseKey(item) === key);
    if (!target) {
      merged.push(next);
      return;
    }

    const signatures = new Set(target.history.map(historySignature));
    next.history.forEach((history) => {
      const signature = historySignature(history);
      if (!signatures.has(signature)) {
        target.history.push(history);
        signatures.add(signature);
      }
    });
    const latest = target.history[target.history.length - 1];
    counselorFields.forEach((field) => {
      target[field] = latest[field] || target[field] || "";
    });
    target.manageCount = formatManageCount(counselorManageCount(target));
  });

  return merged;
}

function counselorMatches(counselor, keyword) {
  if (!keyword) return true;
  return counselorFields.some((field) => String(counselor[field] || "").toLowerCase().includes(keyword));
}

function counselorStatusOptions() {
  const statuses = [...new Set(counselorReportRows().map((item) => item.currentStatus).filter(Boolean))];
  return ["전체", ...statuses];
}

function sortedSheets(sheets) {
  const indexed = sheets.map((sheet, index) => ({ sheet, index }));

  if (sheetSortMode === "name") {
    return indexed.sort((a, b) => a.sheet.name.localeCompare(b.sheet.name, "ko")).map((item) => item.sheet);
  }

  if (sheetSortMode === "rows") {
    return indexed.sort((a, b) => b.sheet.rows.length - a.sheet.rows.length || a.index - b.index).map((item) => item.sheet);
  }

  return indexed.sort((a, b) => b.index - a.index).map((item) => item.sheet);
}

function isSectionRow(row) {
  const filled = row.map((cell) => String(cell || "").trim()).filter(Boolean);
  return filled.length === 1 && String(row[0] || "").trim().length > 0;
}

function getUsers() {
  if (userMappings.length) {
    return userMappings.map((user) => ({
      id: user.adminId,
      name: user.name,
      role: roleLabel(user.role),
      part: user.part,
    }));
  }

  return [
    state.org.teamLead,
    ...state.org.parts.flatMap((part) => [part.lead, ...part.members]),
  ];
}

function getRoleUser() {
  if (currentUser) {
    return {
      id: currentUser.adminId,
      name: currentUser.name,
      role: roleLabel(currentUser.role),
      part: currentUser.part,
    };
  }

  if (state.activeRole === "teamLead") return state.org.teamLead;
  if (state.activeRole === "partLead") return state.org.parts[0].lead;
  return state.org.parts[0].members[0];
}

function normalizeTask(task) {
  return {
    ...task,
    assignee: task.assignee || task.assigneeId || "",
    assigneeName: task.assigneeName || "담당자 미지정",
    part: task.part || "운영팀",
    priority: task.priority || "보통",
    dueDate: task.dueDate || "",
    memo: task.memo || "",
    status: task.status || "대기",
    assigner: task.assignerName || task.assigner || "배정자 미지정",
    assignerId: task.assignerId || "",
    assignerRole: task.assignerRole || "",
    createdAt: task.createdAt || "",
    completedAt: task.completedAt || "",
    archivedMonth: task.archivedMonth || task.completedAt?.slice(0, 7) || "",
    reports: Array.isArray(task.reports) ? task.reports : [],
  };
}

function canCreateTasks() {
  return state.activeRole === "teamLead" || state.activeRole === "partLead";
}

function canAssignTo(user) {
  const current = getRoleUser();
  if (state.activeRole === "teamLead") return user.role !== "팀장";
  if (state.activeRole === "partLead") return user.part === current.part && user.role === "파트원";
  return false;
}

function visibleTasks() {
  const current = getRoleUser();
  const tasks = state.tasks.map(normalizeTask);
  if (state.activeRole === "teamLead") return tasks;
  if (state.activeRole === "partLead") return tasks.filter((task) => task.part === current.part || task.assignee === current.id);
  return tasks.filter((task) => task.assignee === current.id);
}

function visibleActiveTasks() {
  return visibleTasks().filter((task) => task.status !== "확인 완료");
}

function taskArchiveMonth(task) {
  return task.archivedMonth || task.completedAt?.slice(0, 7) || task.dueDate?.slice(0, 7) || "월 미지정";
}

function markTaskArchived(task) {
  const now = new Date().toISOString();
  task.completedAt = task.completedAt || now;
  task.archivedMonth = task.completedAt.slice(0, 7);
}

function clearTaskArchive(task) {
  delete task.completedAt;
  delete task.archivedMonth;
}

function canUpdateTask(task) {
  const current = getRoleUser();
  if (task.assignee === current.id) return true;
  if (state.activeRole === "teamLead") return true;
  return state.activeRole === "partLead" && task.part === current.part;
}

function canReportTask(task) {
  const current = getRoleUser();
  return task.assignee === current.id && task.status !== "완료 보고" && task.status !== "확인 완료";
}

function canDeleteTask(task) {
  const current = getRoleUser();
  if (state.activeRole === "teamLead") return true;
  return state.activeRole === "partLead" && (task.assignerId === current.id || task.part === current.part);
}

function visibleReports() {
  const current = getRoleUser();
  if (state.activeRole === "teamLead") return state.reports;
  if (state.activeRole === "partLead") {
    return state.reports.filter((report) => {
      const task = state.tasks.find((item) => item.id === report.taskId);
      return task?.part === current.part;
    });
  }
  return state.reports.filter((report) => report.reporter === current.name);
}

function emptyState() {
  return $("#emptyStateTemplate").content.cloneNode(true);
}

function navAllowed(button) {
  const roles = (button.dataset.roles || "teamLead,partLead,member").split(",");
  return roles.includes(state.activeRole);
}

function activateView(viewId) {
  const button = $(`.nav-item[data-view="${viewId}"]`);
  if (!button || !navAllowed(button)) return false;

  $$(".nav-item").forEach((item) => item.classList.remove("active"));
  $$(".view").forEach((view) => view.classList.remove("active"));
  button.classList.add("active");
  $(`#${button.dataset.view}`).classList.add("active");
  $("#viewTitle").textContent = button.textContent;
  document.body.dataset.view = viewId;
  return true;
}

function renderNavigation() {
  $$(".nav-item").forEach((button) => {
    button.hidden = !navAllowed(button);
  });
  $$(".nav-group").forEach((group) => {
    group.hidden = ![...group.querySelectorAll(".nav-item")].some((button) => !button.hidden);
  });

  const activeButton = $(".nav-item.active");
  if (!activeButton || activeButton.hidden) {
    activateView("dashboard");
  }
}

function renderAll() {
  saveState();
  $("#roleSelect").value = state.activeRole;
  $("#currentDate").textContent = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
  }).format(new Date());
  fillSelects();
  renderNavigation();
  renderMetrics();
  renderDashboardLists();
  renderDuties();
  renderTasks();
  renderTaskArchive();
  renderKnowledge();
  renderManuals();
  renderSheets();
  renderCounselors();
  renderWorkReport();
  renderReports();
  renderOrg();
  renderUserManagement();
}

function fillSelects() {
  const parts = ["전체", ...opsParts];
  const partOptions = parts.map((part) => `<option value="${part}">${part}</option>`).join("");
  const dutyPartOptions = opsParts.map((part) => `<option value="${part}">${part}</option>`).join("");
  const allUsers = getUsers();
  const assignableUsers = allUsers.filter(canAssignTo);
  const userOptions = assignableUsers.length
    ? assignableUsers.map((user) => `<option value="${user.id}">${user.name} · ${user.role} · ${user.part}</option>`).join("")
    : '<option value="">배정 가능 대상 없음</option>';

  $("select[name='part']").innerHTML = dutyPartOptions;
  $("#dutyFilter").innerHTML = partOptions;
  $("select[name='assignee']").innerHTML = userOptions;
  if ($("select[name='owner']")) {
    $("select[name='owner']").innerHTML = `<option value="">미지정</option>${allUsers.map((user) => `<option value="${user.name}">${user.name} · ${user.role} · ${user.part}</option>`).join("")}`;
  }
}

function renderMetrics() {
  const tasks = visibleTasks();
  const reports = visibleReports();
  const pendingKnowledge = state.knowledge.filter((item) => !item.completedBy.includes(getRoleUser().id)).length;
  const metrics = [
    ["진행 업무", tasks.filter((task) => task.status === "진행중").length],
    ["완료 보고", tasks.filter((task) => task.status === "완료 보고").length],
    ["숙지 대기", pendingKnowledge],
    ["관리 시트", state.sheets.length],
  ];
  $("#metrics").innerHTML = metrics.map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderDashboardLists() {
  renderList(
    $("#todayTasks"),
    visibleTasks().slice(0, 5).map((task) => taskItem(task, false)),
  );
  renderList(
    $("#recentReports"),
    visibleReports().slice(-5).reverse().map(reportItem),
  );
}

function renderList(target, nodes) {
  target.innerHTML = "";
  if (!nodes.length) {
    target.append(emptyState());
    return;
  }
  nodes.forEach((node) => target.append(node));
}

function renderDuties() {
  const filter = $("#dutyFilter").value || "전체";
  const keyword = ($("#dutySearch")?.value || "").trim().toLowerCase();
  const duties = state.duties
    .map(normalizeDuty)
    .filter((duty) => filter === "전체" || duty.part === filter)
    .filter((duty) => {
      if (!keyword) return true;
      return `${duty.job} ${duty.responsibility} ${duty.task} ${duty.detail} ${duty.owner} ${duty.part}`.toLowerCase().includes(keyword);
    });

  $("#dutySummary").textContent = `${duties.length}개 직무 · 전체 ${state.duties.length}개`;
  $("#dutyTable").innerHTML = duties
    .map(
      (duty) => `
        <tr data-duty-row="${duty.id}">
          <td><strong>${escapeHtml(duty.job)}</strong></td>
          <td>${escapeHtml(duty.responsibility || "-")}</td>
          <td>
            <strong>${escapeHtml(duty.task || "-")}</strong>
            <p>${escapeHtml(duty.detail || "세부내용 없음")}</p>
          </td>
          <td>${escapeHtml(duty.owner || "미지정")}</td>
          <td>${escapeHtml(duty.part)}</td>
          <td>${escapeHtml(duty.frequency)}</td>
          <td>${escapeHtml(duty.duration || "-")}</td>
          <td>${escapeHtml(duty.importance)} / ${escapeHtml(duty.difficulty)}</td>
          <td>
            <div class="mini-actions">
              <button data-view-duty="${duty.id}">상세</button>
              <button data-edit-duty="${duty.id}">수정</button>
              <button class="danger-text" data-delete-duty="${duty.id}">삭제</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  if (!duties.length) {
    $("#dutyTable").innerHTML = '<tr><td colspan="9">조건에 맞는 직무가 없습니다.</td></tr>';
  }
}

function renderDutyDetail(dutyId) {
  const raw = state.duties.find((item) => item.id === dutyId);
  if (!raw) return;

  const duty = normalizeDuty(raw);
  $("#dutyDetail").innerHTML = `
    <div>
      <strong>${escapeHtml(duty.job)}</strong>
      <span>${escapeHtml(duty.part)} · ${escapeHtml(duty.owner || "담당자 미지정")} · ${escapeHtml(duty.frequency)}</span>
    </div>
    <h3>${escapeHtml(duty.task || duty.responsibility || "과업 미지정")}</h3>
    <p>${escapeHtml(duty.detail || "등록된 세부내용이 없습니다.")}</p>
    <dl>
      <div><dt>책무</dt><dd>${escapeHtml(duty.responsibility || "-")}</dd></div>
      <div><dt>수행시간</dt><dd>${escapeHtml(duty.duration || "-")}</dd></div>
      <div><dt>중요도/난이도</dt><dd>${escapeHtml(duty.importance)} / ${escapeHtml(duty.difficulty)}</dd></div>
      <div><dt>전결자</dt><dd>${escapeHtml(duty.approver || "-")}</dd></div>
      <div><dt>협조/비고</dt><dd>${escapeHtml(duty.note || "-")}</dd></div>
    </dl>
  `;
}

function resetDutyForm() {
  $("#dutyForm").reset();
  $("#dutyForm").elements.id.value = "";
  $("#dutyFormTitle").textContent = "직무 등록";
}

function fillDutyForm(dutyId) {
  const raw = state.duties.find((item) => item.id === dutyId);
  if (!raw) return;

  const duty = normalizeDuty(raw);
  const form = $("#dutyForm");
  Object.entries(duty).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  $("#dutyFormTitle").textContent = "직무 수정";
  renderDutyDetail(dutyId);
}

function renderTasks() {
  const filter = $("#taskFilter").value;
  const current = getRoleUser();
  const assignPanel = $("#taskForm");
  assignPanel.hidden = !canCreateTasks();
  $(".task-workspace").classList.toggle("no-assignment", !canCreateTasks());
  $("#taskAssignNote").textContent = canCreateTasks()
    ? state.activeRole === "teamLead"
      ? "팀장은 운영팀 전체의 파트장과 파트원에게 업무를 배정할 수 있습니다."
      : "파트장은 같은 파트의 파트원에게 업무를 배정할 수 있습니다."
    : "파트원은 업무 배정 권한이 없으며, 배정받은 업무만 확인할 수 있습니다.";

  let tasks = visibleTasks();
  if (filter === "active") tasks = visibleActiveTasks();
  if (filter === "assignedToMe") tasks = visibleTasks().filter((task) => task.assignee === current.id && task.status !== "확인 완료");
  if (filter === "assignedByMe") tasks = visibleTasks().filter((task) => task.assignerId === current.id && task.status !== "확인 완료");
  if (activeTaskStatuses.includes(filter)) tasks = visibleTasks().filter((task) => task.status === filter);
  if (filter === "all") tasks = visibleActiveTasks();

  const activeCount = visibleActiveTasks().length;
  const completedCount = visibleTasks().filter((task) => task.status === "확인 완료").length;
  $("#taskSummary").textContent = `진행 ${activeCount}개 · 완료 보관 ${completedCount}개`;

  const grouped = activeTaskStatuses.map((status) => [status, tasks.filter((task) => task.status === status)]);
  $("#taskBoard").innerHTML = grouped
    .map(
      ([status, items]) => `
        <section class="kanban-column">
          <h3>${status} ${items.length}</h3>
          <div class="stack-list">
            ${items.map((task) => taskItem(task, true).outerHTML).join("") || '<div class="empty-state">없음</div>'}
          </div>
        </section>
      `,
    )
    .join("");
}

function taskItem(task, withActions) {
  task = normalizeTask(task);
  const actions = [];
  if (withActions && canUpdateTask(task) && task.status !== "확인 완료") {
    actions.push(`<button data-task-next="${task.id}">상태 변경</button>`);
  }
  if (withActions && canReportTask(task)) {
    actions.push(`<button data-task-report="${task.id}">보고</button>`);
  }
  if (withActions && canDeleteTask(task)) {
    actions.push(`<button class="danger-text" data-delete-task="${task.id}">삭제</button>`);
  }

  const item = document.createElement("article");
  item.className = "item";
  item.innerHTML = `
    <h3>${escapeHtml(task.title)}</h3>
    <p>${escapeHtml(task.assigneeName)} · ${escapeHtml(task.part)} · 마감 ${escapeHtml(task.dueDate || "미정")}</p>
    <p>배정자: ${escapeHtml(task.assigner)}${task.memo ? ` · ${escapeHtml(task.memo)}` : ""}</p>
    <div class="item-footer">
      <span class="priority-pill ${task.priority === "높음" ? "high" : ""}">${escapeHtml(task.priority)}</span>
      ${statusPill(task.status)}
    </div>
    ${actions.length ? `<div class="mini-actions">${actions.join("")}</div>` : ""}
  `;
  return item;
}

function renderTaskArchive() {
  const completedTasks = visibleTasks()
    .filter((task) => task.status === "확인 완료")
    .sort((a, b) => taskArchiveMonth(b).localeCompare(taskArchiveMonth(a)) || (b.completedAt || "").localeCompare(a.completedAt || ""));
  const months = [...new Set(completedTasks.map(taskArchiveMonth))];
  const monthFilter = $("#archiveMonthFilter");
  const selectedMonth = monthFilter.value || "all";
  monthFilter.innerHTML = `<option value="all">전체 월</option>${months.map((month) => `<option value="${month}">${month}</option>`).join("")}`;
  monthFilter.value = months.includes(selectedMonth) ? selectedMonth : "all";

  const filtered = monthFilter.value === "all" ? completedTasks : completedTasks.filter((task) => taskArchiveMonth(task) === monthFilter.value);
  $("#taskArchiveSummary").textContent = `${filtered.length}개 완료 업무 · ${months.length}개월`;

  if (!filtered.length) {
    $("#taskArchiveList").innerHTML = '<div class="empty-state">완료 보관된 업무가 없습니다.</div>';
    return;
  }

  const grouped = filtered.reduce((acc, task) => {
    const month = taskArchiveMonth(task);
    if (!acc[month]) acc[month] = [];
    acc[month].push(task);
    return acc;
  }, {});

  $("#taskArchiveList").innerHTML = Object.entries(grouped)
    .map(
      ([month, tasks]) => `
        <section class="archive-month">
          <h3>${escapeHtml(month)} <span>${tasks.length}개</span></h3>
          <div class="stack-list">
            ${tasks.map((task) => taskItem(task, false).outerHTML).join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderKnowledge() {
  const current = getRoleUser();
  const items = state.knowledge.filter((item) => item.target === "전체" || item.target === current.part);
  renderList(
    $("#knowledgeList"),
    items.map((item) => {
      const done = item.completedBy.includes(current.id);
      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.body}</p>
        <div class="item-footer">
          <span>${item.target}</span>
          <div class="mini-actions">
            <button data-knowledge-done="${item.id}">${done ? "숙지 완료됨" : "숙지 완료"}</button>
            <button class="danger-text" data-delete-knowledge="${item.id}">삭제</button>
          </div>
        </div>
      `;
      return node;
    }),
  );
}

function renderManuals() {
  const keyword = $("#manualSearch").value?.trim() || "";
  const manuals = state.manuals.filter((manual) => `${manual.title} ${manual.category} ${manual.body}`.includes(keyword));
  renderList(
    $("#manualList"),
    manuals.map((manual) => {
      const node = document.createElement("article");
      node.className = "item";
      node.innerHTML = `
        <h3>${manual.title}</h3>
        <p>${manual.category} · ${manual.body || "본문 없음"}</p>
        <div class="item-footer">
          <span>${manual.files.length ? manual.files.map((file) => file.name).join(", ") : "첨부 없음"}</span>
          <div class="mini-actions">
            <button class="danger-text" data-delete-manual="${manual.id}">삭제</button>
          </div>
        </div>
      `;
      return node;
    }),
  );
}

function renderSheets() {
  if (!state.sheets.length) {
    const sheet = createSheet("기본 시트", "blank");
    state.sheets.push(sheet);
    state.activeSheetId = sheet.id;
  }

  const active = activeSheet();
  state.activeSheetId = active.id;
  const query = ($("#sheetSearch")?.value || "").trim().toLowerCase();
  const filteredSheets = sortedSheets(query
    ? state.sheets.filter((sheet) => sheet.name.toLowerCase().includes(query))
    : state.sheets);

  $("#activeSheetName").textContent = active.name;
  $("#activeSheetMeta").textContent = `${active.columns.length}열 · ${active.rows.length}행`;
  $("#sheetCount").textContent = `${state.sheets.length}개`;
  $("#sheetQuickSelect").innerHTML = sortedSheets(state.sheets)
    .map((sheet) => `<option value="${sheet.id}" ${sheet.id === active.id ? "selected" : ""}>${escapeHtml(sheet.name)} · ${sheet.rows.length}행</option>`)
    .join("");
  $("#sheetSortMode").value = sheetSortMode;
  $("#sheetTabs").classList.toggle("collapsed", sheetListCollapsed);
  $("#sheetTabs").innerHTML = filteredSheets.length
    ? filteredSheets
        .map(
          (sheet) => `
          <button class="sheet-tab ${sheet.id === active.id ? "active" : ""}" data-sheet-id="${sheet.id}">
            <strong>${escapeHtml(sheet.name)}</strong>
            <span>${sheet.columns.length}열 · ${sheet.rows.length}행</span>
          </button>
        `,
        )
        .join("")
    : '<div class="empty-state">검색 결과가 없습니다.</div>';
  $("#pasteSheetNameField").classList.toggle("hidden", $("#pasteImportMode").value !== "new");
  $(".sheet-wrap").classList.toggle("compact-mode", sheetViewMode === "compact");
  $$(".segmented-control [data-sheet-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sheetView === sheetViewMode);
  });
  renderSelectedCellPreview(active);

  $("#sheetTable").innerHTML = `
    <thead>
      <tr>
        <th class="row-number-cell">#</th>
        ${active.columns.map((column, index) => `<th><div class="sheet-heading" contenteditable data-column-index="${index}" title="${escapeHtml(column)}">${escapeHtml(column)}</div></th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${active.rows
        .map(
          (row, rowIndex) => `
          <tr class="${isSectionRow(row) ? "section-row" : ""}">
            <td class="row-number-cell">${rowIndex + 1}</td>
            ${active.columns
              .map((_, colIndex) => {
                const value = row[colIndex] || "";
                const selected = selectedSheetCell?.rowIndex === rowIndex && selectedSheetCell?.colIndex === colIndex;
                return `<td class="${selected ? "selected-cell" : ""}"><div class="sheet-cell" contenteditable data-row-index="${rowIndex}" data-col-index="${colIndex}" title="${escapeHtml(value)}">${escapeHtml(value)}</div></td>`;
              })
              .join("")}
          </tr>
        `,
        )
        .join("")}
    </tbody>
  `;
}

function renderSelectedCellPreview(sheet) {
  const preview = $("#selectedCellPreview");
  $("#copyCellBtn").disabled = true;
  if (!selectedSheetCell || selectedSheetCell.sheetId !== sheet.id) {
    preview.textContent = "셀을 선택하면 전체 내용이 여기에 표시됩니다.";
    return;
  }

  const column = sheet.columns[selectedSheetCell.colIndex] || `열 ${selectedSheetCell.colIndex + 1}`;
  const value = sheet.rows[selectedSheetCell.rowIndex]?.[selectedSheetCell.colIndex] || "";
  $("#copyCellBtn").disabled = false;
  preview.innerHTML = `<strong>${selectedSheetCell.rowIndex + 1}행 · ${escapeHtml(column)}</strong><span>${escapeHtml(value) || "비어 있음"}</span>`;
}

function filteredCounselors() {
  const keyword = ($("#counselorSearch")?.value || "").trim().toLowerCase();
  const status = $("#counselorStatusFilter")?.value || "전체";
  return counselorReportRows()
    .filter((counselor) => status === "전체" || counselor.currentStatus === status)
    .filter((counselor) => counselorMatches(counselor, keyword));
}

function renderCounselors() {
  const statusSelect = $("#counselorStatusFilter");
  const statuses = counselorStatusOptions();
  const currentStatus = statusSelect.value || "전체";
  statusSelect.innerHTML = statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join("");
  statusSelect.value = statuses.includes(currentStatus) ? currentStatus : "전체";

  const counselors = filteredCounselors();
  const caseCount = state.counselors.length;
  $("#counselorSummary").textContent = `${counselors.length}건 이력 · 관리 케이스 ${caseCount}개`;
  $("#counselorTable").innerHTML = counselors.length
    ? counselors
        .map(
          (counselor) => `
            <tr>
              <td>${escapeHtml(counselor.responsibility || "-")}</td>
              <td>${escapeHtml(counselor.task || "-")}</td>
              <td>${escapeHtml(counselor.field || "-")}</td>
              <td>${escapeHtml(counselor.subField || "-")}</td>
              <td><strong>${escapeHtml(counselor.alias || "-")}</strong><span>${escapeHtml(counselor.registeredAt || "")}</span></td>
              <td>${escapeHtml(counselor.currentStatus || "-")}</td>
              <td>${escapeHtml(counselor.registeredAt || "-")}</td>
              <td>${escapeHtml(counselor.reason || "-")}</td>
              <td>${escapeHtml(counselor.recentHistory || "-")}</td>
              <td>${escapeHtml(counselor.weeklyAction || "-")}</td>
              <td>${escapeHtml(counselor.result || "-")}</td>
              <td>${escapeHtml(counselor.manageCount || "-")}</td>
              <td>
                <div class="mini-actions">
                  <button data-edit-counselor="${counselor.id}">수정</button>
                  <button class="danger-text" data-delete-counselor="${counselor.id}">삭제</button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="13">조건에 맞는 상담사가 없습니다.</td></tr>';
}

function renderWorkReport() {
  const template = state.workReportTemplate;
  const form = $("#workReportForm");
  if (form && !form.contains(document.activeElement)) {
    form.elements.title.value = template.title || "";
    form.elements.managerLine.value = template.managerLine || "";
    form.elements.noticeTitle.value = template.noticeTitle || "";
    form.elements.notices.value = template.notices || "";
    form.elements.counselorSummaryLine.value = template.counselorSummaryLine || "";
  }

  const reportRows = counselorReportRows();
  const statusCounts = reportRows.reduce((acc, counselor) => {
    const status = counselor.currentStatus || "상태 없음";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  $("#workReportSummary").textContent = `관리 이력 ${reportRows.length}건 · 관리 케이스 ${state.counselors.length}개`;
  $("#workReportPreview").innerHTML = `
    <article>
      <h3>${escapeHtml(template.title || "업무보고")}</h3>
      <p>${escapeHtml(template.managerLine || "")}</p>
    </article>
    <article>
      <h3>${escapeHtml(template.noticeTitle || "[전달사항]")}</h3>
      <p>${escapeHtml(template.notices || "").replace(/\n/g, "<br>")}</p>
    </article>
    <article>
      <h3>상담사 관리 요약</h3>
      <p>${escapeHtml(template.counselorSummaryLine || `총 ${state.counselors.length}개 관리 케이스, 금주 ${reportRows.length}건`).replace(/\n/g, "<br>")}</p>
      <div class="summary-chips">
        ${Object.entries(statusCounts).map(([status, count]) => `<span>${escapeHtml(status)} ${count}명</span>`).join("") || "<span>데이터 없음</span>"}
      </div>
    </article>
  `;
}

function renderReports() {
  const reports = visibleReports();
  renderList($("#pendingReports"), reports.filter((report) => report.status === "검토 대기").map(reportItem));
  renderList($("#reportHistory"), reports.filter((report) => report.status !== "검토 대기").map(reportItem));
}

function reportItem(report) {
  const node = document.createElement("article");
  node.className = "item";
  node.innerHTML = `
    <h3>${report.title}</h3>
    <p>${report.body}</p>
    <div class="item-footer">
      <span>${report.reporter} → ${report.reviewer} · ${new Date(report.createdAt).toLocaleDateString("ko-KR")}</span>
      <div class="mini-actions">
        ${statusPill(report.status)}
        <button data-report-approve="${report.id}">확인</button>
        <button data-report-reject="${report.id}">반려</button>
      </div>
    </div>
  `;
  return node;
}

function renderOrg() {
  const users = userMappings.length
    ? userMappings.map((user) => ({ ...user, roleName: roleLabel(user.role) }))
    : getUsers().map((user) => ({ adminId: user.id, name: user.name, roleName: user.role, part: user.part }));
  const teamLeads = users.filter((user) => user.roleName === "팀장");
  const partLeads = users.filter((user) => user.roleName === "파트장");
  const members = users.filter((user) => user.roleName === "파트원");

  $("#orgTree").innerHTML = `
    ${(teamLeads.length ? teamLeads : [{ name: "팀장 미지정", roleName: "팀장", part: "운영팀" }])
      .map(
        (leader) => `
      <div class="org-node">
        <strong>${leader.name} · ${leader.roleName}</strong>
        <span>${leader.part}</span>
        <div class="org-children">
          ${opsParts
            .map(
              (part) => `
            <div class="org-node">
              <strong>${part}</strong>
              <span>파트장: ${partLeads.filter((user) => user.part === part).map((user) => user.name).join(", ") || "미지정"}</span>
              <div class="org-children">
                ${
                  members
                    .filter((user) => user.part === part)
                    .map((member) => `<div class="org-node"><strong>${member.name} · ${member.roleName}</strong><span>${member.part}</span></div>`)
                    .join("") || '<div class="empty-state">파트원이 없습니다.</div>'
                }
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `,
      )
      .join("")}
  `;
}

function renderUserManagement() {
  const isTeamLead = currentUser?.role === "teamLead" || !serverSyncEnabled;
  $("#userForm").style.display = isTeamLead ? "block" : "none";
  $("#refreshUsersBtn").style.display = isTeamLead ? "inline-flex" : "none";

  if (!isTeamLead) {
    $("#userTable").innerHTML = '<tr><td colspan="5">팀장 권한으로만 사용자 권한을 관리할 수 있습니다.</td></tr>';
    return;
  }

  $("#userTable").innerHTML = userMappings.length
    ? userMappings
        .map(
          (user) => `
        <tr>
          <td>${user.adminId}</td>
          <td>${user.name}</td>
          <td>${roleLabel(user.role)}</td>
          <td>${user.part}</td>
          <td>
            <div class="mini-actions">
              <button data-edit-user="${user.adminId}">수정</button>
              <button class="danger-text" data-delete-user="${user.adminId}">삭제</button>
            </div>
          </td>
        </tr>
      `,
        )
        .join("")
    : '<tr><td colspan="5">등록된 사용자가 없습니다.</td></tr>';
}

function statusPill(status) {
  const className = status === "확인 완료" ? "done" : status === "반려" ? "rejected" : "";
  return `<span class="status-pill ${className}">${status}</span>`;
}

function createSheet(name, templateKey) {
  const columns = [...templates[templateKey]];
  return { id: uid("sheet"), name, columns, rows: [columns.map(() => "")] };
}

function createSheetFromTable(name, columns, rows) {
  return {
    id: uid("sheet"),
    name: name || `가져온 시트 ${state.sheets.length + 1}`,
    columns,
    rows: normalizeRows(rows, columns.length),
  };
}

function parsePastedTable(text, useFirstRowAsHeader, keepEmptyRows = true) {
  let lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  if (!keepEmptyRows) {
    lines = lines.filter((line) => line.trim().length);
  } else {
    while (lines.length && !lines[0].trim().length) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim().length) lines.pop();
  }

  if (!lines.length) {
    throw new Error("붙여넣은 표 데이터가 없습니다.");
  }

  const rawRows = lines.map((line) => line.split("\t").map((cell) => cell.replace(/\u00a0/g, " ").trimEnd()));
  const width = Math.max(...rawRows.map((row) => row.length));
  const normalized = normalizeRows(rawRows, width);
  const columns = useFirstRowAsHeader
    ? normalized.shift().map((column, index) => column || `열 ${index + 1}`)
    : Array.from({ length: width }, (_, index) => `열 ${index + 1}`);
  const rows = normalized.length ? normalized : [columns.map(() => "")];

  return { columns, rows: normalizeRows(rows, columns.length) };
}

function counselorFieldFromHeader(header, index) {
  const normalized = String(header || "").replace(/\s/g, "");
  const map = {
    책무: "responsibility",
    과업: "task",
    분야: "field",
    세부분야: "subField",
    예명: "alias",
    상담사: "alias",
    현재상태: "currentStatus",
    상태: "currentStatus",
    등록일: "registeredAt",
    관리사유: "reason",
    최근관리이력: "recentHistory",
    금주관리내용: "weeklyAction",
    관리내용: "weeklyAction",
    관리결과: "result",
    누적관리횟수: "manageCount",
    누적: "manageCount",
    비고: "note",
  };
  return map[normalized] || counselorFields[index] || null;
}

function counselorsFromPastedTable(text, useFirstRowAsHeader) {
  const parsed = parsePastedTable(text, useFirstRowAsHeader, false);
  const fieldMap = parsed.columns.map(counselorFieldFromHeader);
  return parsed.rows
    .map((row) => {
      const counselor = {};
      row.forEach((value, index) => {
        const field = fieldMap[index];
        if (field) counselor[field] = value;
      });
      return normalizeCounselor({ ...counselor, id: uid("counselor") });
    })
    .filter((counselor) => counselor.alias || counselor.weeklyAction || counselor.reason);
}

function resetCounselorForm() {
  $("#counselorForm").reset();
  $("#counselorFormTitle").textContent = "상담사 등록";
}

function fillCounselorForm(counselorId) {
  const raw = state.counselors.find((item) => item.id === counselorId);
  if (!raw) return;

  const counselor = normalizeCounselor(raw);
  const form = $("#counselorForm");
  Object.entries(counselor).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  $("#counselorFormTitle").textContent = "상담사 수정";
}

function normalizeRows(rows, width) {
  return rows.map((row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push("");
    return next;
  });
}

function applyImportedTable({ columns, rows }, mode, name) {
  const sheet = activeSheet();

  if (mode === "new") {
    const importedSheet = createSheetFromTable(name, columns, rows);
    state.sheets.push(importedSheet);
    state.activeSheetId = importedSheet.id;
    return importedSheet;
  }

  if (mode === "replace") {
    sheet.columns = columns;
    sheet.rows = rows;
    return sheet;
  }

  const width = Math.max(sheet.columns.length, columns.length);
  while (sheet.columns.length < width) {
    sheet.columns.push(columns[sheet.columns.length] || `열 ${sheet.columns.length + 1}`);
  }
  sheet.rows = normalizeRows(sheet.rows, width).concat(normalizeRows(rows, width));
  return sheet;
}

function updatePastePreview() {
  const note = $("#pastePreviewNote");
  const text = $("#pasteTableInput").value;
  if (!text.trim()) {
    note.textContent = "";
    return;
  }

  try {
    const parsed = parsePastedTable(text, $("#useFirstRowAsHeader").checked, $("#keepEmptyRows").checked);
    const emptyRows = parsed.rows.filter((row) => row.every((cell) => !String(cell || "").trim())).length;
    note.textContent = `미리보기: ${parsed.columns.length}열 · ${parsed.rows.length}행${emptyRows ? ` · 빈 행 ${emptyRows}개 포함` : ""}`;
  } catch (error) {
    note.textContent = error.message || "표 데이터를 확인해주세요.";
  }
}

function selectedCellValue() {
  if (!selectedSheetCell) return "";
  const sheet = activeSheet();
  if (selectedSheetCell.sheetId !== sheet.id) return "";
  return sheet.rows[selectedSheetCell.rowIndex]?.[selectedSheetCell.colIndex] || "";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function nextReviewer(task) {
  const part = state.org.parts.find((item) => item.id === task.part);
  if (state.activeRole === "member") return part?.lead.name || state.org.teamLead.name;
  return state.org.teamLead.name;
}

function bindEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      activateView(button.dataset.view);
    });
  });

  $("#roleSelect").addEventListener("change", (event) => {
    if (currentUser) {
      event.target.value = currentUser.role;
      return;
    }

    state.activeRole = event.target.value;
    renderAll();
  });

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#loginError").textContent = "";

    const data = Object.fromEntries(new FormData(event.target));
    const submitButton = event.target.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "확인 중";

    try {
      const response = await fetch(AUTH_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(payload.error || "로그인에 실패했습니다.");
      }

      currentUser = payload.user;
      event.target.reset();
      await loadUsers();
      await hydrateFromServer();
      showAuthenticatedApp();
    } catch (error) {
      $("#loginError").textContent = error.message || "로그인에 실패했습니다.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "로그인";
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    if (serverSyncEnabled) {
      await fetch(AUTH_LOGOUT_URL, { method: "POST" });
    }

    currentUser = null;
    $("#sessionUser").textContent = "";
    $("#roleSelect").disabled = false;
    showLogin();
  });

  $("#dutyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const existingDuty = state.duties.find((item) => item.id === data.id);
    const payload = { ...data };

    if (data.id && existingDuty) {
      state.duties = state.duties.map((duty) => (duty.id === data.id ? { ...normalizeDuty(duty), ...payload } : duty));
      renderDutyDetail(data.id);
    } else {
      const next = { ...payload, id: uid("duty") };
      state.duties.push(next);
      renderDutyDetail(next.id);
    }

    resetDutyForm();
    renderAll();
  });

  $("#cancelDutyEditBtn").addEventListener("click", resetDutyForm);

  $("#taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!canCreateTasks()) {
      alert("업무 배정 권한이 없습니다.");
      return;
    }

    const data = Object.fromEntries(new FormData(event.target));
    const assignee = getUsers().find((user) => user.id === data.assignee);
    if (!assignee || !canAssignTo(assignee)) {
      alert("현재 권한으로 배정할 수 없는 담당자입니다.");
      return;
    }

    const assigner = getRoleUser();
    state.tasks.push({
      id: uid("task"),
      title: data.title,
      assignee: assignee.id,
      assigneeName: assignee.name,
      part: assignee.part,
      priority: data.priority,
      dueDate: data.dueDate,
      memo: data.memo,
      status: "대기",
      assigner: assigner.name,
      assignerId: assigner.id,
      assignerRole: state.activeRole,
      createdAt: new Date().toISOString(),
      reports: [],
    });
    event.target.reset();
    renderAll();
  });

  $("#counselorForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const payload = normalizeCounselor(data);

    if (data.id && state.counselors.some((item) => item.id === data.id)) {
      state.counselors = state.counselors.map((counselor) => {
        if (counselor.id !== data.id) return counselor;
        const current = normalizeCounselor(counselor);
        current.history[current.history.length - 1] = payload.history[0];
        return normalizeCounselor(current);
      });
    } else {
      state.counselors = mergeCounselors(state.counselors, [payload]);
    }

    resetCounselorForm();
    renderAll();
  });

  $("#cancelCounselorEditBtn").addEventListener("click", resetCounselorForm);
  $("#counselorSearch").addEventListener("input", renderCounselors);
  $("#counselorStatusFilter").addEventListener("change", renderCounselors);
  $("#clearCounselorPasteBtn").addEventListener("click", () => {
    $("#counselorPasteInput").value = "";
    $("#counselorImportNote").textContent = "";
  });
  $("#importCounselorReportBtn").addEventListener("click", async () => {
    const file = $("#counselorReportImportInput").files[0];
    const note = $("#counselorImportNote");
    if (!file) {
      note.textContent = "불러올 업무보고 엑셀 파일을 선택해주세요.";
      return;
    }

    note.textContent = "업무보고에서 상담사 관리 이력을 읽는 중입니다.";
    try {
      const response = await fetch(COUNSELOR_REPORT_IMPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          content: await fileToBase64(file),
        }),
      });
      const payload = await readResponseBody(response);
      if (!response.ok) throw new Error(payload.error || "업무보고 불러오기에 실패했습니다.");

      state.counselors = mergeCounselors(state.counselors, payload.counselors || []);
      $("#counselorReportImportInput").value = "";
      note.textContent = `${payload.importedCount || 0}건 이력을 불러왔습니다. 누적관리 횟수를 자동 반영했습니다.`;
      renderAll();
    } catch (error) {
      note.textContent = error.message || "업무보고 불러오기에 실패했습니다.";
    }
  });
  $("#importCounselorsBtn").addEventListener("click", () => {
    const note = $("#counselorImportNote");
    try {
      const imported = counselorsFromPastedTable($("#counselorPasteInput").value, $("#counselorFirstRowHeader").checked);
      if (!imported.length) throw new Error("가져올 상담사 데이터가 없습니다.");
      if ($("#replaceCounselorsOnImport").checked && !confirm("기존 상담사 목록을 비우고 가져올까요?")) return;
      state.counselors = mergeCounselors(state.counselors, imported, $("#replaceCounselorsOnImport").checked);
      $("#counselorPasteInput").value = "";
      note.textContent = `${imported.length}건 상담사 관리 이력을 가져왔습니다.`;
      renderAll();
    } catch (error) {
      note.textContent = error.message || "상담사 데이터를 확인해주세요.";
    }
  });

  $("#workReportForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.workReportTemplate = { ...state.workReportTemplate, ...Object.fromEntries(new FormData(event.target)) };
    $("#workReportNote").textContent = "업무보고 설정을 저장했습니다.";
    renderAll();
  });

  $("#downloadWorkReportBtn").addEventListener("click", async () => {
    const note = $("#workReportNote");
    state.workReportTemplate = { ...state.workReportTemplate, ...Object.fromEntries(new FormData($("#workReportForm"))) };
    renderAll();
    note.textContent = "업무보고 엑셀을 생성 중입니다.";
    try {
      const response = await fetch(WORK_REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: state.workReportTemplate,
          counselors: state.counselors.map(normalizeCounselor),
          reportRows: counselorReportRows(),
        }),
      });
      if (!response.ok) {
        const payload = await readResponseBody(response);
        throw new Error(payload.error || "업무보고 생성에 실패했습니다.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `업무보고_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      note.textContent = "업무보고 엑셀을 다운로드했습니다.";
    } catch (error) {
      note.textContent = error.message || "업무보고 생성에 실패했습니다.";
    }
  });

  $("#userForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = $("#userFormNote");
    note.classList.remove("error");
    note.textContent = "저장 중입니다.";

    try {
      const data = Object.fromEntries(new FormData(event.target));
      await saveUserMapping(data);
      event.target.reset();
      note.textContent = "저장되었습니다.";
      renderAll();
    } catch (error) {
      note.classList.add("error");
      note.textContent = error.message || "저장에 실패했습니다.";
    }
  });

  $("#refreshUsersBtn").addEventListener("click", async () => {
    await loadUsers();
    renderAll();
  });

  $("#knowledgeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.knowledge.push({ id: uid("knowledge"), ...data, completedBy: [] });
    event.target.reset();
    renderAll();
  });

  $("#manualForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));
    const files = [...form.elements.files.files].map((file) => ({ name: file.name, size: file.size }));
    state.manuals.push({ id: uid("manual"), title: data.title, category: data.category, body: data.body, files, createdAt: new Date().toISOString() });
    form.reset();
    renderAll();
  });

  $("#sheetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const sheet = createSheet(data.name, data.template);
    state.sheets.push(sheet);
    state.activeSheetId = sheet.id;
    event.target.reset();
    renderAll();
  });

  $("#sheetListToggle").addEventListener("click", () => {
    sheetListCollapsed = !sheetListCollapsed;
    $("#sheetListToggle").textContent = sheetListCollapsed ? "시트 목록 펼치기" : "시트 목록";
    renderSheets();
  });

  $("#sheetQuickSelect").addEventListener("change", (event) => {
    state.activeSheetId = event.target.value;
    selectedSheetCell = null;
    renderAll();
  });

  $("#sheetSortMode").addEventListener("change", (event) => {
    sheetSortMode = event.target.value;
    renderSheets();
  });

  $("#sheetSearch").addEventListener("input", renderSheets);

  $$(".segmented-control [data-sheet-view]").forEach((button) => {
    button.addEventListener("click", () => {
      sheetViewMode = button.dataset.sheetView;
      renderSheets();
    });
  });

  $("#renameSheetBtn").addEventListener("click", () => {
    const sheet = activeSheet();
    const name = prompt("새 시트명을 입력해주세요.", sheet.name);
    if (!name?.trim()) return;
    sheet.name = name.trim();
    renderAll();
  });

  $("#duplicateSheetBtn").addEventListener("click", () => {
    const sheet = activeSheet();
    const copy = {
      id: uid("sheet"),
      name: `${sheet.name} 복사본`,
      columns: [...sheet.columns],
      rows: sheet.rows.map((row) => [...row]),
    };
    state.sheets.push(copy);
    state.activeSheetId = copy.id;
    renderAll();
  });

  $("#deleteSheetBtn").addEventListener("click", () => {
    if (state.sheets.length <= 1) {
      alert("마지막 시트는 삭제할 수 없습니다.");
      return;
    }

    const sheet = activeSheet();
    if (!confirm(`${sheet.name} 시트를 삭제할까요?`)) return;
    state.sheets = state.sheets.filter((item) => item.id !== sheet.id);
    state.activeSheetId = state.sheets[0].id;
    renderAll();
  });

  $("#addColumnBtn").addEventListener("click", () => {
    const sheet = activeSheet();
    sheet.columns.push(`열 ${sheet.columns.length + 1}`);
    sheet.rows = sheet.rows.map((row) => [...row, ""]);
    renderAll();
  });

  $("#addRowBtn").addEventListener("click", () => {
    const sheet = activeSheet();
    sheet.rows.push(sheet.columns.map(() => ""));
    renderAll();
  });

  $("#pasteImportMode").addEventListener("change", renderSheets);
  $("#pasteTableInput").addEventListener("input", updatePastePreview);
  $("#useFirstRowAsHeader").addEventListener("change", updatePastePreview);
  $("#keepEmptyRows").addEventListener("change", updatePastePreview);

  $("#clearPasteBtn").addEventListener("click", () => {
    $("#pasteTableInput").value = "";
    $("#pastePreviewNote").textContent = "";
    $("#pasteImportNote").textContent = "";
  });

  $("#copyCellBtn").addEventListener("click", async () => {
    const value = selectedCellValue();
    if (!selectedSheetCell) return;

    try {
      await navigator.clipboard.writeText(value);
      $("#selectedCellPreview").classList.add("copied");
      setTimeout(() => $("#selectedCellPreview").classList.remove("copied"), 900);
    } catch {
      alert("브라우저에서 복사를 허용하지 않았습니다. 셀 내용을 직접 선택해서 복사해주세요.");
    }
  });

  $("#importPasteBtn").addEventListener("click", () => {
    const note = $("#pasteImportNote");
    note.classList.remove("error");

    try {
      const parsed = parsePastedTable($("#pasteTableInput").value, $("#useFirstRowAsHeader").checked, $("#keepEmptyRows").checked);
      const mode = $("#pasteImportMode").value;
      const name = $("#pasteSheetName").value.trim();
      if (mode === "replace" && !confirm(`현재 시트의 기존 데이터를 ${parsed.columns.length}열 · ${parsed.rows.length}행 데이터로 덮어쓸까요?`)) {
        return;
      }
      const result = applyImportedTable(parsed, mode, name);
      note.textContent = `${result.name}에 ${parsed.rows.length}행을 가져왔습니다.`;
      $("#pasteTableInput").value = "";
      $("#pastePreviewNote").textContent = "";
      renderAll();
    } catch (error) {
      note.classList.add("error");
      note.textContent = error.message || "가져오기에 실패했습니다.";
    }
  });

  $("#manualSearch").addEventListener("input", renderManuals);
  $("#taskFilter").addEventListener("change", renderTasks);
  $("#archiveMonthFilter").addEventListener("change", renderTaskArchive);
  $("#dutyFilter").addEventListener("change", renderDuties);
  $("#dutySearch").addEventListener("input", renderDuties);

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hongcafe-ops-worklog.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("#importInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = mergeDefaultState(JSON.parse(reader.result));
        renderAll();
      } catch {
        alert("가져오기 파일을 확인해주세요.");
      }
    };
    reader.readAsText(file);
  });

  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("저장된 업무 데이터를 초기화할까요?")) return;
    state = clone(defaultData);
    renderAll();
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const sheetButton = target.closest("[data-sheet-id]");
    const sheetId = sheetButton?.dataset.sheetId;
    if (sheetId) {
      state.activeSheetId = sheetId;
      selectedSheetCell = null;
      renderAll();
      return;
    }

    if (target.classList.contains("sheet-cell")) {
      selectedSheetCell = {
        sheetId: state.activeSheetId,
        rowIndex: Number(target.dataset.rowIndex),
        colIndex: Number(target.dataset.colIndex),
      };
      renderSelectedCellPreview(activeSheet());
      $$("#sheetTable td").forEach((cell) => cell.classList.remove("selected-cell"));
      target.closest("td")?.classList.add("selected-cell");
      return;
    }

    const viewDutyId = target.dataset.viewDuty || target.closest("[data-duty-row]")?.dataset.dutyRow;
    if (viewDutyId && !target.dataset.editDuty && !target.dataset.deleteDuty) {
      renderDutyDetail(viewDutyId);
      return;
    }

    const editDutyId = target.dataset.editDuty;
    if (editDutyId) {
      fillDutyForm(editDutyId);
      return;
    }

    const editCounselorId = target.dataset.editCounselor;
    if (editCounselorId) {
      fillCounselorForm(editCounselorId);
      return;
    }

    const taskId = target.dataset.taskNext;
    if (taskId) {
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task || !canUpdateTask(normalizeTask(task))) return;
      const index = statusFlow.indexOf(task.status);
      task.status = statusFlow[(index + 1) % statusFlow.length];
      if (task.status === "확인 완료") {
        markTaskArchived(task);
      } else {
        clearTaskArchive(task);
      }
      renderAll();
      return;
    }

    const reportTaskId = target.dataset.taskReport;
    if (reportTaskId) {
      const task = state.tasks.find((item) => item.id === reportTaskId);
      if (!task || !canReportTask(normalizeTask(task))) return;
      const body = prompt("보고 내용을 입력해주세요.", task.memo || "");
      if (!body) return;
      task.status = "완료 보고";
      state.reports.push({
        id: uid("report"),
        taskId: task.id,
        title: task.title,
        reporter: task.assigneeName,
        reviewer: nextReviewer(task),
        body,
        status: "검토 대기",
        createdAt: new Date().toISOString(),
      });
      renderAll();
      return;
    }

    const knowledgeId = target.dataset.knowledgeDone;
    if (knowledgeId) {
      const item = state.knowledge.find((entry) => entry.id === knowledgeId);
      const userId = getRoleUser().id;
      if (!item.completedBy.includes(userId)) item.completedBy.push(userId);
      renderAll();
      return;
    }

    const editUserId = target.dataset.editUser;
    if (editUserId) {
      const user = userMappings.find((item) => item.adminId === editUserId);
      if (!user) return;
      const form = $("#userForm");
      form.elements.adminId.value = user.adminId;
      form.elements.name.value = user.name;
      form.elements.role.value = user.role;
      form.elements.part.value = user.part;
      $("#userFormNote").textContent = "수정 후 저장을 누르면 반영됩니다.";
      return;
    }

    const deleteUserId = target.dataset.deleteUser;
    if (deleteUserId) {
      if (!confirm(`${deleteUserId} 권한을 삭제할까요?`)) return;
      try {
        await deleteUserMapping(deleteUserId);
        renderAll();
      } catch (error) {
        alert(error.message || "삭제에 실패했습니다.");
      }
      return;
    }

    const approveId = target.dataset.reportApprove;
    if (approveId) {
      const report = state.reports.find((item) => item.id === approveId);
      report.status = "확인 완료";
      report.reviewedAt = new Date().toISOString();
      const task = state.tasks.find((item) => item.id === report.taskId);
      if (task) {
        task.status = "확인 완료";
        markTaskArchived(task);
      }
      renderAll();
      return;
    }

    const rejectId = target.dataset.reportReject;
    if (rejectId) {
      const report = state.reports.find((item) => item.id === rejectId);
      report.status = "반려";
      report.reviewedAt = new Date().toISOString();
      const task = state.tasks.find((item) => item.id === report.taskId);
      if (task) {
        task.status = "반려";
        clearTaskArchive(task);
      }
      renderAll();
      return;
    }

    deleteByDataset(target);
  });

  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const sheet = state.sheets.find((item) => item.id === state.activeSheetId);
    if (!sheet) return;

    if (target.dataset.columnIndex) {
      sheet.columns[Number(target.dataset.columnIndex)] = target.textContent.trimEnd() || "이름 없음";
      saveState();
      return;
    }

    if (target.dataset.rowIndex && target.dataset.colIndex) {
      sheet.rows[Number(target.dataset.rowIndex)][Number(target.dataset.colIndex)] = target.textContent.trimEnd();
      saveState();
    }
  });
}

function deleteByDataset(target) {
  const maps = [
    ["deleteDuty", "duties"],
    ["deleteTask", "tasks"],
    ["deleteCounselor", "counselors"],
    ["deleteKnowledge", "knowledge"],
    ["deleteManual", "manuals"],
  ];
  const match = maps.find(([datasetKey]) => target.dataset[datasetKey]);
  if (!match) return;
  const [datasetKey, collection] = match;
  state[collection] = state[collection].filter((item) => item.id !== target.dataset[datasetKey]);
  renderAll();
}

initApp();
