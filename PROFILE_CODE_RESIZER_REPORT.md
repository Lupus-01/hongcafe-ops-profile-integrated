# 프로필 코드 글자 크기 조정

## 2026-09-18 제작 페이지 사이트 HTML 미리보기

기준 HEAD `a28ded6`. 제작 페이지에 사이트 등록 미리보기와 편집 화면 전환을 추가했다. 기존 편집용 복제 모달은 사이트 미리보기로 대체했다. 미리보기는 createSiteRegistrationCode() 결과를 그대로 iframe 본문에 사용하며 편집 CSS는 전달하지 않는다. iframe은 스크립트 실행을 차단한다. 사이트 내부 이미지 경로는 미리보기 문서의 base를 아테나 origin으로 설정해 해석한다.

생성·히스토리 복원 시 사이트 미리보기를 열고, 편집 후 전환·이미지 URL·Base64 옵션·캔버스 변경 시 갱신한다. 오류 발생 시 기존 미리보기를 지우고 입력 안내를 표시한다. 모바일 375px와 720px 너비를 제공하며 iframe 높이는 내용에 맞춘다. 좁은 화면에서는 고정 폭 미리보기 영역 안에서 가로 스크롤할 수 있다. 실제 사이트 외부 여백과 폰트 환경은 재현하지 않으므로 차이가 남을 수 있다.

수정 파일은 index.html, script.js, style.css, 신규 profile-site-preview.js, 신규 profile-site-preview-browser.test.mjs 및 이 보고서 총 6개다. 기존 생성·업로드·내보내기 함수와 이미지 저장은 보존했다. package.json 기존 사용자 변경과 미추적 tools/, t, ers...는 수정하지 않았다.

검증: npm run check 및 신규 JS 구문 검사 통과. 관련 단위 테스트 22/22 통과. Chrome 브라우저 테스트 3/3 통과(사이트 레이아웃 12조합, 코드 조정 도구, 실제 제작 페이지 미리보기). 실제 제작 페이지 테스트는 API 호출을 차단한 샘플로 HTML 일치, 히스토리 복원, 편집 전환, URL 변경, Base64 옵션, 미입력 시 이전 화면 제거, 이미지 저장 720px·제목66px 기준 보존을 검증했다. html2canvas는 검증용 대체 함수를 사용했으므로 실제 PNG 파일 품질 검증은 아니다. 샘플 화면 스크린샷 육안 확인 및 diff 검사 완료.

현재 미커밋이며 커밋·푸시·운영 배포·PM2 조작은 하지 않았다. 권장 커밋 메시지: `기능: 제작 페이지에 사이트 HTML 미리보기 추가`. 로컬 검수에는 배포가 필요 없다.

추가 검사 명령:

```powershell
node --check profile-maker/profile-site-preview.js
node --test profile-maker/profile-site-preview-browser.test.mjs profile-maker/profile-site-layout-browser.test.mjs profile-maker/profile-code-resizer-browser.test.mjs
```

---

## 2026-09-18 소제목·설명 박스 내부 여백 보완

기준 HEAD `222b69b`, main. 사이트 출력 CSS 값만 부분 조정했다. 소제목 패딩은 위아래 8px·좌우 12px, 흰색 설명 박스 패딩은 사방 16px다. 기존 grid 간격 14px에 설명 박스 상단 여백 2px를 더해 사진 아래 간격을 16px로 맞췄다. 제목과 사진 사이 간격은 유지한다.

바깥 좌우 16px, 상단·큰 구간 사이 30px, 목록 간격 6px, 글자 크기·줄 간격·모서리·기호·이미지 URL을 유지했다. 박스 바깥 가장자리는 기존 기준선에 맞추고 박스 안 글자만 안쪽으로 배치한다. 제작 화면·이미지 저장 및 생성 로직은 변경하지 않았다.

수정 파일: `profile-maker/script.js`(CSS 값), `profile-maker/profile-site-layout-browser.test.mjs`(내부/외부 정렬과 여백 검사), 이 보고서.

