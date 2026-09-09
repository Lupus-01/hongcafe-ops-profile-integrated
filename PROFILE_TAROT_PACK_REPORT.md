# 타로 카드 팩과 상담 책상 생성군 확장

2026-09-09. 사용자 승인으로 구현. 기준 HEAD `5ea0039`.
이 문서는 이번 카드 팩 변경의 기준이며 이전 PROFILE_INDEPENDENT_IMAGE_REPORT.md의 과거 Git 상태·생성군 수와 구분한다.

## 결과

- 종이 카드 팩, 실제 덱, 완전한 앞면 카드, 배정된 천과 소품이 함께 있는 숙련된 타로 상담사의 책상 구도를 추가했다.
- 팩만 놓인 제품 사진, 빈 나무 정리함, 나무·금속 패키지로의 대체를 금지했다. 새 팩 촬영군에서는 빈 나무 상자와 빈 카드 받침 소품도 배정하지 않는다.
- 기존 14개 카드 계열마다 표지 디자인 3종: 총 42종. 이름·로고·기존 상용 도안을 복제하지 않는 인쇄 디자인 지침이다. 이미지 파일 42장을 만든 것은 아니다.
- 기본 배치 18종, 종이 보관함 구조 6종. 각 배치에는 호환되는 구조 하나를 명시한다. 표지 42종 × 배치 18종 = 호환 지침 조합 756개. 고정 카드 계열에서는 54개다.
- 종이 구조는 접이식 팩, 분리 뚜껑, 슬리브·트레이, 책형, 자석 덮개, 소형 케이스다. 구조 수나 조명·천 색상을 다시 곱해 독립 구도 수로 설명하지 않는다.
- 새 기본 장면 ID는 배치 18 × 표지 변형 3 = 54개다. 기존 활성 ID 60개와 합쳐 114개이며, 114개의 독립적인 큰 구도라는 의미가 아니다.
- 촬영군 목표 비중: 사선 25%, 근접 25%, 하향 20%, 덱 디테일 15%, 카드 팩 15%. 개별 요청의 보장 확률이 아닌 누적 배정 가중치다.
- 같은 상담사의 두 사진은 다른 촬영군과 천 색상을 유지한다. 물리적 구도를 먼저 순환 배정한 뒤 표지·천·소품 후보를 선택한다. 최근 팩 6장의 디자인·배치 조합 반복 검사도 유지한다.
- 기존 분야·장소 경계, 실제 인물·손·공중 부양·공포·상용 도안 복제 금지를 유지한다. 인쇄된 2차원 팩 삽화만 카드 삽화와 동일하게 허용하며 실제 배경이나 인물로 확장하지 않는다.
- 기존 결과 재사용·저장된 장면 ID·기존 비팩 장면의 다양성 정책 ID를 보존한다. 자동 유료 재생성은 없다.

## 수정 파일

- `profile-maker-api/profile-scene-catalog.mjs`: 42종 표지, 구조 6종, 배치 18종, 새 장면 54개.
- `profile-maker-api/server.mjs`: 팩 최종 프롬프트, 소품 호환, 가중치, 반복 완화, 공개 가이드·이력 필드, 헬스 정보와 유효 소품을 반영한 조합 계산.
- `profile-maker-api/profile-visual-engine.mjs`: 팩·카드·소품이 함께 있는 책상과 촬영 방향 유지.
- `profile-maker-api/profile-generation-history.mjs`: packLayoutId, packStructureId, packDesignId 저장·복원.
- `profile-maker-api/profile-visual-engine.test.mjs`: 756개 디자인·구도 지침, 모의 배정과 복원 검사.
- `profile-maker-api/profile-generation-history.test.mjs`: 팩 식별자 저장·재시작 복원 검사.
- `profile-maker-api/profile-sinjeom-visual.test.mjs`: 일반·고급 및 대표·무드 최종 프롬프트의 팩 지침과 금지 조건 검사.
- `profile-maker-api/profile-campaign-api.test.mjs`: 헬스 정보와 중복 요청 API 검사.
- `profile-maker-api/profile-expansion.test.mjs`: 추가 카탈로그 및 기존 호환 검사 갱신.
- `profile-maker-api/profile-tarot-diversity.test.mjs`: 2,000명·4,000장 장기 배정, 물리적 구도 반복과 이력 재로딩 검증.
- `PROFILE_TAROT_PACK_REPORT.md`: 결과·검증·운영 안내.

