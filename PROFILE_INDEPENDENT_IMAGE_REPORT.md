# 프로필 이미지 독립 구도 개선

기준: 2026-09-08, main / 046376f. 사용자 승인 후 로컬 구현 및 모의 검증을 수행했다. 이 변경의 커밋·푸시·운영 반영·PM2 조작·유료 AI 호출은 수행하지 않았다.

## 변경 동작

타로 사진이 청록색 천 위의 카드 배열로 수렴하던 공통 지침을 해제했다. 새 타로 생성은 단일 카드, 카드 덱 질감, 보관·준비, 상담 공간 전경, 카드 그림자, 리딩 배열의 6개 촬영 유형에서 선택한다. 유형별 5개 기본 구도로 총 30개다. 리딩 배열은 6개 유형 중 하나이며, 청록색 매트는 그 안의 한 구도에만 명시한다.

한 상담사의 두 이미지는 촬영 유형이 달라야 하며 거리·받침·배경 중 최소 2개가 달라야 한다. 같은 카드 계열 선택은 유지한다. 최근 4개 이미지에 사용된 유형을 피하는 후보를 우선하고, 누적 유형 사용량을 먼저 비교한 뒤 기존 구도·색감 점수를 적용한다. 후보 검색은 32~128회로 제한되며 이는 AI 호출이 아닌 로컬 배정 계산이다. 임의 입력 전체에서 최근 유형 반복이 항상 0임을 보장하지는 않는다.

참고 이미지에서는 호환되는 사물 계열과 재질만 참고한다. 구도·배경·천 색·촬영 거리·조명은 배정된 장면이 우선한다. 공통 참고 이미지 규칙과 일반/고급 품질 지침은 사주·신점에도 적용된다. 사주·신점 장면 목록과 소재 호환 제한은 유지한다.

새 버전은 `profile-visual-v14-independent-shots`, 참고 정책은 `profile-reference-v3-material-only`다. 글 v9, 16:9, 인물 배제, 프론트엔드·CSS·라우팅·10초 AI 간격·과금 보호 흐름은 유지한다. 패키지 의존성이나 환경 변수 변경은 없다.

## 수정 파일

모든 아래 코드 파일은 `profile-maker-api/` 내부에 있다.

| 파일 | 핵심 변경 |
|---|---|
| server.mjs | 기본/품질/참고 지침 정리, 새 타로 장면 선택, 구조 분산 배정, 이력·공개 가이드 필드, v13 결과 재사용, 헬스 정보 |
| profile-scene-catalog.mjs | 촬영 유형별 독립 구도 30개 추가; 기존 ID 보존 |
| profile-visual-engine.mjs | 유형별 촬영 방향, 불필요한 방·천·배열 지침 배제, 실제 사용 지침 중심 ID 및 조합 수 |
| profile-generation-history.mjs | 촬영 유형·거리·받침·배경·카메라 높이 저장/복원 |
| profile-diversity-runtime.mjs | 서버 실행 없이 실제 배정·프롬프트 함수를 검증하는 범위 확장 |
| profile-visual-engine.test.mjs | 180명 배정 분산, 한 쌍 구조 차이, 참고 규칙, 기존 장면 복원 검사 |
| profile-version-replay.test.mjs | 직접 입력/문서, 이미지 유무, v11~v13 재사용 및 v13 만료 기록·요청 키 검사 |
| profile-generation-history.test.mjs | 새 구조 필드가 접수·완료·재시작 이후 유지되는지 검사 |
| profile-campaign-api.test.mjs | 모의 API의 버전·활성 촬영 유형·조합 정보 확인 |
| profile-expansion.test.mjs | 기존 장면 보존과 새 장면의 소재 호환성 검사 |
| profile-copy.test.mjs | 글 참고 입력 유지와 이미지 참고 정책 변경 확인 |
| profile-sinjeom-visual.test.mjs | 공통 이미지 버전 갱신 반영 |

## 검증 결과와 한계

