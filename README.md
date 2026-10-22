# Velog Dashboard Project

- Velog dashboard V2 백엔드, API 서버
- **_`node 20+`_**

## Project Setup Guide

### 프로젝트 시작

1. 패키지 관련

```bash
pnpm install
NODE_ENV=development pnpm install  # devDependencies 설치 위해

# 만약 pnpm 이 없다면
brew install pnpm
```

2. 환경 변수 설정

```bash
cp .env.sample .env
# 본인 환경에 맞게 수정
```

- `SESSION_JWT_SECRET` 은 로그인 세션 쿠키(`vd_session`) 서명 키입니다. `openssl rand -base64 48` 로 만든 값을 넣어 주세요. 테스트(`pnpm test`)는 `jest.setup.ts` 의 테스트용 값을 씁니다.
- 로그인한 브라우저는 `vd_session` 쿠키 하나로 인증합니다. 익스텐션은 velog 토큰을 요청 헤더로 보내고 이 토큰은 velog 에 확인하므로, 이 경로는 로컬에서도 velog 를 실제로 호출합니다(Redis 가 있으면 10분 캐시).

3. 서버 실행

```bash
pnpm dev
```

4. 통합 테스트(`src/**/__test__/integration/`)는 `pnpm test` 에서 제외되어 있습니다.

- 해당 테스트는 mocking 없이 DBMS connection 을 맺고 repo 계층의 실제 수행을 테스트 합니다.
- 그래서 DBMS 없이도 `pnpm test` 가 돌도록 분리해 두었고, 통합 테스트는 `pnpm test:integration` 으로 따로 실행합니다.
- CI 는 job 안에 빈 Postgres 를 띄우고 back-office 마이그레이션으로 스키마를 만든 뒤 통합 테스트를 돌립니다. 운영 DB 에는 붙지 않습니다.
- 테스트는 필요한 데이터를 직접 넣고(`fixtures.ts`) 트랜잭션을 되돌리므로 데이터를 남기지 않습니다.
- 로컬에서는 `.env` 의 DB 를 바라봅니다. `.env` 가 운영 DB 를 가리키면 운영에 붙으니 **_어떤 DB 에 붙는지 반드시 확인하고_** 돌려주세요.

## 실행 가능한 명령어

```bash
pnpm dev  # 개발 서버 실행
pnpm test  # 테스트 실행 (통합 테스트 제외, DBMS 불필요)
pnpm test:integration  # 통합 테스트만 실행 (DBMS 연결 필요)
pnpm test:coverage  # 커버리지 측정 (통합 테스트 제외 기준)
pnpm lint  # 린트 검사 (eslint + prettier)
pnpm lint-staged  # 린트 자동 수정

pnpm build # 프로젝트 빌드
pnpm start # 빌드된 프로젝트 시작
```

## Project Structure

```bash
├── src/
│   ├── __test__/       # 테스트 파일
│   ├── configs/        # 설정 파일 (DB 등)
│   ├── constants/      # 상수 데이터 파일
│   ├── controllers/    # API 컨트롤러
│   ├── exception/      # 커스텀 에러 파일
│   ├── middlewares/    # 각종 미들웨어 (인증, 에러, 데이터 검증 등)
│   ├── modules/        # 모듈 파일 (슬랙 등)
│   ├── repositories/   # 데이터 액세스 레이어
│   ├── routers/        # API 라우트 정의
│   ├── services/       # 비즈니스 로직
│   ├── types/         # Enum, DTO 등 데이터 타입 정의
│   │   ├── models/        # 데이터 모델
│   └── utils/          # 편의성 함수 정의
```
