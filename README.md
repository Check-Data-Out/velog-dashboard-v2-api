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

3. 서버 실행

```bash
pnpm dev
```

4. 로컬 테스팅을 위해서 `post.repo.integration.test` 를 필수 참조해주세요.

- 해당 테스트는 mocking 없이 DBMS connection 을 맺고 repo 계층의 실제 수행을 테스트 합니다.
- 이에 따라, local DBMS 와 connection 을 맺는다면 **_테스트로 제공해야 할 TEST CASE 의 값들이 달라져야 합니다._**
- 이 때문에 전체 테스트에 이슈가 있을 수 있으니 해당 값 꼭 체크 해주세요.

## 실행 가능한 명령어

```bash
pnpm dev  # 개발 서버 실행
pnpm test  # 테스트 실행
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
