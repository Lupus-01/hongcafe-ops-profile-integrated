# HongCafe Ops Work Log

운영팀 직무표, 투두 리스트, 숙지사항, 업무 매뉴얼, 스프레드시트, 업무 보고 흐름을 관리하는 업무일지 MVP입니다.

## 실행 방법

Node.js 18 이상이 설치되어 있으면 별도 패키지 설치 없이 실행할 수 있습니다.

```bash
npm start
```

브라우저에서 접속합니다.

```text
http://localhost:3000
```

## 서버 기능

- 정적 프론트엔드 파일 서빙
- `GET /api/health` 서버 상태 확인
- `POST /api/auth/login` 기존 홍카페 관리 프로그램 로그인 검증
- `GET /api/auth/me` 현재 로그인 사용자 확인
- `POST /api/auth/logout` 로그아웃
- `GET /api/state` 전체 업무 데이터 조회
- `PUT /api/state` 전체 업무 데이터 저장
- `POST /api/uploads` base64 파일 저장용 API
- `/uploads/{fileName}` 업로드 파일 다운로드

## 로그인 설정

기존 홍카페 관리 프로그램 계정으로 로그인 검증을 하고, 업무일지 자체 세션을 발급합니다. 아이디와 비밀번호는 저장하지 않습니다.

1. `.env.example`을 참고해 서버에 `.env`를 만듭니다.
2. `server/users.example.json`을 참고해 서버에 `server/data/users.json`을 만듭니다.
3. `adminId`에는 기존 관리 프로그램 아이디를 넣습니다.
4. `role`은 `teamLead`, `partLead`, `member` 중 하나를 사용합니다.

`server/data/state.json`, `server/data/users.json`, `.env`, 업로드 파일은 Git에 올리지 않습니다.

## Ubuntu 배포

서비스 포트를 3100으로 사용할 경우 서버의 `.env`에 아래처럼 설정합니다.

```env
PORT=3100
HOST=0.0.0.0
COOKIE_SECURE=false
```

서버에서 실행합니다.

```bash
npm start
```

운영에서는 `pm2` 또는 `systemd`로 백그라운드 실행하는 것을 권장합니다.

```bash
pm2 start server/server.js --name hongcafe-ops-worklog
pm2 save
```

## 현재 포함 기능

- 팀장/파트장/파트원 권한 기반 화면 제어
- 직무표 등록 및 수행 상태 체크
- 업무 배정, 상태 변경, 완료 보고
- 숙지사항 등록 및 숙지 완료 체크
- 업무 매뉴얼 텍스트와 첨부 파일명 관리
- 섭외 관리/프로젝트 진행/빈 시트 템플릿 기반 새 시트 생성
- 서버 저장과 JSON 내보내기/가져오기

## 다음 개발 후보

- 사용자/파트 관리 API 분리
- SQLite 또는 PostgreSQL DB 전환
- 실제 첨부 파일 업로드 UI 연결
- 엑셀 가져오기/내보내기
- 보고 승인/반려 사유 입력
- HTTPS/Nginx 배포 구성
