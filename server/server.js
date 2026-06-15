const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ExcelJS = require("exceljs");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const TEMPLATE_DIR = path.join(__dirname, "templates");
const DATA_FILE = path.join(DATA_DIR, "state.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const WORK_REPORT_TEMPLATE = path.join(TEMPLATE_DIR, "work-report-template.xlsx");
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_COOKIE = "ops_session";

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const LEGACY_LOGIN_URL = process.env.LEGACY_LOGIN_URL || "https://hongcafe.peoplev.co.kr/admin";
const LEGACY_LOGIN_POST_URL = process.env.LEGACY_LOGIN_POST_URL || new URL("/api/admin/loginadmin", LEGACY_LOGIN_URL).toString();
const LEGACY_USERNAME_FIELD = process.env.LEGACY_USERNAME_FIELD || "admin_id";
const LEGACY_PASSWORD_FIELD = process.env.LEGACY_PASSWORD_FIELD || "password";
const LEGACY_SUCCESS_TEXT = process.env.LEGACY_SUCCESS_TEXT || "";
const LEGACY_FAILURE_TEXT = process.env.LEGACY_FAILURE_TEXT || "";
const LEGACY_EXTRA_FIELDS = parseExtraFields(process.env.LEGACY_EXTRA_FIELDS);
const AUTH_BYPASS = process.env.AUTH_BYPASS === "true";

const sessions = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

ensureStorage();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        service: "hongcafe-ops-worklog",
        storage: path.relative(ROOT_DIR, DATA_FILE),
        authBypass: AUTH_BYPASS,
        time: new Date().toISOString(),
      });
      return;
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      const user = await loginUser(body);
      const sessionId = createSession(user);
      setSessionCookie(res, sessionId);
      sendJson(res, 200, { user });
      return;
    }

    if (url.pathname === "/api/auth/me" && req.method === "GET") {
      const user = getSessionUser(req);
      if (!user) {
        sendJson(res, 401, { error: "Login required." });
        return;
      }
      sendJson(res, 200, { user });
      return;
    }

    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      const sessionId = getCookie(req, SESSION_COOKIE);
      if (sessionId) sessions.delete(sessionId);
      clearSessionCookie(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/users" && req.method === "GET") {
      if (!ensureTeamLead(req, res)) return;
      sendJson(res, 200, { users: readUsers().map(sanitizeUser) });
      return;
    }

    if (url.pathname === "/api/users" && req.method === "POST") {
      if (!ensureTeamLead(req, res)) return;
      const body = await readJsonBody(req);
      const user = saveUserMapping(body);
      sendJson(res, 201, { user });
      return;
    }

    if (url.pathname.startsWith("/api/users/") && req.method === "DELETE") {
      if (!ensureTeamLead(req, res)) return;
      const adminId = decodeURIComponent(url.pathname.replace("/api/users/", ""));
      deleteUserMapping(adminId, getSessionUser(req));
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/state" && req.method === "GET") {
      if (!ensureAuthenticated(req, res)) return;
      sendJson(res, 200, readState());
      return;
    }

    if (url.pathname === "/api/state" && req.method === "PUT") {
      if (!ensureAuthenticated(req, res)) return;
      const body = await readJsonBody(req);
      const saved = writeState(body);
      sendJson(res, 200, saved);
      return;
    }

    if (url.pathname === "/api/reports/import-counselors" && req.method === "POST") {
      if (!ensureAuthenticated(req, res)) return;
      const body = await readJsonBody(req, 15 * 1024 * 1024);
      const counselors = await importCounselorsFromWorkbook(body);
      sendJson(res, 200, { counselors, importedCount: counselors.length });
      return;
    }

    if (url.pathname === "/api/reports/work-report.xlsx" && req.method === "POST") {
      if (!ensureAuthenticated(req, res)) return;
      const body = await readJsonBody(req, 5 * 1024 * 1024);
      const buffer = await createWorkReportWorkbook(body);
      const fileName = encodeURIComponent(`업무보고_${new Date().toISOString().slice(0, 10)}.xlsx`);
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[".xlsx"],
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
        "Content-Length": buffer.length,
      });
      res.end(buffer);
      return;
    }

    if (url.pathname === "/api/uploads" && req.method === "POST") {
      if (!ensureAuthenticated(req, res)) return;
      const body = await readJsonBody(req, 10 * 1024 * 1024);
      const uploaded = writeBase64File(body);
      sendJson(res, 201, uploaded);
      return;
    }

    if (url.pathname.startsWith("/uploads/") && req.method === "GET") {
      if (!ensureAuthenticated(req, res)) return;
      serveUpload(url.pathname, res);
      return;
    }

    if (url.pathname.startsWith("/vendor/html2canvas/") && req.method === "GET") {
      serveHtml2Canvas(url.pathname, res);
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Internal server error",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HongCafe Ops server running at http://${HOST}:${PORT}`);
});

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ version: 1, savedAt: null, state: null }, null, 2));
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
}

