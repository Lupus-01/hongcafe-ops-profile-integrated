# 타로 구도·조명·천 표현 확장

2026-09-09, 기준 커밋 88bd42b. 사용자 승인에 따라 로컬 구현했다. 커밋·푸시·운영 배포·유료 이미지 생성은 실행하지 않았다.

## 결과

- 구도 12개 추가: 하향 4, 사선 2, 근접 2, 덱 디테일 1, 카드 팩 3.
- 추가 구도는 상단 부채꼴과 3장 일렬/6장 격자, 좌우 부채꼴과 중앙 카드, 열린 원형, S자 배열, 한쪽 부채꼴과 반대쪽 리딩 배열, 후방 부채꼴과 전경 2장, 비대칭 L자 배열, 직각으로 나눈 두 덱, 후방 팩과 긴 전경 부채꼴, 열린 팩과 양쪽 리딩 영역, 후방 소수 팩과 전경 격자다.
- 팩 구도에는 기존 카드 계열별 표지 3종이 연결된다. 따라서 새 기본 장면 ID는 18개(일반 9 + 팩 3×3)이며, 큰 구도 수는 12개다.
- 활성 기본 장면 ID 114 → 132. 물리적 구도는 사선 5, 근접 5, 하향 7, 덱 디테일 4, 카드 팩 21로 총 42개다. 장면 ID나 조명·천 변형을 큰 구도 수로 세지 않는다.
- 전체 팩 구도 21 × 표지 디자인 42 = 지침 조합 882개. 표지 디자인 자체는 기존 42종을 유지한다.
- 새 장면에만 타로 전용 조명 6종을 추가했다: 대각선 창빛, 밝은 확산광, 따뜻한 실내 간접광, 중립광과 약한 따뜻한 보조광, 종이층을 드러내는 낮은 측면광, 넓고 부드러운 빛.
- 새 장면에만 천 표현 6종을 추가했다: 린넨, 짧은 결 벨벳, 저광택 새틴, 작은 체크, 절제된 식물 선무늬, 가는 별자리 선무늬. 기존 배정 천 색상을 유지한다.
- 근접·덱 디테일은 복잡한 무늬를 제외한다. 새틴은 대각선 그림자 띠와 낮은 측면광을 제외한다. 그림자는 여백에 두고 카드 그림을 가리지 않는다.
- 새 장면의 허용 조명·천 조합은 일반 34개, 근접/덱 디테일 16개다. 광원·촛불·추가 소품을 무조건 생성하지 않는다.
- 장면 구조를 먼저 순환하고, 최근 8개의 새 장면 조명·천 조합 및 누적 사용량으로 후보를 비교한다. 저장된 구도·조명·표면을 재시작 후 복원한다.

## 보존 및 한계

- 기존 장면 정의·ID, 기존 조명 선택 순서, 카드 계열, 기존 결과 재사용을 유지한다. 사주·신점에는 새 조명·천 선택지를 적용하지 않는다.
- 실제 사람·손, 종교 공간·무속 도구·사주표 혼합, 상용 도안·로고·읽을 수 있는 문자 복제, 공중 부양·변형·과도한 반사·발광·연기 금지는 유지한다.
- 앞면 카드는 완전히 드러내며, 명시적으로 배정한 뒷면 부채꼴·호의 규칙적인 겹침만 허용한다. 그림에 있는 인물과 건축물은 인쇄 삽화로만 취급한다.
- 새 조명·천은 기존 저장된 장면에 소급 적용하지 않는다. 새 생성에서도 새 구도가 배정된 사진에만 사용된다. 이전 결과 자동 재생성은 없다.
- 모든 구도를 소진하면 순환 재사용한다. 실제 모델이 프롬프트를 항상 지키거나 사진이 항상 다르게 보인다는 보장은 아니다. 실제 사진·브라우저 화면은 이번에 생성하거나 검사하지 않았다.

## 수정 파일

| 파일 | 변경 |
|---|---|
| profile-maker-api/profile-scene-catalog.mjs | 새 구도 12개와 기본 ID 18개, 천 무늬 호환 조건 |
| profile-maker-api/profile-visual-engine.mjs | 새 타로 조명·천 선택, 호환 검사, 결정적 복원, 유효 조합 계산 |
| profile-maker-api/server.mjs | 공개 가이드·이력에 surfaceId/editorialPolicy, 반복 완화, 헬스 정보 |
| profile-maker-api/profile-generation-history.mjs | 표면 ID와 정책 저장·복원 |
| profile-maker-api/profile-visual-engine.test.mjs | 조명·천 호환 조합, 복원, 기존 선택지 보존, 팩 882개 지침 검사 |
| profile-maker-api/profile-sinjeom-visual.test.mjs | 대표·무드 × 일반·고급 최종 프롬프트 및 금지 조건 검사 |
| profile-maker-api/profile-generation-history.test.mjs | 새 이력 필드 저장·재시작 검사 |
| profile-maker-api/profile-campaign-api.test.mjs | 헬스 카탈로그 및 조합 계산 검사 |
| profile-maker-api/profile-expansion.test.mjs | 새 장면 수와 카테고리 호환 검사 |
| profile-maker-api/profile-tarot-diversity.test.mjs | 2,000명 구도 순환·조명·천 사용량과 반복률 검사 |
| PROFILE_TAROT_LIGHTING_REPORT.md | 이번 변경·검증·반영 명령 |

