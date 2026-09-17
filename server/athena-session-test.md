# 아테나 서버 인증 1차 로컬 검사

## 범위

아테나 로그인 응답에서 발급된 쿠키를 사용자별 서버 메모리에 보관하고 이미지관리 목록을 조회할 수 있는지 확인한다. 기존 업무일지 로그인·권한 처리와 세션은 변경하지 않는다. 이 검사 화면은 별도의 아테나 인증 세션을 사용하며 업무일지 조직 매핑 파일을 변경하지 않는다.

이미지 업로드, AI 생성, 운영 배포, PM2 조작은 하지 않는다. 기존 수동 다운로드·URL 입력 및 앞서 작성한 확장 프로그램은 유지된다. 1차 통과 후에도 기존 아테나 브라우저 로그인 유지 여부는 사용자가 직접 확인해야 한다. 실제 업로드 가능 여부는 별도의 2차 검사 대상이다.

## 실행

프로젝트 루트의 PowerShell에서:

```powershell
npm run athena:test:local
```

브라우저에서 `http://127.0.0.1:3300/athena-session-test` 접속.

1. 기존 아테나 창을 로그인된 상태로 둔다.
2. 검사 화면에 본인 아테나 아이디·비밀번호를 입력하고 **1. 아테나 로그인 검사** 클릭.
3. **2. 이미지관리 목록 조회** 클릭.
4. 접근 확인 메시지가 표시되는지 확인.
5. 기존 아테나 창을 새로고침해서 로그인이 유지되는지 확인.
6. 다시 목록 조회를 눌러 두 세션이 동시에 유지되는지 확인.
7. **검사 세션 종료** 클릭. 서버 종료는 PowerShell에서 Ctrl+C.

비밀번호나 쿠키 대신 화면의 결과 문구와 ‘기존 아테나 로그인 유지/해제’만 공유한다. 첫 서버 로그인 자체가 아테나의 동시 로그인 정책에 따라 기존 브라우저 세션을 종료시킬 수 있으므로, 저장하지 않은 아테나 입력 작업을 마친 뒤 시작한다.

포트가 사용 중이면 다른 터미널에서:

```powershell
$env:ATHENA_TEST_PORT = '3301'
npm run athena:test:local
```

## 저장·보안 경계

- 쿠키는 검사 세션마다 분리된 서버 메모리만 사용하며 비밀번호를 세션에 보관하지 않는다.
- 15분 고정 만료. 만료된 세션은 접근 시 또는 30초 간격 정리 작업에서 제거된다. 검사 세션 종료·서버 종료로도 제거된다.
- 브라우저에는 별도 HttpOnly·SameSite=Strict 로컬 검사 세션 ID만 전달한다. 아테나 쿠키·전체 HTML·이미지 목록·상위 서버 오류 원문은 반환하지 않는다.
- 로그인 GET/POST의 쿠키를 갱신하고 이름·경로·Secure·만료를 적용한다. 고정 아테나 origin 밖으로 쿠키를 전달하지 않는다.
- 목록 조회는 고정 `/management/image` GET 한 번이며 리다이렉트를 따라가지 않는다. HTML 표시 구조가 다르면 성공을 단정하지 않는다.
- `ATHENA_SESSION_TEST=true` + loopback HOST + 비운영 NODE_ENV일 때만 검사 기능을 연다. 일반 `npm start`에서는 기본적으로 비활성화된다.
- 모든 검사 API는 같은 Origin의 JSON POST만 허용한다. 읽기 검사에도 다른 사이트에서 호출되지 않도록 동일한 제한을 적용한다.
- HTTP 200과 로그인 JSON success만으로는 업로드 권한을 증명할 수 없다. 목록 화면 확인과 브라우저 세션 유지 여부를 분리한다.

## 검사 명령

```powershell
npm run check
npm run check:athena
npm run test:athena
git diff --check
git diff -- server/server.js package.json
git status --short
```

테스트는 임시 디렉터리의 서버와 가짜 아테나 서버만 사용한다. 실제 계정, 운영 업로드, AI 요청은 사용하지 않는다. 쿠키 갱신·사용자 분리·기존 로그인 응답 보존·원문 비노출·만료·로그아웃·교차 Origin 차단·로그인 리다이렉트 미추적·기존 프로필 프록시를 검증한다.

## 변경 보관

```powershell
git add -- server/server.js server/athena-session-test.js server/athena-session-test-ui.js server/athena-session-test.html server/athena-session-test.test.mjs server/start-athena-test.js server/athena-session-test.md
git add -p -- package.json
git diff --cached --check
git diff --cached
git commit -m "기능: 아테나 인증 세션 로컬 조회 검사 추가"
git push origin main
```

package.json에는 앞선 확장 프로그램 명령도 미커밋 상태로 있으므로 `git add -p`에서 이번 아테나 검사 명령 3개만 선택한다. 기존 미추적 t, ers... 파일과 확장 프로그램 폴더는 이번 커밋에 임의로 포함하지 않는다.

## 운영 반영 참고 — 이번 로컬 검사에는 불필요

운영 배포가 별도로 승인된 뒤에만 실행한다. 운영에서는 검사 플래그를 켜지 않는다. 서버 코드 반영 시 재시작 대상은 웹 서비스이며 프로필 API가 아니다.

```bash
cd /opt/hongcafe-ops-profile-integrated
git status --short
git pull --ff-only origin main
npm run check
npm run check:athena
pm2 restart hongcafe-ops-profile
curl --max-time 10 -sS -w '\nWEB_HTTP_STATUS=%{http_code}\n' http://127.0.0.1:3000/api/health
curl --max-time 10 -sS -w '\nAPI_HTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
pm2 status
pm2 logs hongcafe-ops-profile --lines 20 --nostream
git log -1 --oneline
git status --short
```

정상 기준: health HTTP 200 및 ok=true, 웹·API online, 새 웹 로그 정상, Git 상태 확인. 이것은 실제 아테나 계정 검사 결과를 대신하지 않는다.
