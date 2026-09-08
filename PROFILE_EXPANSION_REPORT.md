# 글·이미지 생성군 확장 (v9 / v13)

작업 기준 커밋: `98463b3`, 브랜치 `main`. 기존 600은 카테고리별 프로필 배정 검증 수량이며 운영 생성 상한이 아니었다. 이번 변경은 사용자가 승인한 생성군 확장이다. 실제 AI 생성, 커밋, 푸시, 운영 배포는 수행하지 않았다.

## 생성군

| 항목 | 타로 | 사주 | 신점 |
|---|---:|---:|---:|
| 기본 장면 | 30 → 120 | 30 → 120 | 48 → 120 |
| 장소 변형 포함 장면 | 300 → 1,200 | 300 → 1,200 | 480 → 1,200 |
| 글 구성군 | 11,796,480 | 11,796,480 | 11,796,480 |
| 스타일 포함 글 조합 | 377,487,360 | 377,487,360 | 377,487,360 |
| 계산식상 이미지 조합 | 8,257,536,000,000 | 7,077,888,000,000 | 127,401,984,000,000 |

글 전개 구조 24종, 도입·마무리 각 16종, 스타일 32종. 기존 숫자 ID의 의미를 바꾸지 않고 옵션을 뒤에 추가했다. 새 도입 방식마다 제목·문단 역할 지시를, 새 스타일마다 실제 작성 지시를 추가했다. 원문 근거와 카테고리 적합성이 우선이다.

이미지 기본 장면은 기존 108개를 보존하고 252개를 추가했다. 타로·사주는 9개 물리적 공간 × 10개 배치, 신점은 8개 공간 × 9개 배치로 확장했다. 단순 색상 변경이 아니라 카드 배열, 받침 구조, 수납 공간, 방의 깊이, 촬영 거리 등의 조합이다. 기존 장소 변형 10종은 유지한다.

위 곱셈 수치는 이론상 구성 조합이다. 소재·장면 호환성, 고정 덱, 일부 구도에서 사용하지 않는 초점·깊이 지시 등이 있어 실제 도달 가능한 유효 조합의 정확한 개수는 아니다. 서로 다른 사진이나 글을 그 수만큼 보장하지 않는다. 원문이 비슷하면 실제 결과도 비슷할 수 있다. 생성군 자체에 600/1,200/24,000이라는 제작 상한을 새로 두지 않았다.

## 배정과 성능

- 장면군마다 사용량이 낮은 장면 12개를 후보 목록에 넣는다. 적합한 여러 장면군을 남겨 두어 두 이미지의 분리 조건을 지킨다.
- 이미지 후보 32개를 우선 비교한다. 고유 조합 또는 서로 다른 촬영 방식의 후보가 부족하면 최대 128개까지 비교한다. 기존 조합 재사용 여부, 두 이미지 구도 차이, 큰 구도 반복, 세부 반복 순으로 평가한다.
- 선택한 장면 ID를 작업 입력에 보관한다. 이후 이미지 지시문을 만들 때 동일한 장면을 다시 사용한다.
- 글은 통상 최대 128개 후보 중 적합한 것을 선택한다. 선택 가능한 후보가 없으면 기존 최대 2,048개까지 탐색한다. 이미 사용한 글 구성군, 최근 제목 전개·스타일 반복 회피를 유지한다.
- 글·이미지 누적 집계를 배열에 추가된 배정만 반영하는 방식으로 재사용한다. 이력 복원 또는 배정 교체 때 집계를 재구축한다.
- 이력 조회의 정렬 결과를 캐시하고, 비교 정보가 이미 보완된 작업은 이미지가 포함된 원본 JSON을 다시 읽기 전에 건너뛴다. 문단 서명 해시는 최대 32,768개를 메모리에 재사용한다. 이력 가져오기 시작·진행·완료 로그를 추가했다.
- 다른 시작 단계의 작업 파일 읽기와 전체 이력 파일 저장은 여전히 존재한다. 이번 변경으로 운영 기동 시간이 얼마나 줄었는지는 미측정이다. 배정 검사 성능을 실제 이미지 포함 작업 저장·전체 결과 유사도 검사 성능으로 해석하면 안 된다.

## 보존한 동작

- 기존 v7/v11 및 v8/v12 동일 입력 결과 재사용. 참고 텍스트가 달라지면 이전 결과로 잘못 재사용하지 않는다.
- 기존 결과·고정 타로 덱·소재 호환성·두 이미지 분리·CSS·화면·라우팅 보존.
- 유료 재생성 자동 실행 없음. 일일 생성/이미지/AI 호출 한도, 캠페인 24,000건 한도, 요청 간격 10초 유지.
- 패키지 의존성은 추가하지 않았다. `package.json` 검사 명령만 변경했으므로 `package-lock.json`은 수정하지 않았다.