- `npm run check`: 통과.
- `npm test`: 107/107 통과.
- `npm run test:diversity`: 저장·재개 검사 1/1 통과. 24,000건 검사는 반복하지 않았다.
- `git diff --check` 및 전체 코드 diff 검토 완료.
- 모의 타로 180명·360장: 6개 유형 각각 60장, 한 쌍의 구조 조건 모두 충족. 이 표본에서는 최근 4개 이미지와 유형 반복 0건.
- 모의 테스트는 임시 작업·사용량·생성 이력을 사용한다. 외부 AI 호출 0회.
- 실제 `.profile-usage.json`, `server/data/state.json`, `server/data/users.json`의 검사 전후 SHA-256 동일. 기본 생성 이력 파일을 만들지 않았다.
- 기존 v13 동일 입력은 새 참고 정책 버전에서도 기존 결과를 재사용한다. 만료 기록은 410으로 차단하며 새 생성이나 과금을 시작하지 않는다.
- 기존 결과는 자동 교체되지 않는다. 실제 사진과 브라우저 화면·다운로드는 이번에 검증하지 않았다. 실제 모델이 지침을 잘 따르는지와 작은 미리보기에서의 차이는 별도 유료 표본 승인 후 확인한다. 유사하다고 자동 재생성하지 않는다.

헬스의 기존 장면 수에는 복원용 구형 장면이 포함된다. 타로 전체 기본 장면은 150개이고 새 생성용 기본 장면은 `tarotActiveBaseSceneCount=30`이다. `tarotIndependentShootingTypes`는 6개다. 기존 장소 변주 ID 체계를 적용한 새 장면 ID는 300개이며, 이 숫자가 300개의 독립적인 큰 구도를 의미하지 않는다.

조합 수 역시 설정 공간 계산이다. 타로 계산에서는 사용하지 않는 공간·초점 등의 조합을 제외했다. 값이 작아진 것은 다양성 감소 측정 결과가 아니다. 픽셀 유사도 검사는 체감 독창성을 판정하지 않는다.

## Git 상태와 반영 명령 — 아래는 안내용, 미실행

기준 HEAD는 046376f. 추적 파일 12개 수정, 이 보고서 신규 1개다. 기존 미추적 `t`, `ers...`는 보존하며 커밋 대상에서 제외한다.

권장 커밋 메시지: `개선: 프로필 이미지 독립 구도와 참고 이미지 영향 분리`

로컬 검사는 위 결과로 완료했다. 추가 수정이 없다면 긴 검사를 반복할 필요는 없다. 변경 목록과 staged diff를 확인한 뒤 커밋한다. 아래 각 단계가 실패하면 다음 단계로 넘어가지 않는다.

```powershell
git diff --check
git diff --stat
git diff
git add -- PROFILE_INDEPENDENT_IMAGE_REPORT.md profile-maker-api/server.mjs profile-maker-api/profile-scene-catalog.mjs profile-maker-api/profile-visual-engine.mjs profile-maker-api/profile-generation-history.mjs profile-maker-api/profile-diversity-runtime.mjs profile-maker-api/profile-visual-engine.test.mjs profile-maker-api/profile-version-replay.test.mjs profile-maker-api/profile-generation-history.test.mjs profile-maker-api/profile-campaign-api.test.mjs profile-maker-api/profile-expansion.test.mjs profile-maker-api/profile-copy.test.mjs profile-maker-api/profile-sinjeom-visual.test.mjs
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "개선: 프로필 이미지 독립 구도와 참고 이미지 영향 분리"
git push origin main
git log -1 --oneline
git status --short --branch
```

운영 반영은 새 접수를 잠시 멈추고 대기·실행 작업이 없으며 서버 수정 파일도 없는지 확인한 뒤 수행한다. `hongcafe-ops-profile` 서비스는 이번 반영 대상이 아니다.

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

정상 기준: HTTP 200, `ok=true`, 포트 3100 대기, PM2 online, 서버 HEAD가 푸시한 커밋과 일치, 서버 수정 파일 없음. 이미지 버전 v14·참고 정책 v3·촬영 유형 6개·활성 기본 장면 30개, 글 v9, 운영 `profileAiMockMode=false`를 확인한다. 캠페인 모드에서는 `profileCampaignDailyLimitsEnforced=false`와 10초 간격을 유지한다.

재시작 직후에는 저장소 로딩 동안 연결이 거부될 수 있다. 최근 운영 기록에서는 약 20초가 걸렸지만 준비 시간은 달라질 수 있다. `[profile-startup] readyAt`·시각·포트·현재 PID의 로그를 확인한 뒤 헬스를 다시 조회하며, 연결 거부만으로 반복 재시작하지 않는다. 정상 상태 확인 후 접수를 재개한다.