## 검증 결과

- npm run check: 통과.
- npm test: 114/114 통과.
- npm run test:diversity: 저장·재개 일치 1/1 통과.
- node --test profile-maker-api/profile-tarot-diversity.test.mjs: 2,000명·4,000장 검사 1/1 통과.
- 새 기본 장면 18개 각각에 대해 허용 조명·표면 34개 또는 16개가 실제 선택되는지, JSON 복원 뒤 동일한지 검사했다.
- 구도별 배정: 사선 5개 각각 200장, 근접 5개 각각 200장, 하향 7개 각각 114~115장, 덱 디테일 4개 각각 150장, 팩 21개 각각 28~29장. 구도 한 바퀴를 돌기 전 조기 반복 0건.
- 새 조명·천을 사용하는 장면은 총 1,490장. 조명 6종 각각 248~249회, 천 표현 6종 각각 247~250회.
- 새 장면에서 최근 8개의 조명·천 조합과 겹친 경우 15건(약 1.0%). 반복 완화이며 반복 0건 보장은 아니다.
- 이 표본에서는 팩 표지 41종과 종이 구조 6종 사용. 전체 표지 42종의 지침 호환은 별도 882개 조합 검사에서 확인했다.
- 외부 유료 AI 호출 0회. 실제 이미지 생성, 운영 조회·재시작, 24,000건 부하 검사는 수행하지 않았다.
- git diff --check 통과, 전체 코드·테스트 diff 검토 완료.

## 로컬 커밋·푸시 안내 — 미실행

main, 기준 HEAD 88bd42b. 이번 작업은 추적 파일 10개 수정과 새 보고서 1개다. 기존 미추적 t, ers...는 제외한다.
권장 커밋 메시지: `개선: 타로 구도와 조명 및 천 표현 다양성 확장`

이미 통과한 테스트는 추가 변경이 없다면 반복할 필요가 없다. 프로젝트 루트 PowerShell에서 각 단계의 성공 여부를 확인하며 진행한다.

```powershell
git diff --check
git diff --stat
git diff
git add -- PROFILE_TAROT_LIGHTING_REPORT.md profile-maker-api/profile-scene-catalog.mjs profile-maker-api/profile-visual-engine.mjs profile-maker-api/server.mjs profile-maker-api/profile-generation-history.mjs profile-maker-api/profile-visual-engine.test.mjs profile-maker-api/profile-sinjeom-visual.test.mjs profile-maker-api/profile-generation-history.test.mjs profile-maker-api/profile-campaign-api.test.mjs profile-maker-api/profile-expansion.test.mjs profile-maker-api/profile-tarot-diversity.test.mjs
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "개선: 타로 구도와 조명 및 천 표현 다양성 확장"
git log -1 --oneline
git status --short --branch
git push origin main
git status --short --branch
```

## 운영 반영 및 정상 판정 — 미실행

새 접수를 잠시 중단하고 대기·실행 작업이 없으며 서버에 미커밋 변경이 없는지 확인한 뒤 반영한다. 별도 hongcafe-ops-profile 서비스는 조작하지 않는다.

```bash
cd /opt/hongcafe-ops-profile-integrated
date '+%Y-%m-%d %H:%M:%S %Z'
git status --short --branch
git log -1 --oneline
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
```

확인 후:

```bash
git pull --ff-only origin main && npm run check && pm2 restart hongcafe-profile-api
```

기동 완료 후 헬스·로그·최종 Git 상태 확인:

```bash
date '+%Y-%m-%d %H:%M:%S %Z'
pm2 status hongcafe-profile-api
pm2 logs hongcafe-profile-api --lines 40 --nostream
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
ss -ltnp 'sport = :3100'
git log -1 --oneline
git status --short --branch
```

정상 기준:

- HTTP 200, ok=true, hongcafe-profile-api online, 3100 LISTEN, 기동 readyAt의 Node PID와 포트 점유 PID 일치.
- 서버 HEAD가 방금 푸시한 커밋과 일치하며 서버 변경 파일 없음.
- tarotEditorialCatalog: policy=tarot-editorial-v1-layout-light-surface, layoutCount=12, baseSceneCount=18, lightingDirections=6, surfaceTreatments=6.
- tarotActiveBaseSceneCount=132. tarotPackCatalog: layoutCount=21, structureCount=6, designCount=42, compatibleDesignLayoutCount=882.
- 기존 visualVariationVersion=profile-visual-v16-oblique-tables, tarotDiversityPolicyVersion=tarot-diversity-v2-printed-packs, 글 v9와 참고 정책 v3 유지. 이번 확장은 별도 tarotEditorialCatalog.policy로 확인한다.
- 운영 profileAiMockMode=false, 기존 캠페인 설정과 geminiMinRequestIntervalMs=10000 유지.

지난 서버 기동은 약 21초였지만 이번 소요 시간은 달라질 수 있다. 로딩 중 연결 거부만으로 반복 재시작하지 않는다. 새 readyAt·시각·PID와 헬스 정상 상태를 확인한 뒤 접수를 재개한다.