## 검증

- 구문 검사 통과.
- 일반 테스트 90/90 통과: 기존 과금·요청 간격·CSS 보호 검사 포함.
- 중단·재개 검사 통과(약 6.8초). 이어서 배정한 전체 기록이 중단 없이 배정한 기록과 동일한지 비교했다.
- 타로 24,000개 배정을 실제 `FileProfileGenerationHistory` 파일 형식으로 저장하고 다시 읽은 뒤 글·이미지 배정 이력 및 다음 배정이 동일함을 확인했다(복원·비교 약 1.8초). 실제 프로필/이미지 원본이 없는 배정 자료의 측정이다.
- `git diff --check` 통과, 신규 파일도 공백 오류 없음. 전체 변경 내용 검토 완료.

| 시나리오 | 프로필 배정 | 이미지 배정 | 시간 | 체크포인트에서 관측한 최대 RSS |
|---|---:|---:|---:|---:|
| 세 카테고리 균등 | 24,000 (각 8,000) | 48,000 | 176.2초 | 347.4 MiB |
| 타로 집중 | 24,000 | 48,000 | 111.7초 | 355.5 MiB |
| 사주 집중 | 24,000 | 48,000 | 131.0초 | 355.6 MiB |
| 신점 집중 | 24,000 | 48,000 | 266.4초 | 353.9 MiB |

위 완료 시나리오는 각각 글 구성군 및 이미지 배정군 중복 0건, 프로필 내 동일 촬영 방식 배정 0건이다. 해당 카테고리의 장면 1,200개를 모두 사용했다. 시나리오는 독립된 이력에서 시작하므로 합산 처리량을 전체 고유 결과물 수로 해석하지 않는다. 여러 검사를 동시에 실행한 로컬 Windows 측정이며 운영 서버 성능 보장이 아니다.

총 4개 시나리오가 모두 종료 코드 0으로 완료됐다. 합산 검사 처리량은 프로필 배정 96,000건·이미지 배정 192,000개이며 실제 글·이미지 생성 건수가 아니다. 24,000건은 이번 검증 규모이자 기존 캠페인 운영 한도다. 생성군의 절대 최대치를 검증했다는 의미는 아니다.

최종 Git 상태: 기준 커밋 `98463b3`의 `main`에서 이번 작업은 수정 14개·신규 6개 파일, 총 20개 파일이다. 별도의 기존 미추적 항목 2개는 그대로 보존했다. 커밋·푸시·운영 반영은 미수행이다.

대규모 검사 코드 묶음 SHA-256: `524575c1689c9c2ab1c33b17faa25e82c89d7335b890faa416a4973a23373541`. 요약 결과는 임시 디렉터리의 `hongcafe-expanded-*.json.report.json`에 저장했다. AI 호출은 모두 0회다.

`npm run test:diversity`는 짧은 저장·재개 회귀 검사다. 대규모 검사는 별도 명령으로 분리했다. 과거 v12의 1,800건 대조군 결과는 `PROFILE_DIVERSITY_REPORT.md`에 역사적 기록으로 남겨 두었으며 이번 v13 결과로 재인용하지 않는다.

```powershell
# 필요할 때만 실행. 이미 통과한 동일 코드의 대규모 검사는 반복할 필요가 없다.
npm run test:diversity:scale -- --profiles 24000 --scenario balanced --checkpoint "$env:TEMP\hongcafe-expanded-balanced.json"
npm run test:diversity:scale -- --profiles 24000 --scenario tarot-ppt --checkpoint "$env:TEMP\hongcafe-expanded-tarot-ppt.json"
npm run test:diversity:scale -- --profiles 24000 --scenario saju-ppt --checkpoint "$env:TEMP\hongcafe-expanded-saju-ppt.json"
npm run test:diversity:scale -- --profiles 24000 --scenario sinjeom-ppt --checkpoint "$env:TEMP\hongcafe-expanded-sinjeom-ppt.json"
```

검사는 외부 AI 호출 없이 실제 배정 함수를 사용한다. 1,000건마다 진행과 체크포인트를 저장한다. Node가 Ctrl+C의 SIGINT를 받으면 중간 지점에서 저장 후 종료 코드 2로 끝나며 통과를 뜻하지 않는다. 터미널 강제 종료 때는 마지막 체크포인트부터 재개한다. 같은 명령은 이어서 실행된다. 코드나 설정이 바뀌면 기존 체크포인트를 거부하므로 새 경로를 지정한다. `--stop-after N`으로 이번 실행에서 처리할 배정 수를 정할 수 있다. 완료 시 `.report.json`에 요약을 남긴다.

## 수정 파일