## 검증

- `npm run check`: 통과.
- `npm test`: 112/112 통과. 최초 실행에서 기존 카탈로그 개수 예상값 270이 실패하여 새 개수 324와 디자인을 포함한 중복 검사를 반영한 뒤 전체 통과.
- `npm run test:diversity`: 저장·재개 일치 검사 1/1 통과. 대규모 24,000건 검사는 실행하지 않았다.
- 모의 180명·360장: 사선 90, 근접 90, 하향 72, 덱 디테일 54, 팩 54. 천 색상 10종 각각 36장.
- 고정 카드 계열의 팩 배치 18종과 표지 3종 모두 사용. 해당 표본에서 최근 팩 6장의 디자인·배치 조합 반복 0건, 최근 촬영군·천·배경 조합 반복 0건.
- 14개 계열 × 54개 팩 장면의 756개 최종 변주 지침 조합 확인.
- `git diff --check`: 통과. 전체 코드·테스트 diff 검토 완료.
- 테스트는 오프라인 배정 또는 모의 API로 수행했다. 유료 AI 호출·실제 이미지 생성·브라우저 육안 검증·운영 서버 접속은 하지 않았다. 실제 생성 결과의 품질은 별도 표본 검증이 필요하다.

## Git 상태 및 로컬 반영 명령 — 안내만, 미실행

기준 브랜치 main, HEAD 5ea0039. 위 9개 추적 코드·테스트 파일 수정과 새 장기 검증 테스트·보고서가 이번 대상이다. 기존 미추적 t, ers... 항목은 제외한다. 커밋·푸시·운영 반영은 수행하지 않았다.

권장 커밋 메시지: `개선: 타로 카드 팩 디자인과 상담 책상 생성군 확장`

프로젝트 루트 PowerShell에서 각 단계가 성공한 경우에만 다음 단계로 진행한다. 코드 변경이 없다면 통과한 테스트를 다시 실행할 필요는 없다.

```powershell
git diff --check
git diff --stat
git diff
git add -- PROFILE_TAROT_PACK_REPORT.md profile-maker-api/profile-scene-catalog.mjs profile-maker-api/server.mjs profile-maker-api/profile-visual-engine.mjs profile-maker-api/profile-generation-history.mjs profile-maker-api/profile-visual-engine.test.mjs profile-maker-api/profile-generation-history.test.mjs profile-maker-api/profile-sinjeom-visual.test.mjs profile-maker-api/profile-campaign-api.test.mjs profile-maker-api/profile-expansion.test.mjs profile-maker-api/profile-tarot-diversity.test.mjs
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "개선: 타로 카드 팩 디자인과 상담 책상 생성군 확장"
git log -1 --oneline
git status --short --branch
git push origin main
git status --short --branch
```

## 운영 반영 명령 — 안내만, 미실행

새 접수를 잠시 중단하고 현재 작업이 없으며 서버 작업 트리에 변경이 없는지 확인한 뒤 반영한다. 헬스 출력에서 대기·실행 작업이 남아 있으면 진행하지 않는다. 별도 hongcafe-ops-profile 서비스는 조작하지 않는다.

```bash
cd /opt/hongcafe-ops-profile-integrated
date '+%Y-%m-%d %H:%M:%S %Z'
git status --short --branch
git log -1 --oneline
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
```

확인 후 아래를 실행한다. 앞 단계 실패 시 뒤 단계는 실행되지 않는다.

```bash
git pull --ff-only origin main && npm run check && pm2 restart hongcafe-profile-api
```

헬스·로그 및 최종 상태 확인:

```bash
date '+%Y-%m-%d %H:%M:%S %Z'
pm2 status hongcafe-profile-api
pm2 pid hongcafe-profile-api
pm2 logs hongcafe-profile-api --lines 80 --nostream
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
ss -ltnp 'sport = :3100'
git log -1 --oneline
git status --short --branch
```

정상 기준:

