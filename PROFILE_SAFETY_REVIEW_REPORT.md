# 프로필 자동화 오류 수정 및 검증

기준: `ce3d661`, `main`, 2026-09-08. 사용자 승인 후 로컬 코드 수정과 검증을 수행했다. 커밋·푸시·운영 반영·PM2 조작·유료 AI 호출은 수행하지 않았다.

## 수정 내용

| 파일 | 변경 |
|---|---|
| `profile-maker-api/profile-job-store.mjs` | 만료 결과를 작은 생성 기록으로 원자적으로 교체한다. 동일 입력 재접수는 410으로 차단한다. 재사용 경로에서도 요청 키를 검증·등록한다. 기동 시 작업 JSON을 한 번 읽어 색인과 복원 목록을 만든다. 화면 복원에 필요한 분야·참고 문구 등만 공개 응답에 추가한다. |
| `profile-maker-api/profile-job-queue.mjs` | 기동 시 작은 복원 목록을 사용한다. 접수 준비 중 중단된 작업은 자동 실행하지 않는다. 기존 running/unknown 중복 호출 방지 동작을 유지한다. |
| `profile-maker-api/profile-usage-store.mjs` | 사용량 파일 손상·읽기 오류·잘못된 카운터는 503으로 차단한다. 임시 파일 작성 후 교체하며 교체 실패 시 기존 기록을 보존한다. |
| `profile-maker-api/server.mjs` | 사용량 저장 모듈 연결, 준비 완료 후 큐 등록, 카테고리·부분 재생성 슬롯 검증, 배정·사용량 오류 처리, 기동 시간 로그, 캠페인 일일 한도 적용 여부 표시. |
| `profile-maker/script.js` | 생성 문구를 텍스트 DOM으로 표시하고 줄바꿈·목록 편집을 유지한다. 이력 제목·요약과 이미지 오류 메시지도 텍스트로 처리한다. 새로고침 후 완료 결과·이미지·참고 문구·생성군을 복원한다. |
| `profile-maker-api/profile-campaign-api.test.mjs` | 작업·사용량·생성 이력을 임시 경로로 격리하고 잘못된 입력, 키 충돌, 사용량 손상 API 검사를 추가한다. |
| `profile-maker-api/profile-job.test.mjs` | 만료·재시작·키 충돌·누락 결과·한 번 읽기·준비 중단 검사를 추가한다. |
| `profile-maker-api/profile-usage-store.test.mjs` | 손상·권한 오류·저장 실패 시 기록 보호를 검사한다. |
| `profile-maker-api/profile-version-replay.test.mjs` | 공통 요청 키 처리 경로에서도 이전 v7/v11·v8/v12 결과 재사용을 검사한다. |
| `profile-maker/profile-history.test.mjs` | 생성 HTML의 텍스트 처리와 추가 생성 없이 결과 복원을 검사한다. |
| `package.json`, `.env.example` | 새 검사 연결, 선택적 사용량 경로와 캠페인·만료 정책 설명. 의존성 추가 및 잠금 파일 변경 없음. |

## 동작 및 한계

- 기존 보관 기간 기본값 45일을 유지한다. 만료 시 큰 이미지·본문 대신 입력 지문과 작업 ID 등의 작은 기록을 남긴다. 동일 입력 재접수는 새 유료 생성 없이 HTTP 410으로 끝난다. 만료 결과 자체의 복원에는 별도 백업이 필요하다.
- 새 기록은 캠페인 한도 집계에도 남는다. 만료로 같은 캠페인의 누적 한도가 다시 비워지지 않는다.
- 과거 버전에서 이미 삭제되어 입력 지문도 남아 있지 않은 결과까지 소급해서 판별할 수는 없다. 기존 요청 키 기록이 남은 누락 결과는 해당 키로 재요청할 때 410으로 차단한다.
- 기본 사용량 경로는 그대로다. 운영 `.env` 변경은 필요 없다. `PROFILE_USAGE_FILE`은 테스트 격리 또는 명시적 저장 경로 지정에만 사용한다. 파일 없음은 최초 사용으로 허용하지만 JSON 손상·권한 오류·잘못된 카운터는 허용하지 않는다.
- 캠페인 모드에서는 기존처럼 캠페인 한도를 사용하며 일일·사용자별·AI 시도 한도를 적용하지 않는다. 정책을 변경하지 않았다. 헬스 응답의 `profileCampaignDailyLimitsEnforced`가 이를 표시한다.
- 기동 시 작업 저장소의 네 번 순회 중 중복 JSON 읽기를 합쳤다. 이미 생성 이력에 반영된 완료 작업은 저장소에서 한 번만 읽고, 복원 목록에는 이미지 본문을 보관하지 않는다. 누락된 생성 이력 가져오기와 실제 대기 작업 실행에는 추가 읽기가 필요하다.
- `[profile-startup]`에 `storeLoadMs`, `historyLoadMs`, `recoveryMs`, `readyAt`, `pid`, `totalMs`가 기록된다. `totalMs`는 모듈 본문 시작 이후 측정값이며 Node 실행·정적 import 시간 전체는 아니다. 운영 지연 원인이나 개선 시간을 아직 확정하지 않았다.
- 글 v9·이미지 v13, CSS·라우팅·기존 생성군·10초 요청 간격을 유지했다. 실제 생성 결과의 체감 다양성은 이번 검증 대상이 아니다.