검증: npm run check 통과, 관련 테스트 22/22 통과, Chrome 검사 1/1 통과(3개 유형 × 320·375·430·720px). 박스 패딩·사진 아래 간격·기존 구간 간격·문구/이미지 URL 보존·가로 넘침을 확인했다. 단색 샘플 이미지를 사용한 375px 화면도 육안 확인했다. 실제 아테나 등록 화면 확인은 남아 있다. git diff --check 및 전체 diff 확인 완료.

이번 파일 3개는 미커밋이다. 기존 package.json 변경과 tools/, t, ers... 미추적 항목을 보존했다. 커밋·푸시·배포·PM2 조작은 하지 않았다. 로컬 검수에는 배포가 필요 없으며 기존 프로필에서 사이트 코드를 다시 내보내어 확인한다.

권장 커밋 메시지: `수정: 프로필 소제목과 설명 박스 내부 여백 확보`

로컬 PowerShell에서 단계별 성공 확인 후 실행한다. 스테이징에는 이번 파일 3개만 포함한다.

```powershell
npm run check
node --test profile-maker/profile-code-output.test.mjs profile-maker/profile-typography.test.mjs profile-maker/profile-history.test.mjs
node --test profile-maker/profile-site-layout-browser.test.mjs
git diff --check
git diff
git add -- profile-maker/script.js profile-maker/profile-site-layout-browser.test.mjs PROFILE_CODE_RESIZER_REPORT.md
git diff --cached --stat
git diff --cached --check
git commit -m "수정: 프로필 소제목과 설명 박스 내부 여백 확보"
git push origin main
git log -1 --oneline
git status --short
```

운영 서버 Bash에서 Git 상태가 깨끗한지 확인하고 단계별 성공 후 다음으로 진행한다.

```bash
cd /opt/hongcafe-ops-profile-integrated
git status --short
git pull --ff-only origin main
npm run check
node --test profile-maker/profile-code-output.test.mjs profile-maker/profile-typography.test.mjs profile-maker/profile-history.test.mjs
git log -1 --oneline
pm2 reload hongcafe-ops-profile
```

기동을 몇 초 기다린 뒤 확인한다. API 재시작은 필요 없다.

```bash
curl -fsS -w '\nHTTP %{http_code}\n' http://127.0.0.1:3000/api/health
pm2 status
pm2 logs hongcafe-ops-profile --lines 50 --nostream
git status --short
git rev-parse HEAD origin/main
```

정상 기준: HTTP 200 및 ok=true, 웹 online, 새 오류 없음, 푸시한 커밋과 서버 HEAD/origin/main 일치, 운영 Git 상태 출력 없음. 브라우저 새로고침 후 사이트 코드를 다시 내보내어 기존 등록 HTML을 교체해야 반영된다.

---

## 2026-09-18 사이트 여백·정렬·목록 반영

승인된 두 번째 이미지 피드백을 사이트 출력에 적용했다. 출력 영역 기준 좌우 16px, 상단 30px, 큰 내용 구간 사이 30px로 맞췄다. 설명·마무리의 흰 배경과 왼쪽 테두리를 제거하고 중복 들여쓰기를 없앴다. 색상 소제목의 좌우 패딩도 제거해 글자 시작을 맞췄다. 목록 흰 배경과 구분선은 유지한다.

목록은 최종 서식 정리 뒤 실제 `·` 문자를 추가하며 재출력 전 기존 기호를 제거해 중복을 방지한다. 항목 간격은 6px이고, 긴 항목의 두 번째 줄은 본문 시작점에 맞춘다. 상위 영역의 가운데 정렬 영향을 받지 않도록 사이트 텍스트 정렬을 명시했다. 제목 26px·본문 16px, 이미지 모서리 8px와 제작 화면·이미지 저장 기준은 유지한다.

### 파일과 검증

