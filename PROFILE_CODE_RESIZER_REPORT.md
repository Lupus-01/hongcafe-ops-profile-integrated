# 프로필 코드 글자 크기 조정

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