- HTTP 200, ok=true, PM2 online, 3100 LISTEN, 서버 HEAD가 푸시한 커밋과 일치하며 서버 추적 파일 변경 없음.
- tarotDiversityPolicyVersion = tarot-diversity-v2-printed-packs.
- tarotPackCatalog: layoutCount=18, structureCount=6, designCount=42, compatibleDesignLayoutCount=756.
- tarotActiveBaseSceneCount=114, 촬영군 5개, deck-pack 가중치 15.
- 기존 visualVariationVersion=profile-visual-v16-oblique-tables와 글 v9는 유지한다. 새 팩 배정 정책은 위 별도 정책 필드로 확인한다.
- 운영 profileAiMockMode=false. 기존 10초 AI 간격 및 캠페인 설정 유지.

재시작 직후 저장소 로딩 중 연결 거부가 발생할 수 있다. 현재 PID와 [profile-startup] readyAt·시각·포트를 확인하고 준비 완료 후 헬스를 다시 확인한다. 연결 거부만으로 반복 재시작하지 않는다. 정상 확인 후 접수를 재개한다.

## 후속 보강: 다수 상담사의 물리적 구도 순환

앞선 미커밋 변경 위에 사용자 승인으로 추가했다. 새로운 프롬프트나 배포가 아니라 배정 순서의 보강이다.

- 촬영군·카드 배열·카메라 높이·거리를 물리적 구도 키로 사용한다. 표지, 천 색, 테이블 재질, 장소 변주 ID는 키에서 제외한다.
- 전체 저장 이력에서 구도별 사용 횟수와 마지막 사용 순서를 복원한다. 오래된 이력에 구도 필드가 없으면 보존된 장면 ID에서 읽는다.
- 누적 촬영군 가중치로 두 촬영군을 고르고, 각 촬영군 안에서 아직 쓰지 않았거나 가장 오래전에 쓴 구도를 먼저 선택한다. 같은 마지막 사용 순위에서는 누적 사용 횟수를 비교한다. 그 다음 표지·소품·천 후보를 비교한다.
- 팩 구도 18개는 18장을 배정하면 모두 사용된다. 이후에는 가장 오래된 구도가 다시 사용된다. 기존 네 촬영군도 각각 카드 배열 3개를 순환한다. 같은 구조의 색상 변형을 새 구도로 세지 않는다.
- 현재 구도가 모두 사용되면 재사용은 필수다. 무한한 독립 장면이나 실제 픽셀 유사도 0을 보장하지 않는다. 순환 범위는 저장소가 유지하는 이력이며 다른 서버의 독립 저장소와 전역 동기화하는 기능은 추가하지 않았다.
- 상자 구조 6종은 연결된 구도 수가 달라 동일 빈도가 아니다. 구도 18종을 균등하게 사용하면서 구조도 함께 순환한다.

후속 검증:

```powershell
node --test profile-maker-api/profile-tarot-diversity.test.mjs
```

- 2,000명·4,000장 통과. 1,000명은 동일한 카드 계열·유사 입력, 나머지는 선택 유형을 바꿔 검사했다.
- 팩 600장: 구도 18개 각각 33~34장. 직전 17개 팩 구도 안에서 조기 반복 0건. 19번째 이후 가장 오래된 구도 재사용은 정상 동작이다.
- 사선 1,000장: 구도별 333~334장. 근접 1,000장: 333~334장. 하향 800장: 266~267장. 덱 디테일 600장: 200장씩.
- 전체 촬영군에서 구도 순환 전에 같은 구조가 재등장한 경우 0건.
- 이 표본에서 팩 디자인 39종 사용, 구조 6종 사용, 천 색 10종 사용. 모든 42종 표지가 이 표본에 사용됐다는 뜻은 아니다. 42종의 756개 지침 조합 검사는 별도 전체 검사로 통과했다.
- 1,000명 시점에 이력을 파일로 저장하고 다시 읽어 새 실행 컨텍스트를 구성해도 다음 배정 결과가 중단 없는 실행과 일치했다.
- 후속 변경 후 `npm test` 112/112, `npm run check`, `npm run test:diversity` 저장·재개 검사 통과. 대규모 검사는 위 별도 명령으로 실행하며 기본 npm test에 포함하지 않았다.
- 외부 유료 AI 호출 0회. 실제 생성 사진의 시각적 차이는 아직 확인하지 않았다.
