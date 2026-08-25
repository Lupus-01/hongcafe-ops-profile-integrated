import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, '..');

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function getAvailablePort() {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Web server did not become healthy.');
}

test('web server proxies profile job status and retry requests to the profile API', async (t) => {
  const receivedRequests = [];
  const profileApi = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      receivedRequests.push({ method: req.method, url: req.url, cookie: req.headers.cookie, body });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ job: { id: 'job-123', state: 'completed' } }));
    });
  });
  const profileApiPort = await listen(profileApi);
  const webPort = await getAvailablePort();
  const webBaseUrl = `http://127.0.0.1:${webPort}`;
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(webPort),
      PROFILE_API_PORT: String(profileApiPort),
      AUTH_BYPASS: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  t.after(async () => {
    child.kill('SIGTERM');
    await new Promise((resolve) => profileApi.close(resolve));
  });

  await waitForHealth(webBaseUrl);

  const statusResponse = await fetch(`${webBaseUrl}/api/profile-jobs/job-123?view=full`, {
    headers: { Cookie: 'profile_api_auth=test-token' }
  });
  assert.equal(statusResponse.status, 200);
  assert.equal((await statusResponse.json()).job.state, 'completed');

  const retryResponse = await fetch(`${webBaseUrl}/api/profile-jobs/job-123/retry-failed`, {
    method: 'POST',
    headers: {
      Cookie: 'profile_api_auth=test-token',
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  assert.equal(retryResponse.status, 200);

  assert.deepEqual(receivedRequests, [
    {
      method: 'GET',
      url: '/api/profile-jobs/job-123?view=full',
      cookie: 'profile_api_auth=test-token',
      body: ''
    },
    {
      method: 'POST',
      url: '/api/profile-jobs/job-123/retry-failed',
      cookie: 'profile_api_auth=test-token',
      body: '{}'
    }
  ]);
});