## 검증 결과

- 로컬 Node v24.14.0. 운영 인계의 Node v20.20.1에서는 이번 변경을 직접 실행하지 않았다.
- `npm run check`: 통과.
- `npm test`: 102/102 통과.
- `npm run test:diversity`: 저장·재개 일치 검사 1/1 통과, 약 5.4초. 이미 완료된 24,000건 대규모 검사는 반복하지 않았다.
- `git diff --check`, 신규 파일 공백 검사 및 전체 diff 검토 수행.
- 실제 로컬 `.profile-usage.json`, `server/data/state.json`, `server/data/users.json`의 검사 전후 SHA-256이 동일했다. 기본 생성 이력 파일도 생성되지 않았다.
- DOM 처리는 모의 DOM으로 검증했다. 실제 브라우저에서 화면·이미지 다운로드를 직접 확인한 것은 아니다.
- 유료 AI 호출 0회. 통합 테스트의 AI 응답은 모의 결과다.

## Git 및 반영 명령 — 안내용, 미실행

현재 `main`의 기준 커밋은 `ce3d661`이다. 이번 작업은 수정 10개·신규 3개 파일이다. 기존 미추적 항목 `t`, `ers...`는 그대로 보존하고 아래 커밋 목록에서 제외한다.

로컬에서는 검사와 diff를 확인한 후 커밋한다. 각 명령이 실패하면 다음 단계로 넘어가지 않는다.

```powershell
npm run check
npm test
npm run test:diversity
git diff --check
git diff --stat
git diff
git add -- .env.example package.json PROFILE_SAFETY_REVIEW_REPORT.md profile-maker-api/server.mjs profile-maker-api/profile-job-store.mjs profile-maker-api/profile-job-queue.mjs profile-maker-api/profile-usage-store.mjs profile-maker-api/profile-usage-store.test.mjs profile-maker-api/profile-job.test.mjs profile-maker-api/profile-campaign-api.test.mjs profile-maker-api/profile-version-replay.test.mjs profile-maker/script.js profile-maker/profile-history.test.mjs
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "수정: 프로필 중복 과금 보호와 결과 복원 안정화"
git push origin main
git log -1 --oneline
git status --short --branch
```

운영 반영은 서버 수정 파일이 없고 대기·실행 작업이 없는지 먼저 확인한다. 새 접수도 잠시 멈춘 뒤 반영한다. 정상 동작 중인 서비스를 이번 세션에서 재시작하지 않았다.

```bash
cd /opt/hongcafe-ops-profile-integrated
date '+%Y-%m-%d %H:%M:%S %Z'
git status --short --branch
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health

git pull --ff-only origin main && npm run check && pm2 restart hongcafe-profile-api

date '+%Y-%m-%d %H:%M:%S %Z'
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
ss -ltnp 'sport = :3100'
pm2 status hongcafe-profile-api
pm2 logs hongcafe-profile-api --lines 80 --nostream
git log -1 --oneline
git status --short --branch
```

정상 기준: HTTP 200·`ok=true`, 포트 3100 대기, PM2 online, 푸시한 커밋과 서버 HEAD 일치, 서버 수정 파일 없음. 글 v9·이미지 v13 유지, `profileCampaignDailyLimitsEnforced`가 캠페인 모드와 반대 값인지 확인한다. 로그에 이번 PID의 `[profile-startup] readyAt=...`가 기록되어야 한다. 시작 직후 연결 거부가 있으면 반복 재시작하지 말고 시각·포트·PID·로그를 확인한다. 브라우저는 Ctrl+F5 후 기존 결과 불러오기와 줄바꿈·이미지를 확인한다. 생성 버튼을 눌러 유료 표본을 만드는 검사는 별도 승인 대상이다.
