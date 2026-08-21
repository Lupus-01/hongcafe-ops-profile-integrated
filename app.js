const STORAGE_KEY = "hongcafe_ops_worklog_v1";
const SERVER_STATE_URL = "/api/state";
const AUTH_LOGIN_URL = "/api/auth/login";
const AUTH_ME_URL = "/api/auth/me";
const AUTH_LOGOUT_URL = "/api/auth/logout";
const USERS_URL = "/api/users";

const statusFlow = ["대기", "진행중", "완료 보고", "확인 완료", "반려"];
const activeTaskStatuses = ["대기", "진행중", "완료 보고", "반려"];
const opsParts = ["운영 1파트", "운영 2파트", "운영 3파트"];
const legacyPartMap = {
  섭외파트: "운영 1파트",
  콘텐츠파트: "운영 2파트",
  CS파트: "운영 3파트",
};

const defaultData = {
  activeRole: "teamLead",
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

function normalizePart(part) {
  const value = String(part || "").trim();
  if (!value) return "운영 1파트";
  if (value === "운영팀") return "운영팀";
  if (opsParts.includes(value)) return value;
  if (legacyPartMap[value]) return legacyPartMap[value];
  return value;
}

function partForRole(role, part) {
  return role === "teamLead" ? "운영팀" : normalizePart(part);
}

function mergeDefaultState(saved) {
  const base = clone(defaultData);
  return {
    ...base,
    ...saved,
    org: { ...base.org, ...(saved?.org || {}) },
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
  if (!serverSyncEnabled || !["teamLead", "partLead"].includes(currentUser?.role)) return;

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

  currentUser.part = partForRole(currentUser.role, currentUser.part);
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


function getUsers() {
  if (userMappings.length) {
    return userMappings.map((user) => ({
      id: user.adminId,
      name: user.name,
      role: roleLabel(user.role),
      part: partForRole(user.role, user.part),
    }));
  }

  return [
    state.org.teamLead,
    ...state.org.parts.flatMap((part) => [part.lead, ...part.members]),
  ].map((user) => ({ ...user, part: partForRole(user.role === "팀장" ? "teamLead" : user.role === "파트장" ? "partLead" : "member", user.part) }));
}

function getRoleUser() {
  if (currentUser) {
    return {
      id: currentUser.adminId,
      name: currentUser.name,
      role: roleLabel(currentUser.role),
      part: partForRole(currentUser.role, currentUser.part),
    };
  }

  if (state.activeRole === "teamLead") return { ...state.org.teamLead, part: "운영팀" };
  if (state.activeRole === "partLead") return { ...state.org.parts[0].lead, part: "운영 1파트" };
  return { ...state.org.parts[0].members[0], part: "운영 1파트" };
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
  renderTasks();
  renderTaskArchive();
  renderReports();
  renderOrg();
  renderUserManagement();
}

function fillSelects() {
  const allUsers = getUsers();
  const assignableUsers = allUsers.filter(canAssignTo);
  const userOptions = assignableUsers.length
    ? assignableUsers.map((user) => `<option value="${user.id}">${user.name} · ${user.role} · ${user.part}</option>`).join("")
    : '<option value="">배정 가능 대상 없음</option>';

  $("select[name='assignee']").innerHTML = userOptions;
}

function renderMetrics() {
  const tasks = visibleTasks();
  const reports = visibleReports();
  const metrics = [
    ["진행 업무", tasks.filter((task) => task.status === "진행중").length],
    ["완료 보고", tasks.filter((task) => task.status === "완료 보고").length],
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

function renderTasks() {
  const filter = $("#taskFilter").value;
  const current = getRoleUser();
  const assignPanel = $("#taskForm");
  assignPanel.hidden = !canCreateTasks();
  $(".task-workspace").classList.toggle("no-assignment", !canCreateTasks());
  $("#taskAssignNote").textContent = canCreateTasks()
    ? state.activeRole === "teamLead"
      ? "팀장은 운영팀 전체의 파트장과 파트원에게 업무를 배정할 수 있습니다."
      : "파트장은 자기 파트의 파트원에게 업무를 배정할 수 있습니다."
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
    ? userMappings.map((user) => ({ ...user, roleName: roleLabel(user.role), part: partForRole(user.role, user.part) }))
    : getUsers().map((user) => ({ adminId: user.id, name: user.name, roleName: user.role, part: user.part }));
  const teamLeads = users.filter((user) => user.roleName === "팀장");
  const teamLeadNodes = teamLeads.length
    ? teamLeads.map((leader) => `<div class="org-node"><strong>${escapeHtml(leader.name)} · 팀장</strong><span>운영팀 총괄</span></div>`).join("")
    : '<div class="org-node"><strong>팀장 미지정</strong><span>운영팀 총괄</span></div>';
  const partNodes = opsParts
    .map((part) => {
      const partLeads = users.filter((user) => user.roleName === "파트장" && user.part === part);
      const members = users.filter((user) => user.roleName === "파트원" && user.part === part);
      const partLeadNodes = partLeads.length
        ? partLeads.map((leader) => `<div class="org-node"><strong>${escapeHtml(leader.name)} · 파트장</strong><span>${escapeHtml(part)}</span></div>`).join("")
        : '<div class="empty-state">파트장이 없습니다.</div>';
      const memberNodes = members.length
        ? members.map((member) => `<div class="org-node"><strong>${escapeHtml(member.name)} · 파트원</strong><span>${escapeHtml(part)}</span></div>`).join("")
        : '<div class="empty-state">파트원이 없습니다.</div>';
      return `
        <div class="org-node">
          <strong>${escapeHtml(part)}</strong>
          <span>파트장은 해당 파트의 파트원에게 업무를 배정할 수 있습니다.</span>
          <div class="org-children">
            <div class="org-node">
              <strong>파트장</strong>
              <span>${escapeHtml(part)}</span>
              <div class="org-children">${partLeadNodes}</div>
            </div>
            <div class="org-node">
              <strong>파트원</strong>
              <span>${escapeHtml(part)}</span>
              <div class="org-children">${memberNodes}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  $("#orgTree").innerHTML = `
    <div class="org-node">
      <strong>운영팀</strong>
      <span>팀장은 별도 파트 없이 운영팀 전체 업무를 관리합니다.</span>
      <div class="org-children">
        ${teamLeadNodes}
        ${partNodes}
      </div>
    </div>
  `;
}

function renderUserManagement() {
  const isTeamLead = currentUser?.role === "teamLead" || !serverSyncEnabled;
  const canManageUsers = isTeamLead || currentUser?.role === "partLead";
  $("#userForm").style.display = canManageUsers ? "block" : "none";
  $("#refreshUsersBtn").style.display = canManageUsers ? "inline-flex" : "none";
  syncUserPartField();

  if (!canManageUsers) {
    $("#userTable").innerHTML = '<tr><td colspan="5">팀장 또는 파트장 권한으로만 조직/권한을 확인할 수 있습니다.</td></tr>';
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
          <td>${partForRole(user.role, user.part)}</td>
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

function syncUserPartField() {
  const form = $("#userForm");
  if (!form) return;
  const role = form.elements.role.value;
  const current = normalizePart(form.elements.part.value);
  if (role === "teamLead") {
    form.elements.part.innerHTML = '<option value="운영팀">운영팀</option>';
    form.elements.part.value = "운영팀";
    form.elements.part.disabled = true;
    return;
  }

  form.elements.part.innerHTML = opsParts.map((part) => `<option value="${part}">${part}</option>`).join("");
  form.elements.part.value = opsParts.includes(current) ? current : "운영 1파트";
  form.elements.part.disabled = false;
}

function statusPill(status) {
  const className = status === "확인 완료" ? "done" : status === "반려" ? "rejected" : "";
  return `<span class="status-pill ${className}">${status}</span>`;
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

  $("#userForm").elements.role.addEventListener("change", syncUserPartField);

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


  $("#userForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = $("#userFormNote");
    note.classList.remove("error");
    note.textContent = "저장 중입니다.";

    try {
      const data = Object.fromEntries(new FormData(event.target));
      data.part = partForRole(data.role, data.part);
      await saveUserMapping(data);
      event.target.reset();
      syncUserPartField();
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

  $("#taskFilter").addEventListener("change", renderTasks);
  $("#archiveMonthFilter").addEventListener("change", renderTaskArchive);

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

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;


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


    const editUserId = target.dataset.editUser;
    if (editUserId) {
      const user = userMappings.find((item) => item.adminId === editUserId);
      if (!user) return;
      const form = $("#userForm");
      form.elements.adminId.value = user.adminId;
      form.elements.name.value = user.name;
      form.elements.role.value = user.role;
      syncUserPartField();
      form.elements.part.value = partForRole(user.role, user.part);
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

}

function deleteByDataset(target) {
  const maps = [
    ["deleteTask", "tasks"],
  ];
  const match = maps.find(([datasetKey]) => target.dataset[datasetKey]);
  if (!match) return;
  const [datasetKey, collection] = match;
  state[collection] = state[collection].filter((item) => item.id !== target.dataset[datasetKey]);
  renderAll();
}

initApp();
