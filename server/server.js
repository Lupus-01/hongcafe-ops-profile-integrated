const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(DATA_DIR, "state.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_COOKIE = "ops_session";
const PROFILE_AUTH_COOKIE = "profile_api_auth";

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
const PROFILE_AUTH_SECRET = process.env.PROFILE_AUTH_SECRET || "";

validateProductionSecurity();

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
        time: new Date().toISOString(),
      });
      return;
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      const user = await loginUser(body);
      const sessionId = createSession(user);
      setSessionCookies(res, sessionId, user);
      sendJson(res, 200, { user });
      return;
    }

    if (url.pathname === "/api/auth/me" && req.method === "GET") {
      const user = getSessionUser(req);
      if (!user) {
        sendJson(res, 401, { error: "Login required." });
        return;
      }
      setProfileAuthCookie(res, user);
      sendJson(res, 200, { user });
      return;
    }

    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      const sessionId = getCookie(req, SESSION_COOKIE);
      if (sessionId) sessions.delete(sessionId);
      clearSessionCookies(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/users" && req.method === "GET") {
      if (!ensureOrgViewer(req, res)) return;
      sendJson(res, 200, { users: readUsers().map(sanitizeUser) });
      return;
    }

    if (url.pathname === "/api/users" && req.method === "POST") {
      if (!ensureOrgManager(req, res)) return;
      const body = await readJsonBody(req);
      const user = saveUserMapping(body);
      sendJson(res, 201, { user });
      return;
    }

    if (url.pathname.startsWith("/api/users/") && req.method === "DELETE") {
      if (!ensureOrgManager(req, res)) return;
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

function validateProductionSecurity() {
  if (process.env.NODE_ENV !== "production") return;
  const problems = [];
  if (AUTH_BYPASS) problems.push("AUTH_BYPASS must be false");
  if (PROFILE_AUTH_SECRET.length < 32) problems.push("PROFILE_AUTH_SECRET must be at least 32 characters");
  if (process.env.COOKIE_SECURE !== "true") problems.push("COOKIE_SECURE must be true");
  if (HOST !== "127.0.0.1" && HOST !== "::1") problems.push("HOST must be loopback-only");
  if (problems.length) {
    throw new Error(`[security] Refusing production startup: ${problems.join("; ")}`);
  }
}

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

function normalizePart(part) {
  const value = String(part || "").trim();
  const partMap = {
    "": "운영 1파트",
    섭외파트: "운영 1파트",
    콘텐츠파트: "운영 2파트",
    CS파트: "운영 3파트",
  };
  if (Object.prototype.hasOwnProperty.call(partMap, value)) return partMap[value];
  return value;
}

function partForRole(role, part) {
  return role === "teamLead" ? "운영팀" : normalizePart(part);
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
  const part = partForRole(role, body?.part);
  const allowedRoles = new Set(["teamLead", "partLead", "member"]);
  const allowedParts = new Set(["운영팀", "운영 1파트", "운영 2파트", "운영 3파트"]);

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
    part: partForRole(user.role, user.part),
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

function ensureOrgViewer(req, res) {
  const user = getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Login required." });
    return false;
  }

  if (user.role !== "teamLead" && user.role !== "partLead") {
    sendJson(res, 403, { error: "팀장 또는 파트장 권한이 필요합니다." });
    return false;
  }

  return true;
}

function ensureOrgManager(req, res) {
  return ensureOrgViewer(req, res);
}

function setSessionCookies(res, sessionId, user) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  const cookies = [
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
  ];
  const profileCookie = buildProfileAuthCookie(user, secure);
  if (profileCookie) cookies.push(profileCookie);
  res.setHeader("Set-Cookie", cookies);
}

function setProfileAuthCookie(res, user) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  const cookie = buildProfileAuthCookie(user, secure);
  if (cookie) res.setHeader("Set-Cookie", cookie);
}

function buildProfileAuthCookie(user, secure) {
  if (PROFILE_AUTH_SECRET.length < 32) return "";
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.adminId || ""),
    role: String(user.role || ""),
    exp: Date.now() + SESSION_TTL_MS,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", PROFILE_AUTH_SECRET).update(payload).digest("base64url");
  return `${PROFILE_AUTH_COOKIE}=${payload}.${signature}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}

function clearSessionCookies(res) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    `${PROFILE_AUTH_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  ]);
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
