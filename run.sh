#!/bin/bash
# 스크립트 권한: chmod +x run.sh

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

# 에러 핸들링 함수
handle_error() {
    echo -e "${RED}Error occurred in script at line $1${NC}" >&2
    exit 1
}

# 에러 발생시 handle_error 함수 호출
trap 'handle_error $LINENO' ERR

# 진행상황 출력 함수
print_step() {
    echo -e "\n${GREEN}===================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${GREEN}===================================${NC}"
}

# Docker 설치 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker가 설치되어 있지 않습니다.${NC}"
        exit 1
    fi
}

# 서비스 중지
stop_services() {
    print_step "0. 현재 사용 중 이미지 stop, down"
    docker compose stop || true
    docker compose down || true
}

# 이미지 업데이트
update_images() {
    print_step "1. 외부 이미지 업데이트 (fe, nginx)..."
    docker compose pull fe nginx
}

# API 빌드
build_api() {
    print_step "2. 로컬 이미지 빌드 (api)..."
    docker compose build api
}

# 서비스 시작
start_services() {
    print_step "3. 서비스 재시작..."
    docker compose up -d
}

# 메인 실행 로직
main() {
    set -e  # 스크립트 실행 중 오류 발생 시 종료
    
    check_docker
    stop_services
    update_images
    build_api
    start_services

    print_step "모든 작업이 완료되었습니다! 로그 모니터링을 시작합니다."
    sleep 1
    docker compose logs -f
}

# 스크립트 실행
main