- `profile-maker-api/profile-scene-catalog.mjs`: 추가 장면 목록.
- `profile-maker-api/profile-copy-options.mjs`: 추가 글 구성·작성 규칙.
- `profile-maker-api/profile-assignment-index.mjs`: 누적 집계 캐시.
- `profile-maker-api/server.mjs`: 장면 연결, 배정 후보 선택, 선택 장면 보존, 버전과 이전 결과 재사용.
- `profile-maker-api/profile-copy-engine.mjs`, `profile-visual-engine.mjs`: 생성군 연결과 새 버전.
- `profile-maker-api/profile-generation-history.mjs`: 이력 집계·읽기·서명 계산 개선.
- `profile-maker-api/profile-diversity-benchmark.mjs`, `profile-diversity-runtime.mjs`, `profile-diversity-scale.test.mjs`: 설정 가능한 대규모 검사와 중단·재개.
- `profile-maker-api/profile-expansion.test.mjs`: 호환성·캐시·복원·반복 읽기 방지 검사.
- 기존 테스트 6개: `profile-campaign-api.test.mjs`, `profile-copy-engine.test.mjs`, `profile-copy.test.mjs`, `profile-sinjeom-visual.test.mjs`, `profile-version-replay.test.mjs`, `profile-visual-engine.test.mjs`.
- `package.json`, `PROFILE_DIVERSITY_REPORT.md`, 이 보고서.

## 로컬 확인 → 커밋 → 푸시 (실행 안내)

기존 미추적 항목 `t`와 `ers...`는 보존하고 커밋 목록에서 제외한다. 아래 명령은 직접 실행하지 않았다. 오류가 나면 다음 단계로 넘어가지 않는다.

```powershell
npm run check
npm test
npm run test:diversity
git diff --check
git --no-pager diff --stat
git --no-pager diff
git status --short --branch
git add package.json PROFILE_DIVERSITY_REPORT.md PROFILE_EXPANSION_REPORT.md profile-maker-api/server.mjs profile-maker-api/profile-copy-engine.mjs profile-maker-api/profile-copy-options.mjs profile-maker-api/profile-visual-engine.mjs profile-maker-api/profile-scene-catalog.mjs profile-maker-api/profile-assignment-index.mjs profile-maker-api/profile-generation-history.mjs profile-maker-api/profile-diversity-runtime.mjs profile-maker-api/profile-diversity-benchmark.mjs profile-maker-api/profile-diversity-scale.test.mjs profile-maker-api/profile-expansion.test.mjs profile-maker-api/profile-campaign-api.test.mjs profile-maker-api/profile-copy-engine.test.mjs profile-maker-api/profile-copy.test.mjs profile-maker-api/profile-sinjeom-visual.test.mjs profile-maker-api/profile-version-replay.test.mjs profile-maker-api/profile-visual-engine.test.mjs
git --no-pager diff --cached --check
git --no-pager diff --cached --stat
git --no-pager diff --cached
git commit -m "기능: 프로필 생성군 확장과 대규모 배정 최적화"
git push origin main
git log -1 --oneline
git status --short --branch
```

## 운영 반영 → 재시작 → 확인 (실행 안내)

서버에서 수정 파일이 없고 대기·진행 작업이 없는지 확인한 뒤 반영한다. 생성 요청은 반영 중 잠시 멈춘다. 로컬에서 푸시한 커밋 번호와 서버의 최종 커밋을 비교한다.

```bash
cd /opt/hongcafe-ops-profile-integrated
node --version
git status --short --branch
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health

git pull --ff-only origin main && npm ci --omit=dev && npm run check && pm2 restart hongcafe-profile-api

date '+%Y-%m-%d %H:%M:%S %Z'
curl --max-time 10 -sS -w '\nHTTP_STATUS=%{http_code}\n' http://127.0.0.1:3100/api/health
ss -ltnp 'sport = :3100'
pm2 status hongcafe-profile-api
pm2 logs hongcafe-profile-api --lines 50 --nostream
git log -1 --oneline
git status --short --branch
```

정상 기준: HTTP 200, `ok=true`, `profileTextPromptVersion=profile-copy-v9-expanded-editorial`, `visualVariationVersion=profile-visual-v13-expanded-scenes`, 기본 장면 각 120, 확장 장면 각 1,200, 글 구성군 각 11,796,480, 스타일 32, 요청 간격 10,000ms. PM2 online, 포트 대기, 적용 커밋 일치, 서버 수정 파일 없음도 확인한다. 시작 직후 연결이 거부되면 반복 재시작하지 말고 포트와 시작 로그를 확인한다. `hongcafe-ops-profile` 서비스는 조작하지 않는다.

배포 후 브라우저 Ctrl+F5. 기존 동일 입력은 이전 결과를 재사용하므로 배포만으로 결과가 교체되지 않는다. 실제 결과의 체감 다양성 평가는 별도로 남아 있으며 유료 표본 생성은 별도 승인 후 진행한다.
