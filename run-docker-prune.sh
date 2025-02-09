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

# 사용자 확인
confirm_action() {
    echo -e "${RED}Warning: This will remove all unused Docker images and system resources.${NC}"
    echo -e "${YELLOW}Are you sure you want to continue? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 0
    fi
}

# Docker 정리 작업 수행
perform_cleanup() {
    print_step "1. Removing all unused Docker images..."
    docker image prune -af
    
    print_step "2. Performing system cleanup..."
    docker system prune -af --volumes
    
    print_step "Cleanup completed successfully!"
    
    # 정리 후 상태 표시
    echo -e "\n${GREEN}Current Docker status:${NC}"
    docker system df
}

# 메인 실행 로직
main() {
    set -e  # 스크립트 실행 중 오류 발생 시 종료
    
    check_docker
    confirm_action
    perform_cleanup
}

# 스크립트 실행
main