- `profile-maker/script.js`: 사이트 출력 여백·정렬·장식과 목록 기호 처리.
- `profile-maker/profile-code-output.test.mjs`, `profile-maker/profile-typography.test.mjs`: 출력 순서·간격 기대값 수정.
- `profile-maker/profile-site-layout-browser.test.mjs`: 실제 출력 함수와 HTML 구성 함수를 이용한 Chrome 검증 추가. 별도 명령으로 실행하며 package.json은 수정하지 않았다.
- 이 보고서: 작업 결과 및 반영 명령.
- 구문 검사 통과, 출력·타이포·히스토리 테스트 22/22 통과.
- 브라우저 검사 1/1 통과: 3개 유형의 구조 × 320·375·430·720px 총 12개 조합. HTML 직렬화 이후 16px 정렬, 30px 상단/구간 간격, 6px 목록 간격, 문구/이미지 URL 보존, 기호 중복 방지, 가로 넘침을 확인했다.
- 샘플 문구·단색 이미지로 375px 렌더링을 육안 확인했다. 실제 생성 이미지 품질 또는 아테나 등록 화면 검증을 의미하지 않는다.
- git diff 공백 검사 및 전체 변경 내역 확인. 아테나의 서비스 소개·탭·닫기와 바깥 영역 여백은 변경하지 않았다.

### 상태와 검수

기준 커밋 `cba8ebf`, 브랜치 main. 이번 변경은 미커밋이며 기존 package.json 변경과 tools/, t, ers... 미추적 항목을 보존했다. 타이포 패널 추가 수정과 아테나 2차 등록 검수는 보류 상태다. AI 생성·이미지 등록·커밋·푸시·배포·PM2 조작은 수행하지 않았다.

로컬 화면을 새로고침하고 기존 프로필을 복원해 사이트 HTML을 다시 내보내면 검수할 수 있다. 기존 등록 코드에 자동 반영되지는 않는다. 로컬 검수에 운영 배포는 필요 없다. 실제 아테나에서 좌우 16px와 상단 30px가 되려면 외부 등록 영역의 추가 여백 여부를 확인해야 한다.

### 검수 후 수동 반영 명령

권장 커밋 메시지: `수정: 프로필 사이트 여백 정렬 및 목록 표시 개선`

로컬 PowerShell에서 각 검사 성공 후 다음 단계로 진행한다. 이번 파일 5개만 스테이징되었는지 확인한다.

```powershell
npm run check
node --test profile-maker/profile-code-output.test.mjs profile-maker/profile-typography.test.mjs profile-maker/profile-history.test.mjs
node --test profile-maker/profile-site-layout-browser.test.mjs
git diff --check
git diff
git add -- profile-maker/script.js profile-maker/profile-code-output.test.mjs profile-maker/profile-typography.test.mjs profile-maker/profile-site-layout-browser.test.mjs PROFILE_CODE_RESIZER_REPORT.md
git diff --cached --stat
git diff --cached --check
git commit -m "수정: 프로필 사이트 여백 정렬 및 목록 표시 개선"
git push origin main
git log -1 --oneline
git status --short
```

운영 서버 Bash에서 상태가 깨끗한지 확인하고 각 단계 성공 후 다음으로 진행한다.

```bash
cd /opt/hongcafe-ops-profile-integrated
git status --short
git pull --ff-only origin main
npm run check
node --test profile-maker/profile-code-output.test.mjs profile-maker/profile-typography.test.mjs profile-maker/profile-history.test.mjs
git log -1 --oneline
pm2 reload hongcafe-ops-profile
```

기동을 잠시 기다린 뒤 아래 명령을 실행한다. 정적 파일 수정이므로 웹 reload는 필요 시 사용하며 API 재시작은 필요 없다.

```bash
curl -fsS -w '\nHTTP %{http_code}\n' http://127.0.0.1:3000/api/health
pm2 status
pm2 logs hongcafe-ops-profile --lines 50 --nostream
git status --short
git log -1 --oneline
git rev-parse HEAD origin/main
```

정상 기준은 HTTP 200 및 ok=true, 웹 online, 새 오류 없음, 로컬/운영 적용 커밋 일치와 운영 Git 상태 출력 없음이다. reload 직후 연결 거부가 나면 추가 재시작 전에 잠시 후 헬스체크만 재확인한다.

---

## 2026-09-17 사이트 디자인 1차 반영

승인된 변경: 사이트 제목 42→26px, 본문·목록·색상 소제목 20→16px, 본문 줄 간격 1.65→1.5, 목록 줄 간격 1.55→1.5, 목록 항목 간격 14→10px, 대표·무드 이미지와 틀 모서리 18→8px, 소제목 모서리 12→6px.

