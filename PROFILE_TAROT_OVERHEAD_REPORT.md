# 타로 카드 하향 구도와 소품 확장 완료 보고

기준: 2026-09-08, 로컬 main / 401330f. 사용자 승인 후 구현·검증했다. 이번 변경은 미커밋이며 커밋·푸시·서버 반영·PM2 조작·유료 AI 생성은 실행하지 않았다.

## 변경 동작

타로 카드가 선반 위에 작게 배치되는 상담실 전경 대신, 새 타로 생성은 대표·무드 모두 카드를 수직으로 내려다보는 구도를 사용한다. 카드 배열이 화면 너비의 약 65~80%를 차지하고, 완전한 카드 앞면이 보이도록 지시한다. 소품은 카드 옆 여백에 한 세트만 배정하며 화면 면적의 최대 15%로 제한하는 프롬프트를 적용한다.

- 배열 6종: 3장 일렬, 4장 격자, 5장 얕은 곡선, 3장 삼각형, 5장 십자, 4장 계단 배열.
- 바닥 5종: 린넨, 호두나무, 벨벳, 펠트, 참나무. 총 30개 활성 기본 장면.
- 소품 21개 후보, 7개 계열: 펜듈럼 4종, 점성술 주사위 세트, 달 위상판·별자리 코스터, 파우치·상자·케이스·덱 보자기, 카드 받침, 노트·펜·메모·저널·책갈피, 수정·자수정·로즈쿼츠·원석 트레이.
- 한 세트에는 노트와 펜처럼 관련 물건이 함께 들어갈 수 있다. 주사위 세트는 별자리·행성·하우스용 주사위 3개다.
- 두 사진의 카드 계열은 유지하고 배열, 바닥 재질, 소품 계열, 팔레트를 다르게 배정한다.
- 최근 소품 계열 반복과 누적 소품 사용량을 후보 평가에 반영한다. 후보 탐색은 기존의 32~128회 로컬 계산이며 AI 호출이 아니다. 모든 입력에서 반복이 없다는 보장은 아니다.
- 펜듈럼 체인은 바닥에 놓고 주사위는 서로 분리하며 카드와 겹치지 않도록 지시한다.
- 타로·사주·신점 분야 경계는 유지한다. 사주·신점에는 새 타로 소품 배정과 소품 반복 점수를 적용하지 않는다.

이미지 버전은 `profile-visual-v15-overhead-accessories`. 참고 정책 v3와 글 v9는 유지한다. 이미지 버전은 공통 값이므로 사주·신점의 새 요청에도 v15가 표시되고 버전을 사용하는 배정 시드가 달라질 수 있지만, 해당 분야의 장면·소재·촬영 규칙은 변경하지 않았다.

## 보존과 적용 범위

- 프론트엔드, CSS, 라우팅, 16:9, 실제 AI 요청 10초 간격, 의존성, 환경 변수는 변경하지 않았다.
- 기존 장면 ID와 구형 타로 장면용 지침은 복원용으로 보존했다. v14 공간·근접 장면은 새 배정에서 제외하며 복원 시 새 소품을 추가하지 않는다.
- 기존 완료 결과는 그대로 재사용한다. v14 동일 입력을 v15에서 다시 요청해도 자동 유료 재생성을 시작하지 않는다. v11~v13 재사용 보호도 유지했다.
- 재시작 후 v14 요청 키와 만료 기록을 확인한다. 만료 결과는 410으로 차단하고 신규 과금을 시작하지 않는다.
- 기존 사진은 자동 교체하지 않는다. 배포 후 같은 입력을 다시 제출해도 기존 이미지가 반환될 수 있다.
- 전체 타로 기본 장면 수 180에는 복원용 장면 150개가 포함된다. 새 생성 기본 장면은 30개이며, 기존 재질 변주 ID 체계를 적용하면 300개 ID다. 300개의 독립 구도를 의미하지 않는다.
- 헬스의 조합 수는 설정 공간 계산이며 실제 이미지 수, 시각적 독창성 또는 정확도 보장이 아니다.

## 수정 파일

| 파일 | 변경 |
|---|---|
| profile-maker-api/server.mjs | 소품 21개, 활성 장면 필터, 한 쌍 배정, 하향 프롬프트·중력 지침, 소품 이력·반복 점수, v14 재사용, 헬스 정보 |
| profile-maker-api/profile-scene-catalog.mjs | 카드 중심 하향 기본 장면 30개 추가 |
| profile-maker-api/profile-visual-engine.mjs | v15 버전과 하향 장면의 보조 촬영 지침 |
| profile-maker-api/profile-generation-history.mjs | 소품 ID·계열 저장 및 복원 |
| profile-maker-api/profile-visual-engine.test.mjs | 배정 분산·하향 구도·소품 배정·기존 장면 복원 검사 |
| profile-maker-api/profile-sinjeom-visual.test.mjs | 일반/고급 × 대표/무드 × 소품 21개 최종 지침 및 분야 경계 검사 |
| profile-maker-api/profile-generation-history.test.mjs | 소품 필드 접수·완료·재시작 복원 검사 |
| profile-maker-api/profile-version-replay.test.mjs | v11~v14 재사용과 v14 만료 기록·요청 키 재시작 검사 |
| profile-maker-api/profile-campaign-api.test.mjs | 모의 API의 버전·장면·소품 수·조합 정보 검사 |
| profile-maker-api/profile-expansion.test.mjs | 복원용 장면과 신규 장면 수·호환성 검사 |
| PROFILE_TAROT_OVERHEAD_REPORT.md | 변경·검증 결과와 반영 명령 |

