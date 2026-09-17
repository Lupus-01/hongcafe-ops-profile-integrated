# 아테나 서버 인증·이미지 등록 로컬 검사

## 범위

아테나 로그인 응답에서 발급된 쿠키를 사용자별 서버 메모리에 보관하고 이미지관리 목록을 조회할 수 있는지 확인한다. 기존 업무일지 로그인·권한 처리와 세션은 변경하지 않는다. 이 검사 화면은 별도의 아테나 인증 세션을 사용하며 업무일지 조직 매핑 파일을 변경하지 않는다.

1차 로그인·목록 조회·기존 아테나 창 로그인 유지는 사용자가 성공을 확인했다. 2차는 사용자가 선택한 기존 이미지 한 장을 실제 등록하고 URL을 확보하는 검사다. 기존 수동 다운로드·URL 입력 및 앞서 작성한 확장 프로그램은 유지된다. AI 생성·운영 배포·PM2 조작은 수행하지 않는다. 프로필 생성 후 대표·무드 자동 반영은 아직 연결하지 않았다.

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
7. 아래 2차 검사까지 마친 뒤 **검사 세션 종료** 클릭. 서버 종료는 PowerShell에서 Ctrl+C.

### 2차: 이미지 한 장 등록

1. 화면 아래에서 기존에 생성한 PNG/JPEG/WebP 이미지 한 장(8MB 이하)을 선택한다.
2. 원본 미리보기를 확인하고 실제 등록 항목에 체크한다.
3. **3. 이미지 한 장 실제 등록** 클릭.
4. 등록 이름(`hc-test-...`), URL, 아테나 등록 이미지가 표시되는지 확인한다.
5. 원본과 등록 결과 미리보기를 육안으로 비교한다. URL 링크를 열어 실제 표시도 확인한다.
6. **같은 이미지 결과 확인 (재등록 없음)** 클릭. 기존 결과 재사용 안내가 나오고 아테나의 해당 이름 등록 건수가 한 건인지 확인한다.

최초 업로드 이후 결과가 불확실하면 등록 버튼을 반복해도 재업로드하지 않는다. 결과 확인 버튼은 처음부터 업로드를 수행하지 않는다. 현재 목록 첫 페이지에서만 조회하므로 등록 결과가 오래되어 넘어갔거나 서버 오류가 발생하면 이름을 사용해 아테나에서 수동 확인한다. 그런 경우 임의로 중복 방지 파일을 삭제하거나 새 테스트 파일로 재시도하지 않는다. 테스트 이미지는 자동 삭제하지 않는다.

서버 재시작 뒤에는 다시 로그인하고 같은 이미지 파일을 선택해 결과 확인을 누를 수 있다. 파일 이름이 바뀌어도 내용이 같으면 같은 등록 기록을 사용한다.

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
- 2차 실제 업로드는 고정 `/api/management/insertImage`로만 전송하며, 사용자 제공 코드의 `media_name`, `bn_img`, `media_memo` 및 요청 헤더를 사용한다. 임의 전송 URL은 받지 않는다.
- 중복 방지 기록은 `server/data/athena-upload-tests/`에 저장한다(Git 제외). 계정·아테나 origin·이미지 내용의 해시로 구분하며 원본 이미지·비밀번호·쿠키·원문 아이디는 저장하지 않는다. 등록 이름·상태·발급 URL·시각만 기록한다.
- 업로드 전에 배타적으로 pending 파일을 생성하므로 동시 요청과 서버 재시작에도 자동 재전송을 막는다. 기록을 쓸 수 없으면 업로드하지 않는다. 이 기록은 세션 종료 후에도 유지한다.
- 완료 기록은 로컬 URL 재사용이며 CDN 파일 존속·픽셀 일치까지 자동 검증한 것은 아니다. 두 미리보기와 아테나 등록 건수는 실제 계정 검사에서 확인한다.

## 검사 명령

```powershell
npm run check
npm run check:athena
node --check server/athena-image-test.js
npm run test:athena
git diff --check
git diff -- server/server.js package.json
git status --short
```

테스트는 임시 디렉터리의 서버와 가짜 아테나 서버만 사용한다. 실제 계정, 운영 업로드, AI 요청은 사용하지 않는다. 쿠키 갱신·사용자 분리·기존 로그인 응답 보존·원문 비노출·만료·로그아웃·교차 Origin 차단·로그인 리다이렉트 미추적·기존 프로필 프록시 및 실제 FormData 파일 파트, 정확한 행 이름 매칭, 응답 유실·재시작·동시 요청의 중복 방지, 결과 확인의 POST 미발생을 검증한다.

## 변경 보관

```powershell
git add -- .gitignore server/athena-image-test.js server/athena-session-test.js server/athena-session-test-ui.js server/athena-session-test.html server/athena-session-test.test.mjs server/start-athena-test.js server/athena-session-test.md
git diff --cached --check
git diff --cached
git commit -m "기능: 아테나 이미지 한 장 등록 및 중복 방지 검사 추가"
git push origin main
```

package.json의 앞선 확장 프로그램 명령, 기존 미추적 t, ers... 파일과 확장 프로그램 폴더는 이번 커밋에 임의로 포함하지 않는다. 이번에는 package.json을 수정하지 않았다.

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