제작 화면·이미지 저장 기준(66/35px), 제목 줄 간격, 설명 박스 모서리, 문구·이미지·URL·다운로드 기능을 보존했다. 코드 크기 조정 도구의 기본값도 26/16으로 맞췄으며, 이 도구는 기존대로 글자 크기만 변경한다. 줄 간격·모서리·소제목은 변환하지 않는다.

### 수정 파일 및 검증 결과

- `profile-maker/script.js`: 사이트 출력 수치와 모드별 간격·모서리.
- `profile-maker/index.html`, `profile-maker/profile-code-resizer-ui.js`: 기본값·버튼·안내.
- `profile-maker/profile-typography.test.mjs`, `profile-maker/profile-code-output.test.mjs`, `profile-maker/profile-code-resizer-browser.test.mjs`: 새 기준 및 이미지 출력 기존 설정 보존 검증.
- `PROFILE_CODE_RESIZER_REPORT.md`: 이번 작업 결과 기록.
- `npm run check` 통과, 관련 테스트 28/28 통과, Chrome 검사 1/1 통과. Chrome은 샌드박스 실행 실패 후 권한 확장 재실행으로 통과했다.
- diff 공백 검사와 변경 내역 확인 수행. 실제 아테나 육안 검수와 사이트 출력의 320·375·430px별 비교는 아직 수행하지 않았다.

### 검수 및 Git 상태

로컬 화면 새로고침 → 기존 프로필 복원 → 사이트 코드 다시 내보내기로 검수한다. 제작 캔버스는 기존 크기가 유지되며, 이미 등록된 HTML은 자동 변경되지 않는다. 같은 문구·이미지를 같은 폭에서 비교하고 줄바꿈·잘림·가로 넘침·가독성을 확인한다. 로컬 검수에는 운영 배포가 필요 없다.

기준 HEAD `2ba722d`, 브랜치 `main`. 이번 변경은 미커밋이다. 기존 `package.json` 변경, 미추적 `tools/`, `t`, `ers...` 항목을 보존했다. 아테나 2차 검수는 보류이며 AI 생성·이미지 등록·커밋·푸시·운영 배포·PM2 조작은 실행하지 않았다.

### 검수 후 사용할 반영 명령

권장 커밋 메시지: `수정: 프로필 사이트 출력 글자 크기와 간격 조정`

로컬 PowerShell에서 이번 파일만 스테이징한다. 스테이징된 다른 작업이 있으면 커밋 전에 분리한다.

```powershell
npm run check
node --test profile-maker/profile-typography.test.mjs profile-maker/profile-code-output.test.mjs profile-maker/profile-code-resizer.test.mjs profile-maker/profile-history.test.mjs
npm run test:code-resizer:browser
git diff --check
git diff
git add -- profile-maker/script.js profile-maker/index.html profile-maker/profile-code-resizer-ui.js profile-maker/profile-typography.test.mjs profile-maker/profile-code-output.test.mjs profile-maker/profile-code-resizer-browser.test.mjs PROFILE_CODE_RESIZER_REPORT.md
git diff --cached --stat
git diff --cached --check
git commit -m "수정: 프로필 사이트 출력 글자 크기와 간격 조정"
git push origin main
git status --short
```

운영 서버 Bash에서 각 단계 성공을 확인하고 다음 단계로 진행한다. 작업 트리에 변경이 있으면 먼저 확인한다.

```bash
cd /opt/hongcafe-ops-profile-integrated
git status --short
git pull --ff-only origin main
npm run check
git log -1 --oneline
pm2 reload hongcafe-ops-profile
curl -fsS -w '\nHTTP %{http_code}\n' http://127.0.0.1:3000/api/health
pm2 status
pm2 logs hongcafe-ops-profile --lines 50 --nostream
git status --short
git log -1 --oneline
```

정상 기준: 웹 서비스 online, HTTP 200 및 `ok: true`, 적용 커밋 일치, 새 오류 로그 없음. 정적 파일 변경이므로 웹 reload는 필요 시 실행하며 API 재시작은 필요 없다. 운영에서 아테나 로컬 검사 플래그를 켜지 않는다.

---

아래는 이전 작업 기록이다.

기준 커밋: `d4248bd`, 작업 브랜치: `main`.