## 검증 결과

- `npm run check`: 통과.
- `npm test`: 110/110 통과.
- `npm run test:diversity`: 저장·재개와 연속 배정 비교 1/1 통과.
- 모의 타로 180명·360장: 배열 6종 각각 60장, 해당 표본의 최근 4장과 배열 반복 0건, 소품 21개 모두 사용.
- `git diff --check`: 통과. 전체 변경 diff 검토 완료.
- 외부 유료 AI 호출 없음. 테스트는 모의 AI와 임시 저장소를 사용했다.
- 실제 생성 사진·브라우저 화면은 검증하지 않았다. 카드 그림·주사위 기호·펜듈럼 형태의 정확성은 실제 결과를 보고 확인해야 한다.

## Git 상태

현재 HEAD는 401330f이며 로컬 origin/main 참조와 일치한다. 위 코드·테스트 10개 파일의 미커밋 수정과 이 신규 보고서가 있다. 기존 미추적 `t`, `ers…` 항목은 보존했고 커밋 대상에서 제외한다. 이번 작업에서 원격 최신 상태를 조회하거나 운영 서버에 접속하지 않았다.

권장 커밋 메시지: `개선: 타로 카드 하향 구도 복원과 상담 소품 확장`

## 로컬 커밋·GitHub 푸시 — 사용자 실행용

로컬 검사 완료 후 diff 확인 → 명시한 파일만 스테이징 → 커밋 → 푸시 순서다. 아래 명령은 안내이며 실행하지 않았다. 각 명령이 실패하면 다음 단계로 넘어가지 않는다.

```powershell
git diff --check
git diff --stat
git diff

$tarotChangeFiles = @(
    'profile-maker-api/server.mjs'
    'profile-maker-api/profile-scene-catalog.mjs'
    'profile-maker-api/profile-visual-engine.mjs'
    'profile-maker-api/profile-generation-history.mjs'
    'profile-maker-api/profile-visual-engine.test.mjs'
    'profile-maker-api/profile-sinjeom-visual.test.mjs'
    'profile-maker-api/profile-generation-history.test.mjs'
    'profile-maker-api/profile-version-replay.test.mjs'
    'profile-maker-api/profile-campaign-api.test.mjs'
    'profile-maker-api/profile-expansion.test.mjs'
    'PROFILE_TAROT_OVERHEAD_REPORT.md'
)
git add -- $tarotChangeFiles
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "개선: 타로 카드 하향 구도 복원과 상담 소품 확장"
git log -1 --oneline
git status --short --branch
git push origin main
git status --short --branch
```

## 운영 반영·PM2·헬스·로그 — 사용자 실행용

새 접수를 잠시 멈추고, 서버에 미커밋 변경이 없으며 대기·실행 중 작업이 없는지 확인한 후 반영한다. 별도 서비스 `hongcafe-ops-profile`은 조작하지 않는다.

```bash
cd /opt/hongcafe-ops-profile-integrated
date '+%Y-%m-%d %H:%M:%S %Z'
git status --short --branch
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
```

상태 확인 후:

```bash
git pull --ff-only origin main && npm run check && pm2 restart hongcafe-profile-api
```

기동 준비를 기다린 뒤:

```bash
date '+%Y-%m-%d %H:%M:%S %Z'
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
ss -ltnp 'sport = :3100'
pm2 status hongcafe-profile-api
pm2 logs hongcafe-profile-api --lines 40 --nostream
git log -1 --oneline
git status --short --branch
```

정상 판정 기준:

- HTTP 200, `ok=true`, 3100 LISTEN, `hongcafe-profile-api` online.
- 서버 HEAD가 사용자가 이번에 푸시한 커밋과 일치하고 서버 미커밋 변경 없음.
- `visualVariationVersion=profile-visual-v15-overhead-accessories`.
- `tarotAccessoryCount=21`, `tarotActiveBaseSceneCount=30`, `tarotIndependentShootingTypes`에 새 배열 6종.
- 참고 정책 `profile-reference-v3-material-only`, 글 `profile-copy-v9-expanded-editorial`.
- 운영 `profileAiMockMode=false`, 캠페인 모드의 일일 제한 미적용 정책과 `geminiMinRequestIntervalMs=10000` 유지.
- 새 접수를 멈춘 상태에서는 대기 작업 0, 워커 실행 없음.

직전 운영 로그의 준비 시간은 약 20.7초였다. 재시작 직후 연결 거부만으로 다시 재시작하지 말고 `[profile-startup] readyAt`, 현재 Node PID, 포트와 시각을 확인한다. 이번 v15 운영 반영 결과는 아직 확인하지 않았다.
