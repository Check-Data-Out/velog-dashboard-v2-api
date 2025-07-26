# ========================================== #
# Build stage
# ========================================== #
FROM node:23-alpine AS builder

WORKDIR /usr/src/app

# pnpm 설치
RUN npm install -g pnpm

# 빌드에 필요한 파일만 복사
COPY package.json pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사 및 빌드
COPY . .
RUN pnpm run build

# ========================================== #
# Production stage
# ========================================== #
FROM node:23-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm pm2

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# 빌드 결과물과 PM2 설정 파일 복사
COPY --from=builder /usr/src/app/dist ./dist
COPY ecosystem.config.js .

EXPOSE 8080

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