기존 사이트 등록용 HTML을 붙여 넣거나 .txt/.html 파일로 불러와 제목·본문의 font-size만 변경하는 탭을 추가했다. 기본값은 사이트 코드 기준 42px/20px이며 제작 화면 기준 66px/35px도 선택할 수 있다. 새 프로필을 생성할 필요가 없고 AI 호출이나 과금이 발생하지 않는다.

## 보존 범위

- 기존 제작·이미지·히스토리·과금·라우팅 코드는 수정하지 않았다.
- HTML을 다시 직렬화하지 않고 원문 위치에 해당하는 font-size 값 교체 또는 font-size 선언/속성 추가만 수행한다.
- 제목: 대표 제목, 카드 h3, 마무리 h3. 본문: 소개, 상세 본문, 카드 본문, 마무리 문장, 글머리표 및 내부 강조·링크 텍스트.
- 라벨·배지·글머리표 장식·이미지는 교정 대상에서 제외한다.
- 글자 크기 변경 이외의 텍스트, 공백, 주석, 태그, 이미지 주소, 링크, 글꼴, 색상, 굵기, 여백, 테두리 등 원문은 그대로 유지한다.
- 글자 크기를 변경하면 줄바꿈·높이, em 등 글자 크기에 의존하는 실제 길이는 달라질 수 있다. 다른 CSS 지정값은 변경하지 않는다.
- 변경된 부분을 되돌리면 원본과 문자 단위로 일치하는지 검사한다. 브라우저가 해석한 구조·내용·속성 및 font-size 외의 인라인 스타일도 별도로 비교하고, 실패하면 복사·저장을 차단한다.
- 구조가 불명확하거나 브라우저가 태그를 자동 보정하는 코드, 클래스가 제거된 코드, 실행 태그, 복잡한 CSS 인코딩·주석 등은 추측해서 변환하지 않는다. 지원 범위는 기존 빌더의 HTML 조각이다.
- 미리보기는 별도 sandbox iframe에서 스크립트·외부 스타일을 차단한다. 미리보기용 보안 설정은 결과 코드에 삽입하지 않는다. 외부 이미지 URL은 미리보기 버튼을 눌렀을 때 로드될 수 있다.

## 수정 파일

| 파일 | 변경 |
|---|---|
| profile-maker/index.html | 제작/크기 조정 탭, 입력·출력·미리보기, 두 크기 기준 안내 |
| profile-maker/style.css | 탭과 교정 도구 전용 스타일, 기존 결과 스타일 유지 |
| profile-maker/profile-code-resizer.js | 원문 위치 기반 크기 수정과 보존 검증 |
| profile-maker/profile-code-resizer-ui.js | 탭, 파일 읽기, 변환, 복사, 저장, 격리 미리보기 |
| profile-maker/profile-code-resizer.test.mjs | 세 카테고리 원문 보존, 반복 변환, 중첩 서식, 실패 처리 |
| profile-maker/profile-code-resizer-browser.test.mjs | Chrome DOM·계산 스타일·탭·파일·복사·저장 검증 |
| package.json | 구문 검사 및 테스트 명령 연결. 의존성 변경 없음 |
| PROFILE_CODE_RESIZER_REPORT.md | 작업 결과와 반영 명령 |

## 검증 결과

- `npm run check`: 통과.
- `npm test`: 118/118 통과.
- 로컬 Chrome 브라우저 검사: 1/1 통과. 최초 샌드박스 내 Chrome 프로세스 실행 제한으로 실패하여 승인 후 샌드박스 밖에서 검사했다.
- 테스트 HTML에서 제목 42px, 본문 및 중첩 강조 20px, 라벨 12px 유지 확인.
- 계산된 색상·배경·글꼴·굵기·자간·정렬·여백·테두리·display 유지 확인.
- 제목 문구·여백·굵기를 고의로 변경한 코드 및 브라우저 자동 보정 HTML 차단 확인.
- 탭 전환 시 기존 캔버스 노드와 입력 유지, 입력 변경 및 비동기 파일 읽기 완료 시 이전 출력 차단 확인.
- 복사 문자열·저장 Blob이 검증된 결과와 일치함을 확인. 브라우저 검사에서는 클립보드와 다운로드를 대체 함수로 검증했다.
- 기존 생성 스크립트/API는 브라우저 검사에서 로드하지 않았다. 실제 운영 데이터나 문제가 발생했던 사용자 HTML을 이용한 육안 검수는 수행하지 않았다.
- 전체 diff 및 신규 파일 검토, `git diff --check`와 신규 파일 공백 검사 통과.

