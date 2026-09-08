# 프로필 다양화 개선 및 1,800건 오프라인 검사

## 완료 범위

1,500건을 최초 배정하고 파일에 저장한 이력을 다시 읽은 뒤 300건을 추가하는 검사를 통과했다. 타로·사주·신점 각 600건, 총 1,800건의 글 배정과 3,600장의 이미지 배정을 검사했다. 외부 AI 호출은 0회다. 실제 글 1,800건이나 이미지 3,600장을 생성한 검사가 아니다.

| 분야 | 글 배정 조합 | 이미지 배정 조합 | 두 이미지의 촬영 방식이 같은 프로필: 이전 점수 방식 | 새 방식 |
|---|---:|---:|---:|---:|
| 타로 | 600/600 고유 | 1,200/1,200 고유 | 187/600 | 0/600 |
| 사주 | 600/600 고유 | 1,200/1,200 고유 | 132/600 | 0/600 |
| 신점 | 600/600 고유 | 1,200/1,200 고유 | 212/600 | 0/600 |
| 합계 | 1,800 | 3,600 | 531/1,800 | 0/1,800 |

대조군은 같은 후보 생성기와 입력을 사용하되 이전의 점수 선택 방식만 적용했다. 운영 v11의 실제 이미지와 v12의 실제 이미지를 비교한 결과가 아니다. 큰 구도 우선 점수의 효과를 분리해서 확인한 실험이다.

촬영 방식별 배정 수:

- 타로: 위에서 본 배열 338, 공간의 깊이 409, 소재 근접 453
- 사주: 공간의 깊이 442, 소재 근접 580, 넓은 공간 178
- 신점: 공간의 깊이 505, 소재 근접 583, 넓은 공간 112

같은 분야에서 여러 결과가 같은 촬영 방식을 공유할 수 있다. 이 검사는 1,800건 모두가 육안으로 완전히 다르다는 보장이 아니다. 검사 대상 규모가 서비스의 최대 제작 건수를 1,800건으로 제한하지도 않는다.

## 변경 내용과 파일

