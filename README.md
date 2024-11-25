# Velog Dashboard Project

- 백엔드 API 서버

## Project Setup Guide

### 프로젝트 시작

1. 패키지 관련

```bash
pnpm install

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
```

## Project Structure

```bash
├── src/
├── __test__/       # 테스트 파일
├── configs/        # 설정 파일 (DB 등)
├── controllers/    # API 컨트롤러
├── models/         # 데이터 모델
├── repositories/   # 데이터 액세스 레이어
├── routers/        # API 라우트 정의
└── services/       # 비즈니스 로직
```