현재 Git 상태: 추적 파일 3개 수정, 신규 작업 파일 5개. 기존 미추적 `t`, `ers...` 2개 보존. 커밋·푸시·운영 반영·PM2 조작 미수행.

## 로컬 검사 및 커밋·푸시 명령 (안내용, 미실행)

아래 절차는 각 단계가 성공한 경우에만 다음 단계로 진행한다. 동일 코드에서 이미 통과한 검사는 불필요하게 반복할 필요가 없다. 브라우저 테스트는 Chrome이 설치된 로컬에서 실행하며, 기본 경로가 다르면 PROFILE_TEST_CHROME 환경변수로 지정한다. Chrome이 없으면 skip된다.

```powershell
npm run check
npm test
npm run test:code-resizer:browser
git diff --check
git diff
git status --short --branch
git add package.json profile-maker/index.html profile-maker/style.css profile-maker/profile-code-resizer.js profile-maker/profile-code-resizer-ui.js profile-maker/profile-code-resizer.test.mjs profile-maker/profile-code-resizer-browser.test.mjs PROFILE_CODE_RESIZER_REPORT.md
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "기능: 원본 디자인을 보존하는 프로필 코드 크기 조정 추가"
git push origin main
git log -1 --oneline
git status --short --branch
```

## 운영 반영 명령 (안내용, 미실행)

서버에 사용자 수정이 없는지 먼저 확인한다. 아래 3000은 웹 서버 코드의 기본 포트이므로 실제 운영 PORT가 다르면 해당 포트로 바꾼다. 3100은 기존 프로필 API 포트다.

```bash
cd /opt/hongcafe-ops-profile-integrated
git status --short --branch
git pull --ff-only origin main
npm run check
git log -1 --oneline
curl --max-time 10 -sS -o /dev/null -w 'WEB_HTTP_STATUS=%{http_code}\n' http://127.0.0.1:3000/profile-maker/index.html
curl --max-time 10 -sS -o /dev/null -w 'RESIZER_HTTP_STATUS=%{http_code}\n' http://127.0.0.1:3000/profile-maker/profile-code-resizer.js
curl --max-time 10 -sS -o /dev/null -w 'RESIZER_UI_HTTP_STATUS=%{http_code}\n' http://127.0.0.1:3000/profile-maker/profile-code-resizer-ui.js
curl --max-time 10 -sS -w '\nAPI_HTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
```

정적 파일은 요청마다 읽으므로 이번 변경은 PM2 재시작 및 npm ci가 필요하지 않다. 브라우저에서 Ctrl+F5 후 프로필 제작 → 코드 크기 조정 탭을 확인한다. 운영 절차상 웹 프로세스 reload가 별도로 필요할 때만 다음 명령을 사용한다. 실행 전에 실제 서비스 이름을 확인한다. 인계 기준 웹 서비스는 hongcafe-ops-profile이다.

```bash
pm2 describe hongcafe-ops-profile
# 별도 승인 후 웹 서비스 reload가 필요한 경우에만 실행
pm2 reload hongcafe-ops-profile
```

프로필 API(hongcafe-profile-api)는 이번 변경으로 재시작할 필요가 없다. reload를 한 경우 위 HTTP 확인도 다시 수행한다.

최종 정상 기준: 정적 파일 HTTP 200, 기존 API HTTP 200 및 ok=true, 푸시한 커밋과 서버 커밋 일치, 서버 추적 파일 변경 없음. 브라우저에서 원본 코드를 붙여 넣어 검증 통과·원본 유지·제목/본문 크기·복사 및 저장 결과를 확인한다.

```bash
date '+%Y-%m-%d %H:%M:%S %Z'
pm2 status
pm2 logs hongcafe-ops-profile --lines 30 --nostream
git log -1 --oneline
git status --short --branch
```
