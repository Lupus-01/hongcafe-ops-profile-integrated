// Explicit local-only entry point; never enables this probe in PM2/production.
process.env.HOST = '127.0.0.1';
process.env.PORT = process.env.ATHENA_TEST_PORT || '3300';
process.env.NODE_ENV = 'development';
process.env.ATHENA_SESSION_TEST = 'true';
process.env.AUTH_BYPASS = 'false';
process.env.COOKIE_SECURE = 'false';
process.env.LEGACY_LOGIN_URL = 'https://hongcafe.peoplev.co.kr/admin';
process.env.LEGACY_LOGIN_POST_URL = 'https://hongcafe.peoplev.co.kr/api/admin/loginadmin';
process.env.LEGACY_USERNAME_FIELD = 'admin_id';
process.env.LEGACY_PASSWORD_FIELD = 'password';
process.env.LEGACY_EXTRA_FIELDS = '{}';
process.env.LEGACY_SUCCESS_TEXT = '';
process.env.LEGACY_FAILURE_TEXT = '';
require('./server');
console.log(`Athena login/upload test: http://127.0.0.1:${process.env.PORT}/athena-session-test`);