- `profile-maker-api/profile-copy-engine.mjs`: 원문 근거 우선 배치, 자료 부족 표시, 분야 공통 어휘의 의무 사용 제거, 상투적인 제목·마무리 회피. 원문에 없는 경력·사례를 만들도록 지시하지 않는다.
- `profile-maker-api/server.mjs`: 글 프롬프트의 보강·분량 지시 정리, 큰 구도 반복을 우선 줄이는 배정, 결과 유사도 연결, 동일 입력의 v7/v11 작업 재사용. 글 v8, 이미지 v12로 구분한다.
- `profile-maker-api/profile-visual-engine.mjs`: 주요 소재·배치·촬영 거리를 색감·소품보다 우선한다.
- `profile-maker-api/profile-generation-history.mjs`: 제목·문단별 서명과 이미지 특징 저장·비교. 원문 근거는 별도 이력 파일에 중복 저장하지 않는다. 기존 작업의 문단 서명은 최초 가져오기 때 보완하고 이후 재계산을 피한다.
- `profile-maker-api/profile-image-similarity.mjs`: 생성 결과의 PNG/JPEG/WebP 데이터를 로컬에서 비교한다. 동일 파일 및 형태·색상이 매우 가까운 후보를 찾으며, 의미나 예술적 독창성을 판단하지 않는다. 해석 실패 시 이미지를 보존하고 재생성하지 않는다.
- `profile-maker/script.js`: 제목/본문 반복과 이미지 유사 후보, 자료 부족, 검사 미완료를 구분해서 안내한다. 기존 CSS 원문 제거 로직은 유지한다.
- `profile-maker-api/profile-diversity-audit.mjs`: 기존 작업 디렉터리를 읽어서 분야별 최신 최대 20건의 검토 후보를 출력한다. 원본 수정, 이미지 URL 다운로드, 외부 AI 호출은 하지 않는다.
- `profile-maker-api/profile-diversity-runtime.mjs`: 서버를 기동하지 않고 실제 배정 함수를 실행하는 오프라인 검사 도구.
- `package.json`, `package-lock.json`: 이미지 분석용 sharp 0.34.5 계열과 검사 명령 추가. Node 지원 조건은 `^18.17.0 || ^20.3.0 || >=21.0.0`이다. 이미지 축소 방식은 [sharp 공식 문서](https://sharp.pixelplumbing.com/api-resize/)를 참고했다.
- 테스트 수정: `profile-campaign-api.test.mjs`, `profile-copy-engine.test.mjs`, `profile-copy.test.mjs`, `profile-generation-history.test.mjs`, `profile-sinjeom-visual.test.mjs`, `profile-visual-engine.test.mjs`, `profile-maker/profile-history.test.mjs`.
- 테스트 추가: `profile-diversity-scale.test.mjs`, `profile-image-similarity.test.mjs`, `profile-version-replay.test.mjs`, `profile-diversity-audit.test.mjs`.

## 검사 결과와 한계

- `npm run check`: 통과
- `npm test`: 최종 코드에서 85/85 통과
- `npm run test:diversity`: 1,800건 및 이전 점수 방식 대조 검사 통과, 약 196초
- `git diff --check`: 통과
- 기존 CSS 원문 제거, 10초 요청 간격, 순차 처리, 불확실한 요청 자동 재실행 차단 검사 유지
- 실제 이미지 대신 검사 전용 픽셀 자료로 PNG/JPEG 재인코딩 유사성, 서로 다른 색·배치, 손상 데이터 처리를 검사
- 원자료가 부족하면 고유 사실을 만들지 않는다. 원문 기반 특징 추출은 간단한 규칙이며 별도 AI 사실 검증이 아니다.
- 문단 비교 0.8 및 이미지 비교 0.94는 검토 후보를 찾는 초기 기준이다. 실제 운영 표본으로 정확도와 누락률을 조정해야 한다.
- 기존 이력에는 이미지 픽셀 특징이 없어 새 이미지의 운영 비교는 특징이 쌓인 결과부터 가능하다. 기존 이미지 전체를 시작 시점에 자동 해석하지 않는다.
- 로컬에 분야별 20건의 실제 결과물이 없어 실제 문구·사진에 대한 전후 육안 평가는 미수행이다. 유료 시험 생성과 기존 결과 교체, 배포도 미수행이다.
- 이전 v7/v11의 동일 입력은 기존 결과를 그대로 반환한다. 배포 후 같은 입력으로 다시 누르는 것만으로는 새 버전 결과가 생성되지 않는다.

## 현재 Git 상태

작업 기준 커밋: `16785ef`. 브랜치 `main`. 이번 작업 파일만 수정·추가했으며 커밋·푸시하지 않았다. 권장 커밋 메시지: `기능: 원문 중심 프로필 다양화와 1800건 배정 검증`.

## 로컬 검사 → 커밋 → GitHub 푸시

2026-09-08 실행 보강: 사용자 환경(Node v24.14.0)에서 91.6초 후 `cancelled 1`과 `Promise resolution is still pending but the event loop has already resolved`가 보고되었다. 같은 Node 버전으로 원본을 재실행했을 때는 약 241초에 통과하여 취소 현상이 재현되지 않았다. 정확한 발생 원인은 미확정이다. `profile-diversity-scale.test.mjs`의 긴 동기 반복을 비동기 테스트로 바꾸고 10건마다 [Node의 setImmediate](https://nodejs.org/api/timers.html#timerspromisessetimmediatevalue-options)로 실행 기회를 돌려준다. 100건마다 진행 상황을 출력하고 15분 제한을 명시했다. 1,800건, 대조군, 이력 복원, 모든 검증 조건은 유지한다. 운영 생성 코드는 이번 실행 보강에서 변경하지 않았다.

아래는 실행 안내이며 커밋·푸시는 수행하지 않았다. 검사가 성공하고 diff를 확인한 뒤 다음 단계로 진행한다.

보강본 재검사 결과: 약 237초에 `pass 1`, `fail 0`, `cancelled 0`, 종료 코드 0으로 완료했다. 1,800건 배정, 3,600개 이미지 배정, 이력 복원 및 대조군 결과가 원본과 일치했다. 외부 AI 호출 0회, 구문 검사와 diff 검사 통과. 이번 추가 수정 파일은 테스트와 이 보고서 2개이며 기존 미커밋 다양화 변경을 보존했다. 커밋 메시지는 위 다양화 기능 메시지를 그대로 사용하고 아래 전체 파일 목록에 포함해 커밋한다.

```powershell
npm run check
npm test
npm run test:diversity
git diff --check
git diff
git status --short --branch
git add package.json package-lock.json PROFILE_DIVERSITY_REPORT.md profile-maker-api/server.mjs profile-maker-api/profile-copy-engine.mjs profile-maker-api/profile-visual-engine.mjs profile-maker-api/profile-generation-history.mjs profile-maker-api/profile-image-similarity.mjs profile-maker-api/profile-diversity-runtime.mjs profile-maker-api/profile-diversity-audit.mjs profile-maker-api/profile-campaign-api.test.mjs profile-maker-api/profile-copy-engine.test.mjs profile-maker-api/profile-copy.test.mjs profile-maker-api/profile-generation-history.test.mjs profile-maker-api/profile-sinjeom-visual.test.mjs profile-maker-api/profile-visual-engine.test.mjs profile-maker-api/profile-diversity-scale.test.mjs profile-maker-api/profile-image-similarity.test.mjs profile-maker-api/profile-version-replay.test.mjs profile-maker-api/profile-diversity-audit.test.mjs profile-maker/script.js profile-maker/profile-history.test.mjs
git diff --cached --check
git diff --cached --stat
git commit -m "기능: 원문 중심 프로필 다양화와 1800건 배정 검증"
git push origin main
```

## 운영 코드 반영 → 서비스 재시작

별도 승인 후 실행한다. 기존 작업이 진행 중이면 완료 상태를 확인한 뒤 반영한다. 새 의존성이 있으므로 이번 배포에는 `npm ci`가 필요하다. 운영 Node 버전이 위 지원 조건을 충족해야 한다. 로컬 Windows 설치 결과만으로 운영 Linux 설치 성공까지 확인한 것은 아니다.

```bash
cd /opt/hongcafe-ops-profile-integrated
node --version
git status --short --branch
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
git pull --ff-only origin main && npm ci --omit=dev && npm run check && pm2 restart hongcafe-profile-api
```

## 헬스체크 → 로그 → Git 최종 상태

```bash
date '+%Y-%m-%d %H:%M:%S %Z'
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
ss -ltnp 'sport = :3100'
pm2 status hongcafe-profile-api
pm2 logs hongcafe-profile-api --lines 50 --nostream
git log -1 --oneline
git status --short --branch
```

정상 판정: HTTP 200, `ok=true`, `profileTextPromptVersion=profile-copy-v8-source-first`, `visualVariationVersion=profile-visual-v12-macro-balance`, 요청 간격 10000ms, 적용 커밋 일치. 시작 직후 연결이 거부되면 재시작을 반복하지 않고 로그와 포트 준비를 확인한다. 최초 문단 서명 보완으로 시작 작업량이 증가할 수 있으며 실제 운영 시작 시간은 미측정이다.

브라우저에서는 Ctrl+F5로 새로고침한다. 기존 프로필과 이미지, 이미 등록된 HTML은 자동 교체하지 않는다.

## 기존 결과 읽기 전용 감사

운영 명령은 아직 실행하지 않았다. 아래 경로는 서버 코드의 기본 작업 저장 경로이며 별도 설정을 사용 중이면 그 경로로 바꾼다.

```bash
node profile-maker-api/profile-diversity-audit.mjs /opt/hongcafe-ops-profile-integrated/profile-maker-api/.profile-jobs
```

이 결과의 `reviewPairs`는 사람이 비교할 후보이며 확정 중복 판정이 아니다. `unassessedImages`는 검사하지 못한 이미지 수다. 신뢰성 있는 최종 판단에는 해당 글과 이미지의 직접 비교가 필요하다.