function readState() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeState(state) {
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    state,
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function writeBase64File(body) {
  if (!body || typeof body.name !== "string" || typeof body.content !== "string") {
    throw badRequest("name and content are required.");
  }

  const originalName = path.basename(body.name);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${baseName}${ext}`;
  const buffer = Buffer.from(body.content, "base64");
  const filePath = path.join(UPLOAD_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  return {
    name: originalName,
    storedName: fileName,
    size: buffer.length,
    url: `/uploads/${fileName}`,
    uploadedAt: new Date().toISOString(),
  };
}

async function createWorkReportWorkbook(body) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORK_REPORT_TEMPLATE);
  const sheet = workbook.getWorksheet("업무보고") || workbook.worksheets[0];
  const template = body?.template || {};
  const reportRows = Array.isArray(body?.reportRows) ? body.reportRows : reportRowsFromCounselors(body?.counselors || []);
  const startRow = 21;
  const baseCapacity = 34;
  const extraRows = Math.max(reportRows.length - baseCapacity, 0);

  if (extraRows) {
    sheet.duplicateRow(startRow + baseCapacity - 1, extraRows, true);
  }

  safeSetCell(sheet, "B2", template.title || "업무보고");
  safeSetCell(sheet, "B6", template.managerLine || "");
  safeSetCell(sheet, "B8", template.noticeTitle || "[전달사항]");
  safeSetCell(sheet, "B9", template.notices || "");

  const summaryCell = findCellContaining(sheet, "총 00명") || `B${125 + extraRows}`;
  safeSetCell(sheet, summaryCell, template.counselorSummaryLine || `${new Date().getMonth() + 1}월 총 ${reportRows.length}명, 금주 ${reportRows.length}명`);

  for (let index = 0; index < Math.max(reportRows.length, baseCapacity); index += 1) {
    clearReportRow(sheet, startRow + index);
  }

  reportRows.forEach((entry, index) => {
    const row = startRow + index;
    safeSetCell(sheet, `B${row}`, entry.responsibility || "상담사 모니터링");
    safeSetCell(sheet, `C${row}`, entry.task || "정산시간/접속시간/부재중/매출/후기/1:1문의");
    safeSetCell(sheet, `D${row}`, entry.field || "");
    safeSetCell(sheet, `E${row}`, entry.subField || "");
    safeSetCell(sheet, `F${row}`, entry.alias || "");
    safeSetCell(sheet, `G${row}`, entry.currentStatus || "");
    safeSetCell(sheet, `H${row}`, entry.registeredAt || "");
    safeSetCell(sheet, `I${row}`, entry.reason || "");
    safeSetCell(sheet, `J${row}`, entry.recentHistory || "");
    safeSetCell(sheet, `K${row}`, entry.weeklyAction || "");
    safeSetCell(sheet, `L${row}`, entry.result || "");
    safeSetCell(sheet, `M${row}`, entry.manageCount || "");
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function importCounselorsFromWorkbook(body) {
  if (!body || typeof body.content !== "string") {
    throw badRequest("content is required.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(body.content, "base64"));
  const sheet = workbook.getWorksheet("업무보고") || workbook.worksheets[0];
  const headerRow = findCounselorHeaderRow(sheet);
  if (!headerRow) return [];

  const importedAt = new Date().toISOString();
  const sourceName = path.basename(body.name || "업무보고.xlsx");
  const counselors = [];
  const carry = {
    responsibility: "",
    task: "",
    field: "",
    subField: "",
  };

  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    if (rowNumber > headerRow + 1 && isNextReportSection(sheet, rowNumber)) break;

    carry.responsibility = cellText(sheet, `B${rowNumber}`) || carry.responsibility;
    carry.task = cellText(sheet, `C${rowNumber}`) || carry.task;
    carry.field = cellText(sheet, `D${rowNumber}`) || carry.field;
    carry.subField = cellText(sheet, `E${rowNumber}`) || carry.subField;

    const history = {
      responsibility: carry.responsibility || "상담사 모니터링",
      task: carry.task || "정산시간/접속시간/부재중/매출/후기/1:1문의",
      field: carry.field,
      subField: carry.subField,
      alias: cellText(sheet, `F${rowNumber}`),
      currentStatus: cellText(sheet, `G${rowNumber}`),
      registeredAt: cellText(sheet, `H${rowNumber}`),
      reason: cellText(sheet, `I${rowNumber}`),
      recentHistory: cellText(sheet, `J${rowNumber}`),
      weeklyAction: cellText(sheet, `K${rowNumber}`),
      result: cellText(sheet, `L${rowNumber}`),
      manageCount: cellText(sheet, `M${rowNumber}`),
      manageCountRaw: cellText(sheet, `M${rowNumber}`),
      sourceName,
      sourceRow: rowNumber,
      importedAt,
    };

    if (!history.alias && !history.weeklyAction && !history.reason) continue;
    counselors.push({
      id: `counselor-${crypto.randomBytes(6).toString("hex")}`,
      ...history,
      history: [history],
    });
  }

  return counselors;
}

function reportRowsFromCounselors(counselors) {
  return (Array.isArray(counselors) ? counselors : []).flatMap((counselor) => {
    if (Array.isArray(counselor.history) && counselor.history.length) {
      const count = counselor.manageCount || `${counselor.history.length}회`;
      return counselor.history.map((history) => ({ ...history, manageCount: count }));
    }
    return [counselor];
  });
}

function clearReportRow(sheet, rowNumber) {
  for (const column of ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"]) {
    safeSetCell(sheet, `${column}${rowNumber}`, "");
  }
}

function findCounselorHeaderRow(sheet) {
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const alias = normalizeHeaderText(cellText(sheet, `F${rowNumber}`));
    const weekly = normalizeHeaderText(cellText(sheet, `K${rowNumber}`));
    const count = normalizeHeaderText(cellText(sheet, `M${rowNumber}`));
    if (alias === "예명" && weekly === "금주관리내용" && count === "누적관리횟수") return rowNumber;
  }
  return null;
}

function isNextReportSection(sheet, rowNumber) {
  const b = normalizeHeaderText(cellText(sheet, `B${rowNumber}`));
  const c = normalizeHeaderText(cellText(sheet, `C${rowNumber}`));
  const f = normalizeHeaderText(cellText(sheet, `F${rowNumber}`));
  if (b === "책무" && c === "과업" && f !== "예명") return true;
  if (b.includes("총") && b.includes("금주")) return true;
  return b === "책무" && c === "과업";
}

function normalizeHeaderText(value) {
  return String(value || "").replace(/\s/g, "");
}

function findCellContaining(sheet, text) {
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= row.cellCount; column += 1) {
      const address = row.getCell(column).address;
      if (cellText(sheet, address).includes(text)) return address;
    }
  }
  return "";
}

function cellText(sheet, address) {
  const value = sheet.getCell(address).value;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10).replace(/-/g, ".");
  if (typeof value === "number") {
    if (value > 30000 && value < 70000) return excelSerialToDate(value);
    return String(value);
  }
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
    if (value.text) return String(value.text);
    if (value.result != null) return String(value.result);
  }
  return String(value).trim();
}

function excelSerialToDate(serial) {
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10).replace(/-/g, ".");
}

function safeSetCell(sheet, address, value) {
  try {
    const cell = sheet.getCell(address);
    cell.value = value || "";
    cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: "middle" };
  } catch {
    // Some template cells are merged. If a merged slave rejects writes, keep the template intact.
  }
}

async function loginUser(body) {
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!username || !password) {
    throw unauthorized("아이디와 비밀번호를 입력해주세요.");
  }

  const users = readUsers();
  let mapping = users.find((user) => String(user.adminId).toLowerCase() === username.toLowerCase());

  if (!AUTH_BYPASS) {
    const ok = await authenticateWithLegacyProgram(username, password);
    if (!ok) {
      throw unauthorized("관리프로그램 로그인 정보가 올바르지 않습니다.");
    }
  }

  if (!mapping && users.length === 0) {
    mapping = {
      adminId: username,
      name: username,
      role: "teamLead",
      part: "운영팀",
    };
    writeUsers([mapping]);
  }

  if (!mapping && !AUTH_BYPASS) {
    throw unauthorized("관리프로그램 로그인은 성공했지만 업무일지 권한이 등록되지 않았습니다.");
  }

  return sanitizeUser(mapping || {
    adminId: username,
    name: username,
    role: "teamLead",
    part: "운영팀",
  });
}

async function authenticateWithLegacyProgram(username, password) {
  const getResponse = await fetch(LEGACY_LOGIN_URL, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "HongCafe-Ops-Worklog/0.1",
    },
  });
  const loginPage = await getResponse.text();
  const cookieHeader = collectSetCookies(getResponse.headers);
  const hiddenFields = extractHiddenFields(loginPage);
  const form = new URLSearchParams({
    ...hiddenFields,
    ...LEGACY_EXTRA_FIELDS,
    [LEGACY_USERNAME_FIELD]: username,
    [LEGACY_PASSWORD_FIELD]: password,
  });

  const postResponse = await fetch(LEGACY_LOGIN_POST_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "HongCafe-Ops-Worklog/0.1",
      "X-Requested-Wit": "XMLHttpRequest",
      Referer: LEGACY_LOGIN_URL,
      Cookie: cookieHeader,
    },
    body: form,
  });
  const responseText = await postResponse.text();
  const location = postResponse.headers.get("location") || "";

  try {
    const payload = JSON.parse(responseText);
    if (payload.response === "success") return true;
    if (payload.response === "fail" || payload.response === "error") return false;
  } catch {
    // Non-JSON responses are handled by the fallback rules below.
  }

  if (LEGACY_FAILURE_TEXT && responseText.includes(LEGACY_FAILURE_TEXT)) return false;
  if (LEGACY_SUCCESS_TEXT && responseText.includes(LEGACY_SUCCESS_TEXT)) return true;

  return postResponse.status >= 300 && postResponse.status < 400 && !location.includes("login");
}

function findUserMapping(username) {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  return users.find((user) => String(user.adminId).toLowerCase() === username.toLowerCase());
}

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function saveUserMapping(body) {
  const user = normalizeUserMapping(body);
  const users = readUsers();
  const index = users.findIndex((item) => String(item.adminId).toLowerCase() === user.adminId.toLowerCase());

  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }

  writeUsers(users);
  return sanitizeUser(user);
}

function deleteUserMapping(adminId, currentUser) {
  if (!adminId) throw badRequest("adminId is required.");
  if (currentUser?.adminId?.toLowerCase() === adminId.toLowerCase()) {
    throw badRequest("현재 로그인한 본인 계정은 삭제할 수 없습니다.");
  }

  const users = readUsers();
  writeUsers(users.filter((user) => String(user.adminId).toLowerCase() !== adminId.toLowerCase()));
}

function normalizeUserMapping(body) {
  const adminId = String(body?.adminId || "").trim();
  const name = String(body?.name || "").trim();
  const role = String(body?.role || "").trim();
  const part = String(body?.part || "").trim();
  const allowedRoles = new Set(["teamLead", "partLead", "member"]);
  const allowedParts = new Set(["운영 1파트", "운영 2파트", "운영 3파트"]);

  if (!adminId) throw badRequest("이메일/아이디를 입력해주세요.");
  if (!name) throw badRequest("이름을 입력해주세요.");
  if (!allowedRoles.has(role)) throw badRequest("권한을 확인해주세요.");
  if (!allowedParts.has(part)) throw badRequest("파트를 확인해주세요.");

  return { adminId, name, role, part };
}

function sanitizeUser(user) {
  return {
    adminId: user.adminId,
    name: user.name,
    role: user.role,
    part: user.part,
  };
}

function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionId;
}

function getSessionUser(req) {
  const sessionId = getCookie(req, SESSION_COOKIE);
  if (!sessionId) {
    return AUTH_BYPASS ? { adminId: "dev", name: "개발 모드", role: "teamLead", part: "운영팀" } : null;
  }

  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session.user;
}

function ensureAuthenticated(req, res) {
  if (getSessionUser(req)) return true;
  sendJson(res, 401, { error: "Login required." });
  return false;
}

function ensureTeamLead(req, res) {
  const user = getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Login required." });
    return false;
  }

  if (user.role !== "teamLead") {
    sendJson(res, 403, { error: "팀장 권한이 필요합니다." });
    return false;
  }

  return true;
}

function setSessionCookie(res, sessionId) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function collectSetCookies(headers) {
  const rawCookies = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(Boolean);

  return rawCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function extractHiddenFields(html) {
  const fields = {};
  const regex = /<input\b[^>]*type=["']?hidden["']?[^>]*>/gi;
  const inputs = html.match(regex) || [];

  for (const input of inputs) {
    const name = input.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = input.match(/\bvalue=["']([^"']*)["']/i)?.[1] || "";
    if (name) fields[name] = value;
  }

  return fields;
}

function parseExtraFields(raw) {
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function serveUpload(requestPath, res) {
  const fileName = path.basename(decodeURIComponent(requestPath));
  const filePath = path.join(UPLOAD_DIR, fileName);
  serveFile(filePath, res);
}

function serveHtml2Canvas(requestPath, res) {
  const fileName = path.basename(decodeURIComponent(requestPath));
  const filePath = path.join(ROOT_DIR, "node_modules", "html2canvas", "dist", fileName);
  serveFile(filePath, res);
}

function serveStatic(requestPath, res) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT_DIR, relativePath);

  if (!filePath.startsWith(ROOT_DIR) || filePath.includes(`${path.sep}server${path.sep}`)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  serveFile(filePath, res);
}

function serveFile(filePath, res) {
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Content-Length": stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > maxBytes) {
        reject(badRequest("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(badRequest("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function unauthorized(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}
