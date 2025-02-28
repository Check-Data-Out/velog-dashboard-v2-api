# Velog Dashboard Project

- 백엔드 API 서버

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

## 실행 가능한 명령어

```bash
pnpm dev  # 개발 서버 실행
pnpm test  # 테스트 실행
pnpm lint  # 린트 검사
pnpm lint:fix  # 린트 자동 수정

pnpm build # 프로젝트 빌드
pnpm start # 빌드된 프로젝트 시작
```

## Project Structure

```bash
├── src/
├── __test__/       # 테스트 파일
├── configs/        # 설정 파일 (DB 등)
├── constants/      # 상수 데이터 파일
├── controllers/    # API 컨트롤러
├── exception/      # 커스텀 에러 파일
├── middlewares/    # 각종 미들웨어 (인증, 에러, 데이터 검증 등)
├── modules/        # 모듈 파일 (슬랙 등)
├── repositories/   # 데이터 액세스 레이어
├── routers/        # API 라우트 정의
├── services/       # 비즈니스 로직
├┬── types/         # Enum, DTO 등 데이터 타입 정의
│└── models/        # 데이터 모델
└── utils/          # 편의성 함수 정의
```
